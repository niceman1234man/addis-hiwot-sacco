import mongoose from "mongoose";
import Account from "../models/Account.js";
import SystemAccountMapping from "../models/SystemAccountMapping.js";
import JournalEntry from "../models/JournalEntry.js";
import AuditLog from "../models/AuditLog.js";
import Expense from "../models/Expense.js";
import CashSession from "../models/CashSession.js";
import { runFinancialTransaction } from "../services/financialTransactions.js";
import { createLedgerTransaction } from "../services/financialTransactions.js";
import { configuredAccount, postJournal } from "../services/ledgerPosting.js";
import { validateBalancedJournalLines } from "../services/accountingService.js";
import { generateReference } from "../utils/generateReference.js";

function operationalError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

const accountMappingEnvironmentKeys = [
	"SACCO_CASH_ACCOUNT_ID",
	"SACCO_BANK_ACCOUNT_ID",
	"SACCO_MOBILE_MONEY_ACCOUNT_ID",
	"SACCO_SAVINGS_LIABILITY_ACCOUNT_ID",
	"SACCO_LOAN_RECEIVABLE_ACCOUNT_ID",
	"SACCO_INTEREST_INCOME_ACCOUNT_ID",
	"SACCO_FEES_INCOME_ACCOUNT_ID",
	"SACCO_EXPENSE_ACCOUNT_ID",
];
const accountMappingEnvironmentByKey = {
	cash: "SACCO_CASH_ACCOUNT_ID",
	bank: "SACCO_BANK_ACCOUNT_ID",
	mobile_money: "SACCO_MOBILE_MONEY_ACCOUNT_ID",
	savings: "SACCO_SAVINGS_LIABILITY_ACCOUNT_ID",
	loan_receivable: "SACCO_LOAN_RECEIVABLE_ACCOUNT_ID",
	interest_income: "SACCO_INTEREST_INCOME_ACCOUNT_ID",
	fees_income: "SACCO_FEES_INCOME_ACCOUNT_ID",
	expense: "SACCO_EXPENSE_ACCOUNT_ID",
};
const mappingDefinitions = [
	{ key: "cash", label: "Cash receipts and payments", category: "asset", normalBalance: "debit" },
	{ key: "bank", label: "Bank receipts and payments", category: "asset", normalBalance: "debit" },
	{ key: "mobile_money", label: "Mobile money receipts and payments", category: "asset", normalBalance: "debit" },
	{ key: "savings", label: "Members' savings liability", category: "liability", normalBalance: "credit" },
	{ key: "share_capital", label: "Members' share capital", category: "equity", normalBalance: "credit" },
	{ key: "loan_receivable", label: "Loan principal receivable", category: "asset", normalBalance: "debit" },
	{ key: "interest_income", label: "Loan interest income", category: "income", normalBalance: "credit" },
	{ key: "fees_income", label: "Loan and service fees income", category: "income", normalBalance: "credit" },
	{ key: "loan_impairment", label: "Loan impairment expense or allowance", category: "expense", normalBalance: "debit" },
	{ key: "expense", label: "Default operating expense", category: "expense", normalBalance: "debit" },
];

export async function listSystemAccountMappings(_request, response) {
	try {
		const [mappings, accounts] = await Promise.all([
			SystemAccountMapping.find().populate("account", "code name category currency isActive parent allowManualPosting").lean(),
			Account.find({ isActive: true }).sort({ code: 1 }).populate("parent", "code name").lean(),
		]);
		const childParentIds = new Set(accounts.map((account) => String(account.parent?._id || account.parent)).filter((id) => id !== "null" && id !== "undefined"));
		const systemKeyByAccountId = new Map();
		for (const definition of mappingDefinitions) {
			const legacySystemAccount = await Account.findOne({ systemKey: definition.key }).select("_id").lean();
			if (legacySystemAccount) systemKeyByAccountId.set(String(legacySystemAccount._id), definition.key);
			const setting = accountMappingEnvironmentByKey[definition.key];
			const accountId = setting && process.env[setting];
			if (accountId && mongoose.isValidObjectId(accountId)) systemKeyByAccountId.set(accountId, definition.key);
		}
		const accountOptions = accounts.map((account) => ({ ...account, accountType: account.accountType || (account.allowManualPosting === false || childParentIds.has(String(account._id)) ? "group" : "posting"), reservedSystemKey: systemKeyByAccountId.get(String(account._id)) || null }));
		const byKey = new Map(mappings.map((mapping) => [mapping.key, mapping]));
		const resolvedMappings = await Promise.all(mappingDefinitions.map(async (definition) => {
			const savedMapping = byKey.get(definition.key);
			if (savedMapping) return { ...definition, account: savedMapping.account || null, source: "database", updatedAt: savedMapping.updatedAt };
			const legacySystemAccount = await Account.findOne({ systemKey: definition.key }).populate("parent", "code name").lean();
			if (legacySystemAccount) return { ...definition, account: legacySystemAccount, source: "account system key", updatedAt: legacySystemAccount.updatedAt };
			const envSetting = accountMappingEnvironmentByKey[definition.key];
			const envId = envSetting && process.env[envSetting];
			const environmentAccount = envId && mongoose.isValidObjectId(envId)
				? await Account.findById(envId).populate("parent", "code name").lean()
				: null;
			return { ...definition, account: environmentAccount, source: environmentAccount ? "environment configuration" : null, updatedAt: environmentAccount?.updatedAt || null };
		}));
		return response.json({ mappings: resolvedMappings, accounts: accountOptions });
	} catch (error) {
		console.error("Unable to load system account mappings:", error.message);
		return response.status(500).json({ message: "System account mappings could not be loaded." });
	}
}

export async function updateSystemAccountMapping(request, response) {
	const { key } = request.params;
	const definition = mappingDefinitions.find((item) => item.key === key);
	const accountId = request.body?.accountId;
	if (!definition) return response.status(404).json({ message: "System account mapping key was not found." });
	if (typeof accountId !== "string" || !mongoose.isValidObjectId(accountId)) return response.status(400).json({ message: "Choose a valid chart-of-accounts entry." });
	try {
		const mapping = await runFinancialTransaction(async (session) => {
			const account = await Account.findOne({ _id: accountId, category: definition.category, normalBalance: definition.normalBalance, currency: "ETB", isActive: true }).session(session);
			if (!account) throw operationalError(400, `Select an active ETB ${definition.category} account with a ${definition.normalBalance} normal balance for this mapping.`);
			if (account.accountType === "group") throw operationalError(400, "System mappings must use a Posting / Ledger account, not a Parent / Group account.");
			if (await Account.exists({ parent: account._id }).session(session)) throw operationalError(400, "System mappings must use a leaf account, not a parent/group account.");
			if (account.systemKey && account.systemKey !== key) throw operationalError(409, "This account is already reserved for a different system posting key.");
			const conflictingEnvironmentKey = Object.entries(accountMappingEnvironmentByKey).find(([mappingKey, setting]) => mappingKey !== key && process.env[setting] === String(account._id));
			if (conflictingEnvironmentKey) throw operationalError(409, "This account is reserved by an environment mapping for a different system posting key.");
			const duplicate = await SystemAccountMapping.findOne({ account: account._id, key: { $ne: key } }).session(session);
			if (duplicate) throw operationalError(409, "This account is already assigned to another system mapping.");
			const result = await SystemAccountMapping.findOneAndUpdate(
				{ key },
				{ $set: { account: account._id, updatedBy: request.adminUser._id } },
				{ upsert: true, new: true, runValidators: true, session },
			);
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "accounting.system_mapping.updated",
				resourceType: "SystemAccountMapping",
				resourceId: result._id,
				outcome: "success",
				details: { key, account: account._id, code: account.code },
			}], { session });
			return result;
		});
		return response.json({ message: "System account mapping saved.", mapping });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "System account mapping could not be saved." });
	}
}

export async function removeSystemAccountMapping(request, response) {
	const { key } = request.params;
	const definition = mappingDefinitions.find((item) => item.key === key);
	if (!definition) return response.status(404).json({ message: "System account mapping key was not found." });
	try {
		const result = await runFinancialTransaction(async (session) => {
			const mapping = await SystemAccountMapping.findOne({ key }).session(session);
			if (mapping) {
				await AuditLog.create([{
					actor: request.adminUser._id,
					actorRole: request.adminUser.role,
					action: "accounting.system_mapping.removed",
					resourceType: "SystemAccountMapping",
					resourceId: mapping._id,
					outcome: "success",
					details: { key, account: mapping.account },
				}], { session });
				await mapping.deleteOne({ session });
			}
			const environmentSetting = accountMappingEnvironmentByKey[key];
			const environmentAccountId = environmentSetting && process.env[environmentSetting];
			const legacySystemAccount = await Account.findOne({ systemKey: key }).session(session);
			const environmentAccount = environmentAccountId && mongoose.isValidObjectId(environmentAccountId)
				? await Account.findById(environmentAccountId).session(session)
				: null;
			if (legacySystemAccount || environmentAccount) {
				throw operationalError(409, "This mapping is supplied by legacy system/environment configuration. Remove that configuration and redeploy before unmapping it here.");
			}
			return { removed: Boolean(mapping) };
		});
		return response.json({ message: result.removed ? "System account mapping removed. Transactions requiring it will be blocked until it is configured again." : "No saved system account mapping exists.", removed: result.removed });
	} catch (error) {
		return response.status(error.status || 500).json({ message: error.message || "System account mapping could not be removed." });
	}
}

export async function listAccounts(request, response) {
	const filter = {};
	if (request.query.category) {
		if (!["asset", "liability", "equity", "income", "expense"].includes(request.query.category)) return response.status(400).json({ message: "Account category is invalid." });
		filter.category = request.query.category;
	}
	if (request.query.active !== undefined) filter.isActive = request.query.active !== "false";
	try {
		const [accountRecords, mappings] = await Promise.all([
			Account.find(filter).sort({ code: 1 }).populate("parent", "code name").lean(),
			SystemAccountMapping.find().select("account").lean(),
		]);
		const parentIds = new Set(accountRecords.map((account) => String(account.parent?._id || account.parent)).filter((id) => id !== "null" && id !== "undefined"));
		const systemKeyByAccountId = new Map(mappings.map((mapping) => [String(mapping.account), mapping.key]));
		for (const [key, setting] of Object.entries(accountMappingEnvironmentByKey)) {
			const accountId = process.env[setting];
			if (accountId && mongoose.isValidObjectId(accountId) && !systemKeyByAccountId.has(accountId)) systemKeyByAccountId.set(accountId, key);
		}
		const accounts = accountRecords.map((account) => ({
			...account,
			accountType: account.accountType || (account.allowManualPosting === false || parentIds.has(String(account._id)) ? "group" : "posting"),
			allowManualPosting: parentIds.has(String(account._id)) ? false : account.allowManualPosting !== false,
			isSystemMapped: systemKeyByAccountId.has(String(account._id)),
			mappedSystemKey: systemKeyByAccountId.get(String(account._id)) || null,
		}));
		return response.json({ accounts });
	} catch (error) {
		console.error("Unable to list chart of accounts:", error.message);
		return response.status(500).json({ message: "Chart of accounts could not be loaded." });
	}
}

export async function createAccount(request, response) {
	const body = request.body ?? {};
	const categories = ["asset", "liability", "equity", "income", "expense"];
	const categoryByPrefix = { 1: "asset", 2: "liability", 3: "equity", 4: "income", 5: "expense" };
	if (typeof body.code !== "string" || !/^\d{4}$/.test(body.code.trim()) || !categoryByPrefix[body.code.trim()[0]]) return response.status(400).json({ message: "Account code must be exactly four digits and begin with 1–5 for its category." });
	if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120) return response.status(400).json({ message: "Account name is required (up to 120 characters)." });
	if (!categories.includes(body.category)) return response.status(400).json({ message: "Account category is invalid." });
	if (categoryByPrefix[body.code.trim()[0]] !== body.category) return response.status(400).json({ message: "The first account-code digit must match its category (1 asset, 2 liability, 3 equity, 4 income, 5 expense)." });
	const accountType = body.accountType || (body.allowManualPosting === false ? "group" : "posting");
	if (!["group", "posting"].includes(accountType)) return response.status(400).json({ message: "Account type must be Parent / Group or Posting / Ledger." });
	if (body.allowManualPosting !== undefined && typeof body.allowManualPosting !== "boolean") return response.status(400).json({ message: "Manual posting setting must be true or false." });
	if (accountType === "group" && body.allowManualPosting === true) return response.status(400).json({ message: "Parent / Group accounts cannot allow direct posting." });
	if (accountType === "group" && body.systemKey) return response.status(400).json({ message: "System posting keys can only be assigned to Posting / Ledger accounts." });
	const normalBalance = body.normalBalance || (["asset", "expense"].includes(body.category) ? "debit" : "credit");
	if (!["debit", "credit"].includes(normalBalance)) return response.status(400).json({ message: "Normal balance must be debit or credit." });
	const currency = typeof body.currency === "string" && /^[A-Z]{3}$/i.test(body.currency) ? body.currency.toUpperCase() : "ETB";
	const systemKeys = ["cash", "bank", "mobile_money", "savings", "loan_receivable", "interest_income", "fees_income", "expense"];
	if (body.systemKey && (!systemKeys.includes(body.systemKey) || request.adminUser.role !== "admin")) return response.status(403).json({ message: "Only administrators can assign a supported system posting key." });
	const systemCategory = { cash: "asset", bank: "asset", mobile_money: "asset", savings: "liability", loan_receivable: "asset", interest_income: "income", fees_income: "income", expense: "expense" };
	if (body.systemKey && systemCategory[body.systemKey] !== body.category) return response.status(400).json({ message: "The selected system posting key is incompatible with this account category." });
	if (body.parent && !mongoose.isValidObjectId(body.parent)) return response.status(400).json({ message: "Parent account ID is invalid." });
	try {
		const account = await runFinancialTransaction(async (session) => {
			let parentAccount = null;
			if (body.parent) {
				parentAccount = await Account.findOne({ _id: body.parent, isActive: true, currency, category: body.category }).session(session);
				if (!parentAccount) throw operationalError(400, "Parent account must exist, be active, and use the same currency.");
				if (parentAccount.accountType === "posting" && (parentAccount.isSystem || parentAccount.systemKey || await SystemAccountMapping.exists({ account: parentAccount._id }).session(session))) throw operationalError(409, "A system-mapped posting account cannot become a parent account.");
				const hasChildren = await Account.exists({ parent: parentAccount._id }).session(session);
				if (parentAccount.accountType !== "group" && !hasChildren && parentAccount.allowManualPosting !== false) throw operationalError(409, "The selected parent must be a Parent / Group account.");
				if (body.code.trim() <= parentAccount.code) throw operationalError(400, "Child account codes must sort after their parent account code.");
				const wasManualPostingAllowed = parentAccount.allowManualPosting;
				const wasAccountType = parentAccount.accountType;
				parentAccount.accountType = "group";
				parentAccount.allowManualPosting = false;
				parentAccount.updatedBy = request.adminUser._id;
				await parentAccount.save({ session });
				await AuditLog.create([{
					actor: request.adminUser._id,
					actorRole: request.adminUser.role,
					action: "accounting.account.updated",
					resourceType: "Account",
					resourceId: parentAccount._id,
					outcome: "success",
					changes: { from: { accountType: wasAccountType, allowManualPosting: wasManualPostingAllowed }, to: { accountType: "group", allowManualPosting: false } },
					details: { code: parentAccount.code, reason: "became_parent_account" },
				}], { session });
			}
			const [created] = await Account.create([{
				code: body.code.trim().toUpperCase(),
				name: body.name.trim(),
				description: typeof body.description === "string" ? body.description.trim().slice(0, 500) : "",
				subcategory: typeof body.subcategory === "string" ? body.subcategory.trim().slice(0, 80) : "",
				category: body.category,
				accountType,
				normalBalance,
				currency,
				parent: body.parent || null,
				allowManualPosting: accountType === "group" || body.systemKey ? false : body.allowManualPosting !== false,
				systemKey: body.systemKey || undefined,
				isSystem: Boolean(body.systemKey),
				isActive: true,
				createdBy: request.adminUser._id,
				updatedBy: request.adminUser._id,
			}], { session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "accounting.account.created",
				resourceType: "Account",
				resourceId: created._id,
				outcome: "success",
				details: { code: created.code, category: created.category, accountType: created.accountType, parent: created.parent || null, systemKey: created.systemKey || null },
			}], { session });
			return created;
		});
		return response.status(201).json({ message: "Account created.", account });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Account could not be created." });
	}
}

export async function updateAccount(request, response) {
	if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Account ID is invalid." });
	const body = request.body ?? {};
	try {
		const account = await runFinancialTransaction(async (session) => {
			const current = await Account.findById(request.params.id).session(session);
			if (!current) throw operationalError(404, "Account was not found.");
			const previous = { name: current.name, description: current.description, subcategory: current.subcategory, accountType: current.accountType, normalBalance: current.normalBalance, parent: current.parent, allowManualPosting: current.allowManualPosting, isActive: current.isActive };
			const isEnvironmentMapped = accountMappingEnvironmentKeys.some((key) => process.env[key] && String(current._id) === process.env[key]);
			const isPersistentlyMapped = await SystemAccountMapping.exists({ account: current._id }).session(session);
			if (body.isActive === false && (current.isSystem || current.systemKey || isEnvironmentMapped || isPersistentlyMapped)) throw operationalError(409, "System posting accounts cannot be deactivated while assigned to automated transactions.");
			if (body.isActive === false && await Account.exists({ parent: current._id }).session(session)) throw operationalError(409, "An account with child accounts cannot be deactivated.");
			if (body.parent !== undefined) {
				if (body.parent && (!mongoose.isValidObjectId(body.parent) || String(body.parent) === String(current._id))) throw operationalError(400, "Parent account is invalid.");
				if (body.parent) {
					const parent = await Account.findOne({ _id: body.parent, isActive: true, currency: current.currency, category: current.category }).session(session);
					if (!parent) throw operationalError(400, "Parent account must be active and match this account's category and currency.");
					const parentEnvironmentMapped = accountMappingEnvironmentKeys.some((key) => process.env[key] && String(parent._id) === process.env[key]);
					if (parent.accountType === "posting" && (parent.isSystem || parent.systemKey || parentEnvironmentMapped || await SystemAccountMapping.exists({ account: parent._id }).session(session))) throw operationalError(409, "A system-mapped posting account cannot become a parent account.");
					const hasChildren = await Account.exists({ parent: parent._id }).session(session);
					if (parent.accountType !== "group" && !hasChildren && parent.allowManualPosting !== false) throw operationalError(409, "The selected parent must be a Parent / Group account.");
					if (current.code <= parent.code) throw operationalError(400, "Child account codes must sort after their parent account code.");
					let ancestor = parent;
					for (let depth = 0; ancestor?.parent && depth < 100; depth += 1) {
						if (String(ancestor.parent) === String(current._id)) throw operationalError(400, "Account hierarchy cannot contain a cycle.");
						ancestor = await Account.findById(ancestor.parent).select("parent").session(session);
					}
				}
				current.parent = body.parent || null;
				if (body.parent) {
					const parent = await Account.findById(body.parent).session(session);
					const parentBefore = { accountType: parent.accountType, allowManualPosting: parent.allowManualPosting };
					parent.accountType = "group";
					parent.allowManualPosting = false;
					parent.updatedBy = request.adminUser._id;
					await parent.save({ session });
					if (parentBefore.accountType !== "group" || parentBefore.allowManualPosting !== false) {
						await AuditLog.create([{
							actor: request.adminUser._id,
							actorRole: request.adminUser.role,
							action: "accounting.account.updated",
							resourceType: "Account",
							resourceId: parent._id,
							outcome: "success",
							changes: { from: parentBefore, to: { accountType: "group", allowManualPosting: false } },
							details: { code: parent.code, reason: "became_parent_account" },
						}], { session });
					}
				}
			}
			if (body.name !== undefined) {
				if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120) throw operationalError(400, "Account name is required (up to 120 characters).");
				current.name = body.name.trim();
			}
			if (body.description !== undefined) {
				if (typeof body.description !== "string" || body.description.length > 500) throw operationalError(400, "Description must be 500 characters or fewer.");
				current.description = body.description.trim();
			}
			if (body.subcategory !== undefined) {
				if (typeof body.subcategory !== "string" || body.subcategory.length > 80) throw operationalError(400, "Subcategory must be 80 characters or fewer.");
				current.subcategory = body.subcategory.trim();
			}
			if (body.normalBalance !== undefined) {
				if (!["debit", "credit"].includes(body.normalBalance)) throw operationalError(400, "Normal balance must be debit or credit.");
				if (body.normalBalance !== current.normalBalance && (current.systemKey || isEnvironmentMapped || isPersistentlyMapped)) throw operationalError(409, "The normal balance of a system-mapped account cannot change. Assign a correctly configured posting account instead.");
				current.normalBalance = body.normalBalance;
			}
			if (body.accountType !== undefined) {
				if (!["group", "posting"].includes(body.accountType)) throw operationalError(400, "Account type must be Parent / Group or Posting / Ledger.");
				if (body.accountType === "group" && (current.systemKey || isEnvironmentMapped || isPersistentlyMapped)) throw operationalError(409, "System-mapped accounts must remain posting accounts.");
				if (body.accountType === "posting" && await Account.exists({ parent: current._id }).session(session)) throw operationalError(409, "An account with children must remain a Parent / Group account.");
				current.accountType = body.accountType;
				if (body.accountType === "group") current.allowManualPosting = false;
				else if (body.allowManualPosting === undefined) current.allowManualPosting = true;
			}
			if (body.allowManualPosting !== undefined) {
				if (typeof body.allowManualPosting !== "boolean") throw operationalError(400, "Manual posting setting must be true or false.");
				if (body.allowManualPosting && (current.accountType === "group" || await Account.exists({ parent: current._id }).session(session))) throw operationalError(409, "Parent / Group accounts cannot be enabled for manual posting.");
				current.allowManualPosting = body.allowManualPosting;
			}
			if (body.isActive !== undefined) {
				if (typeof body.isActive !== "boolean") throw operationalError(400, "Account status must be active or inactive.");
				if (body.isActive && current.parent) {
					const parent = await Account.findOne({ _id: current.parent, isActive: true, category: current.category, currency: current.currency }).session(session);
					if (!parent) throw operationalError(409, "An account cannot be activated while its parent is inactive or incompatible.");
				}
				current.isActive = body.isActive;
			}
			current.updatedBy = request.adminUser._id;
			await current.save({ session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "accounting.account.updated",
				resourceType: "Account",
				resourceId: current._id,
				outcome: "success",
				changes: { from: previous, to: { name: current.name, description: current.description, subcategory: current.subcategory, accountType: current.accountType, normalBalance: current.normalBalance, parent: current.parent, allowManualPosting: current.allowManualPosting, isActive: current.isActive } },
				details: { code: current.code },
			}], { session });
			return current;
		});
		return response.json({ message: "Account updated.", account });
	} catch (error) {
		return response.status(error.status || 500).json({ message: error.message || "Account could not be updated." });
	}
}

export async function deleteAccount(request, response) {
	if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Account ID is invalid." });
	try {
		const removed = await runFinancialTransaction(async (session) => {
			const account = await Account.findById(request.params.id).session(session);
			if (!account) throw operationalError(404, "Account was not found.");
			if (account.isSystem || account.systemKey || accountMappingEnvironmentKeys.some((key) => process.env[key] && String(account._id) === process.env[key])) {
				throw operationalError(409, "System posting accounts cannot be deleted. Reassign the mapping and deactivate it instead.");
			}
			if (await SystemAccountMapping.exists({ account: account._id }).session(session)) throw operationalError(409, "This account is assigned to a system mapping. Reassign the mapping and deactivate it instead.");
			if (await Account.exists({ parent: account._id }).session(session)) throw operationalError(409, "An account with child accounts cannot be deleted. Move or delete its children first.");
			if (await JournalEntry.exists({ "lines.account": account._id }).session(session)) throw operationalError(409, "This account has journal history and cannot be deleted. Deactivate it instead to preserve the audit trail.");
			if (await Expense.exists({ account: account._id }).session(session)) throw operationalError(409, "This account is referenced by expense records and cannot be deleted. Deactivate it instead.");
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "accounting.account.deleted",
				resourceType: "Account",
				resourceId: account._id,
				outcome: "success",
				details: { code: account.code, name: account.name, category: account.category },
			}], { session });
			await account.deleteOne({ session });
			return { code: account.code };
		});
		return response.json({ message: `Account ${removed.code} deleted.` });
	} catch (error) {
		return response.status(error.status || 500).json({ message: error.message || "Account could not be deleted." });
	}
}

export async function createJournal(request, response) {
	const body = request.body ?? {};
	if (typeof body.description !== "string" || !body.description.trim() || body.description.length > 500) return response.status(400).json({ message: "A description of up to 500 characters is required." });
	if (!Array.isArray(body.lines) || body.lines.length < 2 || body.lines.length > 100) return response.status(400).json({ message: "A journal requires between 2 and 100 lines." });
	const currency = typeof body.currency === "string" && /^[A-Z]{3}$/i.test(body.currency) ? body.currency.toUpperCase() : "ETB";
	try {
		validateBalancedJournalLines(body.lines);
	} catch (error) {
		return response.status(400).json({ message: error.message });
	}

	try {
		const entry = await runFinancialTransaction(async (session) => {
			const accountIds = [...new Set(body.lines.map((line) => String(line.account)))];
			if (accountIds.some((id) => !mongoose.isValidObjectId(id))) {
				const error = new Error("Each journal line must reference a valid, distinct account.");
				error.status = 400;
				throw error;
			}
			const mappings = await SystemAccountMapping.find({ account: { $in: accountIds } }).select("account").session(session).lean();
			const mappedAccountIds = new Set(mappings.map((mapping) => String(mapping.account)));
			for (const setting of Object.values(accountMappingEnvironmentByKey)) {
				const accountId = process.env[setting];
				if (accountId && mongoose.isValidObjectId(accountId)) mappedAccountIds.add(accountId);
			}
			const eligibleAccountIds = accountIds.filter((id) => !mappedAccountIds.has(id));
			const accounts = await Account.find({ _id: { $in: eligibleAccountIds }, isActive: true, currency, allowManualPosting: { $ne: false }, isSystem: { $ne: true }, systemKey: { $exists: false } }).session(session).lean();
			if (accounts.length !== accountIds.length) {
				const error = new Error("Every journal account must be an active posting account, allow manual posting, not be a system mapping, and use the same currency.");
				error.status = 400;
				throw error;
			}
			if (accounts.some((account) => account.accountType === "group") || await Account.exists({ parent: { $in: accountIds } }).session(session)) {
				const error = new Error("Parent accounts cannot receive direct journal postings.");
				error.status = 400;
				throw error;
			}
			const lines = body.lines.map((line) => ({
				account: line.account,
				description: typeof line.description === "string" ? line.description.slice(0, 250) : "",
				debitMinor: Number(line.debitMinor || 0),
				creditMinor: Number(line.creditMinor || 0),
				member: line.member && mongoose.isValidObjectId(line.member) ? line.member : null,
				loan: line.loan && mongoose.isValidObjectId(line.loan) ? line.loan : null,
			}));
			const [journal] = await JournalEntry.create([{
				entryNumber: generateReference("JE"),
				date: body.date && !Number.isNaN(Date.parse(body.date)) ? new Date(body.date) : new Date(),
				description: body.description.trim(),
				currency,
				lines,
				status: "posted",
				sourceType: "manual",
				createdBy: request.adminUser._id,
				postedBy: request.adminUser._id,
				postedAt: new Date(),
			}], { session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "accounting.journal.posted",
				resourceType: "JournalEntry",
				resourceId: journal._id,
				outcome: "success",
				details: { entryNumber: journal.entryNumber, lineCount: lines.length, currency },
			}], { session });
			return journal;
		});
		return response.status(201).json({ message: "Balanced journal posted.", journal: entry });
	} catch (error) {
		console.error("Unable to create journal:", error.message);
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Journal could not be posted." });
	}
}

export async function listJournals(request, response) {
	const filter = { status: "posted" };
	if (request.query.sourceType) {
		if (!["manual", "transaction", "repayment", "expense", "share_purchase", "adjustment"].includes(request.query.sourceType)) return response.status(400).json({ message: "Journal source type is invalid." });
		filter.sourceType = request.query.sourceType;
	}
	const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 50, 1), 100);
	try {
		const journals = await JournalEntry.find(filter).sort({ date: -1, createdAt: -1 }).limit(limit)
			.populate("lines.account", "code name category accountType")
			.populate("createdBy postedBy", "name email").lean();
		return response.json({ journals });
	} catch (error) {
		console.error("Unable to list journal entries:", error.message);
		return response.status(500).json({ message: "Journal entries could not be loaded." });
	}
}

export async function createExpense(request, response) {
	const body = request.body ?? {};
	const amountMinor = Number(body.amountMinor);
	if (typeof body.category !== "string" || !body.category.trim() || body.category.length > 80) return response.status(400).json({ message: "Expense category is required (up to 80 characters)." });
	if (typeof body.description !== "string" || !body.description.trim() || body.description.length > 1000) return response.status(400).json({ message: "Expense description is required (up to 1000 characters)." });
	if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return response.status(400).json({ message: "Expense amount must be a positive integer in minor units." });
	if (!["cash", "bank_transfer", "mobile_money", "other"].includes(body.paymentMethod)) return response.status(400).json({ message: "Expense payment method is invalid." });
	if (body.account && !mongoose.isValidObjectId(body.account)) return response.status(400).json({ message: "Expense ledger account ID is invalid." });
	try {
		const expense = await runFinancialTransaction(async (session) => {
			const currency = typeof body.currency === "string" && /^[A-Z]{3}$/i.test(body.currency) ? body.currency.toUpperCase() : "ETB";
			let expenseAccount = null;
			if (body.account) {
				expenseAccount = await Account.findOne({ _id: body.account, category: "expense", isActive: true, currency }).session(session);
				if (!expenseAccount) throw operationalError(400, "Expense ledger account must be active, use the expense category, and match the expense currency.");
				if (await Account.exists({ parent: expenseAccount._id }).session(session)) throw operationalError(400, "A parent account cannot be selected for expense posting.");
			}
			const [created] = await Expense.create([{
				expenseNumber: generateReference("EXP"),
				category: body.category.trim(),
				description: body.description.trim(),
				amountMinor,
				currency,
				incurredAt: body.incurredAt && !Number.isNaN(Date.parse(body.incurredAt)) ? new Date(body.incurredAt) : new Date(),
				vendorName: typeof body.vendorName === "string" ? body.vendorName.trim().slice(0, 160) : "",
				vendorReference: typeof body.vendorReference === "string" ? body.vendorReference.trim().slice(0, 100) : "",
				paymentMethod: body.paymentMethod,
				account: expenseAccount?._id || null,
				status: "submitted",
				requestedBy: request.adminUser._id,
				notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "",
			}], { session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "expense.submitted",
				resourceType: "Expense",
				resourceId: created._id,
				outcome: "success",
				details: { expenseNumber: created.expenseNumber, amountMinor, currency: created.currency, account: expenseAccount?._id || null },
			}], { session });
			return created;
		});
		return response.status(201).json({ message: "Expense submitted for approval.", expense });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Expense could not be created." });
	}
}

export async function listExpenses(request, response) {
	const filter = {};
	if (request.query.status) {
		if (!["draft", "submitted", "approved", "rejected", "paid", "void"].includes(request.query.status)) return response.status(400).json({ message: "Expense status is invalid." });
		filter.status = request.query.status;
	}
	const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 50, 1), 100);
	try {
		const expenses = await Expense.find(filter).sort({ createdAt: -1 }).limit(limit).populate("requestedBy approvedBy paidBy", "name email").populate("account", "code name category").lean();
		return response.json({ expenses });
	} catch (error) {
		return response.status(500).json({ message: "Expenses could not be loaded." });
	}
}

export async function decideExpense(request, response) {
	if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Expense ID is invalid." });
	const decision = request.body?.decision;
	const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";
	if (!["approved", "rejected"].includes(decision)) return response.status(400).json({ message: "Decision must be approved or rejected." });
	if (decision === "rejected" && !reason) return response.status(400).json({ message: "A rejection reason is required." });
	try {
		const expense = await runFinancialTransaction(async (session) => {
			const current = await Expense.findById(request.params.id).session(session);
			if (!current) throw operationalError(404, "Expense was not found.");
			if (current.status !== "submitted") throw operationalError(409, "Only submitted expenses can receive a decision.");
			if (decision === "approved" && current.requestedBy.equals(request.adminUser._id)) throw operationalError(403, "The expense requester cannot approve their own expense.");
			current.status = decision;
			current.approvedBy = decision === "approved" ? request.adminUser._id : null;
			current.approvedAt = decision === "approved" ? new Date() : null;
			if (decision === "rejected") current.notes = [current.notes, `Rejected: ${reason}`].filter(Boolean).join(" ").slice(0, 1000);
			await current.save({ session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: `expense.${decision}`,
				resourceType: "Expense",
				resourceId: current._id,
				outcome: "success",
				details: { expenseNumber: current.expenseNumber, reason },
			}], { session });
			return current;
		});
		return response.json({ message: `Expense ${decision}.`, expense });
	} catch (error) {
		return response.status(error.status || 500).json({ message: error.message || "Expense decision could not be saved." });
	}
}

export async function payExpense(request, response) {
	if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Expense ID is invalid." });
	try {
		const result = await runFinancialTransaction(async (session) => {
			const expense = await Expense.findById(request.params.id).session(session);
			if (!expense) throw operationalError(404, "Expense was not found.");
			if (expense.status !== "approved") throw operationalError(409, "Only approved expenses can be paid.");
			const settlementCode = expense.paymentMethod === "cash" ? "cash" : expense.paymentMethod === "mobile_money" ? "mobile_money" : "bank";
			const settlement = await configuredAccount(settlementCode, expense.currency, session);
			const expenseAccount = expense.account
				? await Account.findOne({ _id: expense.account, isActive: true, currency: expense.currency, category: "expense" }).session(session)
				: await configuredAccount("expense", expense.currency, session);
			if (!expenseAccount) throw operationalError(503, "Expense account is missing or inactive.");
			if (await Account.exists({ parent: expenseAccount._id }).session(session)) throw operationalError(503, "Expense account is now a parent account and cannot receive postings.");
			let cashSession = null;
			if (expense.paymentMethod === "cash") {
				cashSession = await CashSession.findOne({ cashier: request.adminUser._id, status: "open" }).session(session);
				if (!cashSession) throw operationalError(409, "An open cashier session is required for cash expense payment.");
			}
			const transaction = await createLedgerTransaction({
				session,
				actor: request.adminUser,
				reference: generateReference("TXN"),
				type: "expense",
				direction: "debit",
				amountMinor: expense.amountMinor,
				currency: expense.currency,
				paymentMethod: expense.paymentMethod,
				cashSession: cashSession?._id,
				description: `Expense ${expense.expenseNumber}: ${expense.description}`,
			});
			const [journalEntry] = await JournalEntry.create([{
				entryNumber: generateReference("JE"),
				date: new Date(),
				description: transaction.description,
				currency: expense.currency,
				lines: [
					{ account: expenseAccount._id, debitMinor: expense.amountMinor, creditMinor: 0, description: expense.description },
					{ account: settlement._id, debitMinor: 0, creditMinor: expense.amountMinor, description: "Expense payment" },
				],
				status: "posted",
				sourceType: "expense",
				sourceId: expense._id,
				createdBy: request.adminUser._id,
				postedBy: request.adminUser._id,
				postedAt: new Date(),
			}], { session });
			transaction.metadata = { journalEntry: journalEntry._id, expense: expense._id };
			await transaction.save({ session });
			expense.status = "paid";
			expense.paidBy = request.adminUser._id;
			expense.paidAt = new Date();
			expense.journalEntry = journalEntry._id;
			await expense.save({ session });
			if (cashSession) {
				cashSession.movements.push({ transaction: transaction._id, type: "cash_out", amountMinor: expense.amountMinor, reference: transaction.reference, note: transaction.description });
				cashSession.expectedClosingMinor = cashSession.openingFloatMinor + cashSession.movements.reduce((total, movement) => total + (movement.type === "cash_in" ? movement.amountMinor : movement.type === "cash_out" ? -movement.amountMinor : 0), 0);
				await cashSession.save({ session });
			}
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "expense.paid",
				resourceType: "Expense",
				resourceId: expense._id,
				outcome: "success",
				details: { transaction: transaction._id, journalEntry: journalEntry._id, amountMinor: expense.amountMinor },
			}], { session });
			return { expense, transaction, journalEntry };
		});
		return response.json({ message: "Expense paid and posted.", ...result });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Expense could not be paid." });
	}
}