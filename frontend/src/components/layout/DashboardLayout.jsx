import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";

export default function DashboardLayout({ children, user, navItems, onSignOut }) {
  return <div className="dashboard-layout">
    <Navbar user={user} onSignOut={onSignOut} />
    <Sidebar items={navItems} role={user?.role} />
    <main className="dashboard-main">{children}</main>
  </div>;
}