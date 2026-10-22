import test from "node:test";
import assert from "node:assert/strict";
import { previewSavingsBalance } from "../src/services/savingsService.js";
import { buildMonthlyAmortizationSchedule, calculateAmortizedPaymentMinor } from "../src/services/loanService.js";
import { validateBalancedJournalLines, buildJournalLines } from "../src/services/accountingService.js";
import { createTransactionDraft, assertTransactionTransition } from "../src/services/transactionService.js";
import { summarizeTransactions } from "../src/services/reportService.js";
import { validateLoan } from "../src/validators/loanValidator.js";
import { validateTransaction } from "../src/validators/transactionValidator.js";
import mongoose from "mongoose";
import JournalEntry from "../src/models/JournalEntry.js";
import SavingsAccount from "../src/models/SavingsAccount.js";

const actorId = "0123456789abcdef01234567";

test("savings preview applies deposits and prevents overdrafts", () => {
  assert.deepEqual(previewSavingsBalance({ balanceMinor: 5000 }, "deposit", 125), {
    balanceMinor: 5125,
    availableBalanceMinor: 5125,
  });
  assert.throws(() => previewSavingsBalance({ balanceMinor: 100, availableBalanceMinor: 50 }, "withdrawal", 51), /Insufficient/);
});

test("monthly amortized payment handles zero interest and positive interest", () => {
  assert.equal(calculateAmortizedPaymentMinor(12000, 0, 12), 1000);
  assert.ok(calculateAmortizedPaymentMinor(12000, 1200, 12) > 1000);
  assert.throws(() => calculateAmortizedPaymentMinor(0, 0, 12), /Principal/);
});

test("monthly loan schedule amortizes full principal and clamps month-end due dates", () => {
  const { schedule, totalInterestMinor } = buildMonthlyAmortizationSchedule(10000, 1200, 3, new Date("2026-01-31T12:00:00.000Z"));
  assert.equal(schedule.length, 3);
  assert.equal(schedule.reduce((sum, row) => sum + row.principalDueMinor, 0), 10000);
  assert.equal(schedule.reduce((sum, row) => sum + row.interestDueMinor, 0), totalInterestMinor);
  assert.equal(schedule[0].dueAt.getUTCMonth(), 1);
  assert.equal(schedule[0].dueAt.getUTCDate(), 28);
  assert.equal(schedule.at(-1).principalDueMinor, 10000 - schedule.slice(0, -1).reduce((sum, row) => sum + row.principalDueMinor, 0));
});

test("journal lines must balance and have exactly one side per line", () => {
  const lines = buildJournalLines({ debitAccount: "cash", creditAccount: "savings", amountMinor: 1000 });
  assert.equal(validateBalancedJournalLines(lines).balanced, true);
  assert.throws(() => validateBalancedJournalLines([{ debitMinor: 200, creditMinor: 0 }, { debitMinor: 0, creditMinor: 100 }]), /balance/);
  assert.throws(() => validateBalancedJournalLines([{ debitMinor: 100, creditMinor: 100 }, { debitMinor: 0, creditMinor: 0 }]), /exactly one/);
});

test("generic transactions create pending drafts and enforce status transitions", () => {
  const draft = createTransactionDraft({ type: "deposit", direction: "credit", amountMinor: 500, paymentMethod: "cash" }, actorId);
  assert.equal(draft.status, "pending");
  assert.equal(draft.createdBy, actorId);
  assert.throws(() => assertTransactionTransition("pending", "reversed"), /cannot transition/);
  assert.doesNotThrow(() => assertTransactionTransition("posted", "reversed"));
});

test("reports summarize posted records only and preserve currency separation", () => {
  const result = summarizeTransactions([
    { status: "posted", currency: "ETB", direction: "credit", amountMinor: 200 },
    { status: "posted", currency: "ETB", direction: "debit", amountMinor: 50 },
    { status: "pending", currency: "ETB", direction: "credit", amountMinor: 900 },
    { status: "posted", currency: "USD", direction: "credit", amountMinor: 10 },
  ]);
  assert.deepEqual(result.ETB, { creditsMinor: 200, debitsMinor: 50, count: 2 });
  assert.equal(result.USD.creditsMinor, 10);
});

test("loan and transaction validators reject unsafe amounts", () => {
  assert.equal(validateLoan({ member: actorId, productName: "Standard", purpose: "Working capital", principalMinor: 10000, interestRateBps: 500, termMonths: 12 }).valid, true);
  assert.equal(validateLoan({ member: "bad", principalMinor: -1 }).valid, false);
  assert.equal(validateTransaction({ type: "deposit", amountMinor: 10, paymentMethod: "cash" }).valid, true);
  assert.equal(validateTransaction({ type: "bogus", amountMinor: 0, paymentMethod: "unknown" }).valid, false);
});

test("posted journal model rejects unbalanced lines", async () => {
  const id = new mongoose.Types.ObjectId();
  const journal = new JournalEntry({
    entryNumber: "JE-TEST-1",
    date: new Date(),
    description: "Invalid test journal",
    createdBy: id,
    postedBy: id,
    postedAt: new Date(),
    status: "posted",
    lines: [
      { account: id, debitMinor: 100, creditMinor: 0 },
      { account: id, debitMinor: 0, creditMinor: 90 },
    ],
  });
  await assert.rejects(journal.validate(), /Posted journal entries must balance/);
});

test("savings account model checks integer and available balance invariants", async () => {
  const account = new SavingsAccount({
    accountNumber: "SAV-TEST-1",
    member: new mongoose.Types.ObjectId(),
    productName: "Regular",
    balanceMinor: 100,
    availableBalanceMinor: 101,
  });
  await assert.rejects(account.validate(), /Available balance cannot exceed/);
});
