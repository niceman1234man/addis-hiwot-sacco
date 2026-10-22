import { NavLink } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function Sidebar({ items = [], role }) {
  return <aside aria-label="Dashboard navigation" className="dashboard-sidebar">
    <div className="sidebar-caption">WORKSPACE</div>
    <nav>{items.map((item) => <NavLink key={item.to} to={item.to} end={item.end}>
      <span>{item.icon && <item.icon size={17} strokeWidth={1.7} />}{item.label}</span><ChevronRight size={14} />
    </NavLink>)}</nav>
    <div className="sidebar-profile"><span className="sidebar-avatar">{role?.slice(0, 1).toUpperCase()}</span><span><small>Signed in as</small><strong>{role || "Staff"}</strong></span></div>
  </aside>;
}