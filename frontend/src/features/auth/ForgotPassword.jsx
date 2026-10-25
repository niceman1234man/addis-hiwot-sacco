import { useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PublicHeader from "../../components/layout/PublicHeader.jsx";
import { requestAdminPasswordReset, resetAdminPassword } from "../../api/authApi.js";
import logo from "../../assets/logo.jpg";

function RecoveryLayout({ children }) {
  return <>
    <PublicHeader />
    <main className="auth-page">
      <div className="auth-content">
        <Link className="auth-brand" to="/" aria-label="Addis Hiwot SACCO home">
          <img src={logo} alt="" />
          <span><strong>Addis Hiwot SACCO</strong><small>Staff portal</small></span>
        </Link>
        <div className="auth-card">{children}</div>
        <Link className="auth-back-link" to="/sign-in"><ArrowLeft size={14} /> Back to staff sign in</Link>
      </div>
    </main>
  </>;
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const result = await requestAdminPasswordReset(email.trim());
      setNotice(result.message || "If an active staff account matches that email, a password reset link will be sent shortly.");
    } catch (requestError) {
      setError(requestError.message || "The recovery request could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <RecoveryLayout>
    <div className="auth-heading">
      <KeyRound size={20} />
      <h1>Password recovery</h1>
      <p>Enter the email address for your Addis Hiwot staff account. If it is active, we’ll send a secure reset link.</p>
    </div>
    <form className="account-form" onSubmit={submit}>
      <label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      {notice && <div className="staff-notice" role="status">{notice}</div>}
      <button className="button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send reset link"}</button>
    </form>
  </RecoveryLayout>;
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetAdminPassword({ token, newPassword });
      navigate("/sign-in?passwordReset=success", { replace: true });
    } catch (resetError) {
      setError(resetError.message || "This reset link is invalid or expired. Request a new one.");
    } finally {
      setSubmitting(false);
    }
  }

  return <RecoveryLayout>
    <div className="auth-heading">
      <KeyRound size={20} />
      <h1>Set a new password</h1>
      <p>Choose a password between 12 and 128 characters.</p>
    </div>
    {!token ? <div className="auth-message" role="alert">This password reset link is missing or invalid. <Link to="/forgot-password">Request another link</Link>.</div> : <form className="account-form" onSubmit={submit}>
      <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={12} maxLength={128} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} maxLength={128} /></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? "Updating…" : "Reset password"}</button>
    </form>}
  </RecoveryLayout>;
}
