import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { changeAdminPassword, getAdminSession, signInAdmin } from "../../api/authApi.js";
import PublicHeader from "../../components/layout/PublicHeader.jsx";
import logo from "../../assets/logo.jpg";

function AuthPage({ children, backTo = "/" }) {
  return (
    <>
      <PublicHeader />
      <main className="auth-page">
        <div className="auth-content">
          <Link className="auth-brand" to="/" aria-label="Addis Hiwot SACCO home">
            <img src={logo} alt="" />
            <span>
              <strong>Addis Hiwot SACCO</strong>
              <small>Staff portal</small>
            </span>
          </Link>
          <div className="auth-card">{children}</div>
          <Link className="auth-back-link" to={backTo}>
            <ArrowLeft size={14} /> Back to {backTo === "/admin" ? "staff accounts" : "the website"}
          </Link>
        </div>
      </main>
    </>
  );
}

export function AdminSignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(() => searchParams.get("passwordReset") === "success" ? "Password reset successfully. Sign in with your new password." : "");

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await signInAdmin({ email, password });
      const destination = ["admin", "manager", "accountant", "cashier"].includes(result.user?.role)
        ? `/${result.user.role}`
        : "/admin";
      navigate(destination, { replace: true });
    } catch (signInError) {
      setError(signInError.message || "Sign-in could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPage>
      <div className="auth-heading">
        <KeyRound size={20} />
        <h1>Staff sign in</h1>
        <p>Sign in to access the Addis Hiwot staff portal.</p>
      </div>
      <form className="account-form" onSubmit={submit}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            maxLength={128}
          />
        </label>
        <div className="auth-forgot-link"><Link to="/forgot-password">Forgot password?</Link></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {notice && <div className="staff-notice" role="status">{notice}</div>}
    </AuthPage>
  );
}

export default AdminSignInPage;

export function AccountSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAdminSession()
      .then((result) => {
        if (!cancelled) {
          setEmail(result.user.email);
          setAuthenticated(true);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          if (loadError.status === 401) {
            setAuthRequired(true);
          } else {
            setError(loadError.message || "Account details could not be loaded.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const result = await changeAdminPassword({ currentPassword, newPassword });
      setNotice(result.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (saveError) {
      setError(saveError.message || "The password could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthPage backTo="/admin">
      <div className="auth-heading">
        <KeyRound size={20} />
        <h1>Change password</h1>
        {email && <p>{email}</p>}
      </div>
      {loading ? (
        <p className="auth-message">Loading account…</p>
      ) : authRequired ? (
        <div className="auth-message">
          <p>Sign in to manage your password.</p>
          <Link className="button-primary auth-submit" to="/sign-in">Staff sign in</Link>
        </div>
      ) : !authenticated ? (
        <div className="auth-message" role="alert">{error}</div>
      ) : (
        <form className="account-form" onSubmit={submit}>
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          {notice && <div className="staff-notice" role="status">{notice}</div>}
          <button className="button-primary auth-submit" type="submit" disabled={saving}>
            {saving ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </AuthPage>
  );
}
