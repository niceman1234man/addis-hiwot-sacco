import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";
import PublicHeader from "./PublicHeader.jsx";

export default function DashboardLayout({ children, user, navItems, onSignOut }) {
  return <div className="dashboard-layout">
    <PublicHeader />
    <Navbar user={user} onSignOut={onSignOut} />
    <Sidebar items={navItems} role={user?.role} />
    <main className="dashboard-main">{children}</main>
  </div>;
}