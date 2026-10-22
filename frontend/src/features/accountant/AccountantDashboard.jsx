import { Link } from "react-router-dom";
import { BookOpenCheck, FileBarChart, ReceiptText, WalletCards } from "lucide-react";

export default function AccountantDashboard() {
  return <section className="role-dashboard">
    <div className="role-welcome"><div><span className="workspace-kicker">Finance overview</span><h2>Clear books. Confident decisions.</h2><p>Manage the chart of accounts and prepare balanced journal entries.</p></div><span className="role-welcome-mark"><BookOpenCheck size={30} /></span></div>
    <div className="workspace-metrics"><article><span>Posted journals</span><strong>—</strong><small>Ledger integration pending</small></article><article><span>Unreconciled items</span><strong>—</strong><small>Reconciliation is not enabled</small></article><article><span>Reporting period</span><strong>—</strong><small>Configure a financial period</small></article></div>
    <div className="role-section-heading"><div><span className="workspace-kicker">Quick access</span><h2>Accounting tools</h2></div></div>
    <div className="workspace-shortcuts"><Link to="/accountant/accounts"><span className="shortcut-icon"><WalletCards size={19} /></span><span><strong>Chart of accounts</strong><small>Review account classifications</small></span><BookOpenCheck size={17} /></Link><Link to="/accountant/journals"><span className="shortcut-icon"><ReceiptText size={19} /></span><span><strong>Journal entries</strong><small>Prepare a balanced entry draft</small></span><ReceiptText size={17} /></Link><Link to="/accountant/reports"><span className="shortcut-icon"><FileBarChart size={19} /></span><span><strong>Financial reports</strong><small>View current reporting availability</small></span><FileBarChart size={17} /></Link></div>
    <p className="workspace-inline-note">The backend will reject posting until accounting persistence and reconciliation are implemented.</p>
  </section>;
}