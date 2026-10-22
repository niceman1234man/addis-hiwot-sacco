import { useMemo, useState } from "react";
import { Activity, Banknote, BookOpenCheck, ChartNoAxesCombined, CircleDollarSign, ClipboardList, FileBarChart, HandCoins, LayoutDashboard, ReceiptText, UsersRound, WalletCards } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import ManagerDashboard from "./manager/ManagerDashboard.jsx";
import AccountantDashboard from "./accountant/AccountantDashboard.jsx";
import CashierDashboard from "./cashier/CashierDashboard.jsx";
import LoanApprovals from "./manager/LoanApprovals.jsx";
import PerformanceReports from "./manager/PerformanceReports.jsx";
import ChartOfAccounts from "./accountant/ChartOfAccounts.jsx";
import JournalEntries from "./accountant/JournalEntries.jsx";
import FinancialReports from "./accountant/FinancialReports.jsx";
import Deposit from "./cashier/Deposit.jsx";
import Withdrawal from "./cashier/Withdrawal.jsx";
import Payment from "./cashier/Payment.jsx";
import CashClosing from "./cashier/CashSession.jsx";
import MemberApplications from "./members/MemberApplications.jsx";
import SavingsAccountForm from "./savings/SavingsAccountForm.jsx";
import LoanApplicationForm from "./loans/LoanApplicationForm.jsx";
import LoanDisbursement from "./loans/LoanDisbursement.jsx";
import TransactionsList from "./transactions/TransactionsList.jsx";
import FinancialSummary from "./reports/FinancialSummary.jsx";
import ExpenseForm from "./accountant/ExpenseForm.jsx";
import ExpenseApprovals from "./manager/ExpenseApprovals.jsx";
import ExpensePayments from "./cashier/ExpensePayments.jsx";

const roleConfig = {
  admin: {
    title: "Administration",
    links: [
      ["/admin", "Overview", LayoutDashboard],
      ["/admin/users", "User management", UsersRound],
      ["/admin/members", "Member applications", ClipboardList],
      ["/admin/accounts", "Chart of accounts", BookOpenCheck],
      ["/admin/reports", "Reports", FileBarChart],
      ["/admin/transactions", "Transactions", Activity],
    ],
    pages: { "/admin": AdminDashboard, "/admin/users": AdminDashboard, "/admin/members": MemberApplications, "/admin/accounts": ChartOfAccounts, "/admin/reports": FinancialSummary, "/admin/transactions": TransactionsList },
  },
  manager: {
    title: "Manager workspace",
    links: [["/manager", "Overview", LayoutDashboard], ["/manager/loans", "Loan approvals", HandCoins], ["/manager/expenses", "Expense approvals", ReceiptText], ["/manager/reports", "Performance reports", ChartNoAxesCombined]],
    pages: { "/manager": ManagerDashboard, "/manager/loans": LoanApprovals, "/manager/expenses": ExpenseApprovals, "/manager/reports": PerformanceReports },
  },
  accountant: {
    title: "Accounting workspace",
    links: [["/accountant", "Overview", LayoutDashboard], ["/accountant/accounts", "Chart of accounts", BookOpenCheck], ["/accountant/journals", "Journal entries", ReceiptText], ["/accountant/expenses", "Submit expense", ReceiptText], ["/accountant/savings", "Savings accounts", WalletCards], ["/accountant/loans", "Loans", HandCoins], ["/accountant/disbursements", "Loan disbursement", Banknote], ["/accountant/transactions", "Transactions", Activity], ["/accountant/reports", "Financial reports", FileBarChart]],
    pages: { "/accountant": AccountantDashboard, "/accountant/accounts": ChartOfAccounts, "/accountant/journals": JournalEntries, "/accountant/expenses": ExpenseForm, "/accountant/savings": SavingsAccountForm, "/accountant/loans": LoanApplicationForm, "/accountant/disbursements": LoanDisbursement, "/accountant/transactions": TransactionsList, "/accountant/reports": FinancialReports },
  },
  cashier: {
    title: "Cashier workspace",
    links: [["/cashier", "Overview", LayoutDashboard], ["/cashier/deposit", "Deposit", CircleDollarSign], ["/cashier/withdrawal", "Withdrawal", Banknote], ["/cashier/payment", "Payments", WalletCards], ["/cashier/expenses", "Approved expenses", ReceiptText], ["/cashier/transactions", "Transactions", Activity], ["/cashier/closing", "Cash closing", ReceiptText]],
    pages: { "/cashier": CashierDashboard, "/cashier/deposit": Deposit, "/cashier/withdrawal": Withdrawal, "/cashier/payment": Payment, "/cashier/expenses": ExpensePayments, "/cashier/transactions": TransactionsList, "/cashier/closing": CashClosing },
  },
};

function titleForPath(path, links) {
  return links.find(([to]) => to === path)?.[1] ?? "Workspace";
}

export default function RoleWorkspace({ user }) {
  const location = useLocation();
  const role = user?.role;
  const config = roleConfig[role];
  const Page = config?.pages[location.pathname];
  const [mobileNav, setMobileNav] = useState(false);
  const navItems = useMemo(() => config?.links.map(([to, label, icon]) => ({ to, label, icon, end: true })) ?? [], [config]);

  if (!config) return <main className="workspace-not-found"><h1>Role workspace unavailable</h1><Link to="/sign-in">Sign in with a supported staff account</Link></main>;

  return <DashboardLayout user={user} navItems={navItems}>
    <div className="workspace-heading-row">
      <div><p className="workspace-kicker">{config.title}</p><h1>{titleForPath(location.pathname, config.links)}</h1></div>
      <button type="button" className="mobile-nav-button" onClick={() => setMobileNav((open) => !open)} aria-expanded={mobileNav}>Sections</button>
    </div>
    {mobileNav && <nav className="workspace-mobile-nav">{config.links.map(([to, label]) => <Link key={to} to={to} onClick={() => setMobileNav(false)}>{label}</Link>)}</nav>}
    {Page ? <Page /> : <section className="workspace-panel"><h2>This section is not available</h2><p>Choose a section from the navigation.</p></section>}
  </DashboardLayout>;
}
