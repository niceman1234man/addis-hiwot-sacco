import { Route, Routes } from "react-router-dom";
import AdminDashboard from "../features/admin/AdminDashboard.jsx";
import Login, { AccountSecurityPage } from "../features/auth/Login.jsx";
import RoleRoutes from "./RoleRoutes.jsx";
import RoleWorkspace from "../features/RoleWorkspace.jsx";

export default function AppRoutes({ HomePage, RegisterPage }) {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin/*" element={<RoleRoutes roles={["admin"]}><RoleWorkspace /></RoleRoutes>} />
      <Route path="/manager/*" element={<RoleRoutes roles={["manager"]}><RoleWorkspace /></RoleRoutes>} />
      <Route path="/accountant/*" element={<RoleRoutes roles={["accountant"]}><RoleWorkspace /></RoleRoutes>} />
      <Route path="/cashier/*" element={<RoleRoutes roles={["cashier"]}><RoleWorkspace /></RoleRoutes>} />
      <Route path="/sign-in/*" element={<Login />} />
      <Route path="/account/*" element={<AccountSecurityPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
