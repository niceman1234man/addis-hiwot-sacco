import { useNavigate } from "react-router-dom";
import { signOutAdmin } from "../../api/authApi.js";
import logo from "../../assets/logo.jpg";

export default function Navbar({ title = "SACCO Management", user }) {
  const navigate = useNavigate();
  async function signOut() {
    try {
      await signOutAdmin();
    } finally {
      navigate("/sign-in", { replace: true });
    }
  }
  return <header className="workspace-topbar">
    <a className="workspace-brand" href="/" aria-label="Addis Hiwot SACCO home"><img src={logo} alt="" /></a>
    <div className="workspace-topbar-right"><span className="workspace-user-role">{user?.role}</span><span>{user?.name || user?.email}</span><button type="button" onClick={signOut}>Sign out</button></div>
  </header>;
}