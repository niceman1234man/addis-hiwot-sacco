import { Link } from "react-router-dom";
import { ChartNoAxesCombined, ClipboardCheck, HandCoins } from "lucide-react";

export default function ManagerDashboard() {
  return <section className="role-dashboard">
    <div className="role-welcome"><div><span className="workspace-kicker">Operations overview</span><h2>Keep decisions moving.</h2><p>Review approvals, monitor operations and follow the cooperative's key indicators.</p></div><span className="role-welcome-mark"><ChartNoAxesCombined size={30} /></span></div>
    <div className="workspace-metrics"><article><span>Loan queue</span><strong>—</strong><small>Live application data unavailable</small></article><article><span>Pending transactions</span><strong>—</strong><small>Approval feed not configured</small></article><article><span>Portfolio health</span><strong>—</strong><small>Awaiting posted ledger data</small></article></div>
    <div className="role-section-heading"><div><span className="workspace-kicker">Quick access</span><h2>Manager tools</h2></div></div>
    <div className="workspace-shortcuts"><Link to="/manager/loans"><span className="shortcut-icon"><HandCoins size={19} /></span><span><strong>Loan approvals</strong><small>Review decisions for loan requests</small></span><ClipboardCheck size={17} /></Link><Link to="/manager/reports"><span className="shortcut-icon"><ChartNoAxesCombined size={19} /></span><span><strong>Performance reports</strong><small>View available financial summaries</small></span><ChartNoAxesCombined size={17} /></Link></div>
    <p className="workspace-inline-note">Operational statistics appear when the backend modules are implemented and connected.</p>
  </section>;
}