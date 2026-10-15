import { SignIn, SignUp, UserProfile } from "@clerk/react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

function AuthPage({ children, backTo = "/" }) {
  return (
    <main className="auth-page">
      <div className="auth-content">
        <Link className="auth-brand" to="/" aria-label="Addis Hiwot SACCO home">
          <img src="/favicon.svg" alt="" />
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
  );
}

export function AdminSignInPage() {
  return (
    <AuthPage>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/admin"
      />
    </AuthPage>
  );
}

export function AdminInvitationPage() {
  return (
    <AuthPage>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/admin"
      />
    </AuthPage>
  );
}

export function AccountSecurityPage() {
  return (
    <AuthPage backTo="/admin">
      <UserProfile routing="path" path="/account" />
    </AuthPage>
  );
}
