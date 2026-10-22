import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Banknote, CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";
import { axiosInstance } from "../../api/axiosInstance.js";
import { formatCurrency } from "../../utils/formatCurrency.js";

export default function CashierDashboard() {
  const [cashSession, setCashSession] = useState(null);
  const [totals, setTotals] = useState({ deposit: 0, withdrawal: 0 });
  useEffect(() => {
    let active = true;
    Promise.all([
      axiosInstance.get("/cashier/sessions/current").catch(() => ({ cashSession: null })),
      axiosInstance.get(`/transactions?from=${encodeURIComponent(new Date(new Date().setHours(0, 0, 0, 0)).toISOString())}&limit=100`).catch(() => ({ transactions: [] })),
    ]).then(([sessionResult, transactionResult]) => {
      if (!active) return;
      setCashSession(sessionResult.cashSession);
      setTotals((transactionResult.transactions || []).filter((item) => item.status === "posted").reduce((sum, item) => {
        if (item.type === "deposit") sum.deposit += item.amountMinor;
        if (item.type === "withdrawal") sum.withdrawal += item.amountMinor;
        return sum;
      }, { deposit: 0, withdrawal: 0 }));
    });
    return () => { active = false; };
  }, []);
  return <section className="role-dashboard">
    <div className="role-welcome"><div><span className="workspace-kicker">Cash operations</span><h2>Every transaction, accounted for.</h2><p>Capture member service requests and prepare your daily cash closing.</p></div><span className="role-welcome-mark"><WalletCards size={30} /></span></div>
    <div className="workspace-metrics"><article><span>Cash session</span><strong>{cashSession ? "Open" : "Not open"}</strong><small>{cashSession ? cashSession.sessionNumber : "Start today's session"}</small></article><article><span>Today's deposits</span><strong>{formatCurrency(totals.deposit / 100)}</strong><small>Posted deposit transactions</small></article><article><span>Today's withdrawals</span><strong>{formatCurrency(totals.withdrawal / 100)}</strong><small>Posted withdrawal transactions</small></article></div>
    <div className="role-section-heading"><div><span className="workspace-kicker">Cashier actions</span><h2>Start with a service</h2></div></div>
    <div className="workspace-shortcuts"><Link to="/cashier/deposit"><span className="shortcut-icon"><CircleDollarSign size={19} /></span><span><strong>Deposit</strong><small>Prepare a member savings deposit</small></span><CircleDollarSign size={17} /></Link><Link to="/cashier/withdrawal"><span className="shortcut-icon"><Banknote size={19} /></span><span><strong>Withdrawal</strong><small>Capture a withdrawal for verification</small></span><Banknote size={17} /></Link><Link to="/cashier/payment"><span className="shortcut-icon"><ReceiptText size={19} /></span><span><strong>Payment</strong><small>Prepare a payment entry</small></span><ReceiptText size={17} /></Link></div>
    <p className="workspace-inline-note">Forms submit to protected APIs; unfinished backend operations respond with HTTP 501 and do not change balances.</p>
  </section>;
}