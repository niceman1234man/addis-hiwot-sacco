import { useCallback, useEffect, useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import {
  Download,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  archiveAdminUser,
  exportAdminUsersCsv,
  getAdminSession,
  getAdminUsers,
  inviteAdminUser,
  restoreAdminUser,
  updateAdminUser,
} from "../lib/api.js";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function AccountDialog({ account, onClose, onSave }) {
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [role, setRole] = useState(account?.role ?? "staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ name: name.trim(), email: email.trim(), role });
    } catch (saveError) {
      setError(saveError.message || "The account could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">{account ? "Account details" : "Staff invitation"}</span>
            <h2 id="account-dialog-title">{account ? "Edit account" : "Invite a colleague"}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>
        <form className="account-form" onSubmit={submit}>
          <label>
            Full name
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoFocus />
          </label>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              readOnly={Boolean(account)}
            />
          </label>
          <label>
            Account role
            <select value={role} onChange={(event) => setRole(event.target.value)} required>
              <option value="staff">Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          {!account && (
            <p className="dialog-note">
              <Mail size={15} />
              They’ll receive a secure Clerk invitation to create their password.
            </p>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="dialog-actions">
            <button className="button-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : account ? "Save changes" : "Send invitation"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function StaffHeader({ user, isSignedIn, onSignOut }) {
  return (
    <header className="staff-header">
      <Link to="/" className="staff-brand">
        <span className="staff-brand-mark" aria-hidden="true">A</span>
        <span><strong>Addis Hiwot SACCO</strong><small>Administration</small></span>
      </Link>
      {isSignedIn ? (
        <div className="staff-user-menu">
          <span className="staff-user-email">{user?.emailAddresses?.[0]?.emailAddress || "Staff account"}</span>
          <Link className="account-security-link" to="/account"><KeyRound size={14} /> Account security</Link>
          <button className="sign-out-button" type="button" onClick={onSignOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      ) : (
        <Link className="account-security-link" to="/sign-in">Staff sign in</Link>
      )}
    </header>
  );
}

function AdminPage() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogAccount, setDialogAccount] = useState(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  const reload = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    if (!isSignedIn) {
      setLoading(false);
      setSession(null);
      setAccounts([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const sessionResponse = await getAdminSession();
        if (cancelled) return;
        setSession(sessionResponse.user);
        if (sessionResponse.user.role !== "admin") {
          setAccounts([]);
          return;
        }
        const userResponse = await getAdminUsers();
        if (!cancelled) setAccounts(userResponse.users || []);
      } catch (loadError) {
        if (!cancelled) {
          setSession(null);
          setAccounts([]);
          setError(loadError.message || "Staff accounts could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, refreshKey]);

  const visibleAccounts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (!showArchived && account.status === "archived") return false;
      if (statusFilter !== "all" && account.status !== statusFilter) return false;
      if (!normalizedSearch) return true;
      return `${account.name} ${account.email} ${account.role}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [accounts, search, showArchived, statusFilter]);

  const counts = useMemo(() => ({
    total: accounts.length,
    active: accounts.filter((account) => account.status === "active").length,
    invited: accounts.filter((account) => account.status === "invited").length,
    archived: accounts.filter((account) => account.status === "archived").length,
  }), [accounts]);

  async function saveAccount(values) {
    if (dialogAccount) {
      await updateAdminUser(dialogAccount.id, { name: values.name, role: values.role });
      setNotice("Account details updated.");
    } else {
      const result = await inviteAdminUser(values);
      setNotice(result.message || "Invitation sent.");
    }
    setDialogAccount(undefined);
    reload();
  }

  async function archiveAccount(account) {
    const confirmed = window.confirm(
      `Archive ${account.name}? Their sign-in will be disabled. The account record is kept and can be restored later.`,
    );
    if (!confirmed) return;
    setError("");
    setNotice("");
    try {
      const result = await archiveAdminUser(account.id);
      setNotice(result.message || "Account archived.");
      reload();
    } catch (archiveError) {
      setError(archiveError.message || "The account could not be archived.");
    }
  }

  async function restoreAccount(account) {
    setError("");
    setNotice("");
    try {
      const result = await restoreAdminUser(account.id);
      setNotice(result.message || "Account restored.");
      reload();
    } catch (restoreError) {
      setError(restoreError.message || "The account could not be restored.");
    }
  }

  async function exportAccounts() {
    setExporting(true);
    setError("");
    try {
      await exportAdminUsersCsv();
    } catch (exportError) {
      setError(exportError.message || "The report could not be exported.");
    } finally {
      setExporting(false);
    }
  }

  async function handleSignOut() {
    await signOut({ redirectUrl: "/" });
    navigate("/");
  }

  return (
    <div className="staff-shell">
      <StaffHeader user={clerkUser} isSignedIn={isSignedIn} onSignOut={handleSignOut} />
      <main className="staff-main">
        {!isLoaded || loading ? (
          <section className="staff-state-panel" aria-live="polite">
            <span className="staff-loader" />
            <h1>Checking your staff access…</h1>
          </section>
        ) : !isSignedIn ? (
          <section className="staff-state-panel">
            <span className="staff-state-icon"><ShieldCheck size={22} /></span>
            <span className="eyebrow">Staff portal</span>
            <h1>Sign in to manage staff accounts.</h1>
            <p>Only invited Addis Hiwot staff can access account management.</p>
            <Link className="button-primary" to="/sign-in">Staff sign in</Link>
          </section>
        ) : error ? (
          <section className="staff-state-panel staff-error-panel" aria-live="polite">
            <span className="eyebrow">Staff portal</span>
            <h1>Account management is unavailable.</h1>
            <p>{error}</p>
            <p className="staff-setup-hint">The staff directory requires a connected database and an active administrator account.</p>
            <button className="button-primary" type="button" onClick={reload}>
              <RefreshCw size={15} /> Try again
            </button>
          </section>
        ) : session?.role !== "admin" ? (
          <section className="staff-state-panel">
            <span className="staff-state-icon"><ShieldCheck size={22} /></span>
            <span className="eyebrow">Staff portal</span>
            <h1>Administrator access required.</h1>
            <p>Your account is signed in, but only administrators can manage staff accounts.</p>
            <Link className="account-security-link" to="/account"><KeyRound size={14} /> Manage password and account security</Link>
          </section>
        ) : (
          <>
            <div className="staff-page-heading">
              <div>
                <span className="eyebrow">Addis Hiwot SACCO · Staff administration</span>
                <h1>Staff accounts</h1>
                <p>Invite colleagues, manage access, and export a staff directory report.</p>
              </div>
              <div className="staff-page-actions">
                <button className="button-secondary" type="button" onClick={exportAccounts} disabled={exporting}>
                  <Download size={16} /> {exporting ? "Preparing…" : "Export report"}
                </button>
                <button className="button-primary" type="button" onClick={() => setDialogAccount(null)}>
                  <Plus size={16} /> Invite staff
                </button>
              </div>
            </div>

            {notice && <div className="staff-notice" role="status">{notice}</div>}
            {error && <div className="form-error" role="alert">{error}</div>}

            <section className="staff-metrics" aria-label="Staff account totals">
              <article className="staff-metric">
                <span className="metric-icon"><UsersRound size={18} /></span>
                <span><small>Total accounts</small><strong>{counts.total}</strong></span>
              </article>
              <article className="staff-metric">
                <span className="metric-icon metric-green"><ShieldCheck size={18} /></span>
                <span><small>Active</small><strong>{counts.active}</strong></span>
              </article>
              <article className="staff-metric">
                <span className="metric-icon metric-gold"><Mail size={18} /></span>
                <span><small>Invited</small><strong>{counts.invited}</strong></span>
              </article>
              <article className="staff-metric">
                <span className="metric-icon metric-muted"><UsersRound size={18} /></span>
                <span><small>Archived</small><strong>{counts.archived}</strong></span>
              </article>
            </section>

            <section className="staff-directory">
              <div className="directory-toolbar">
                <div>
                  <h2>Staff directory</h2>
                  <p>Reports include all account statuses. Passwords and credentials are never exported.</p>
                </div>
                <div className="directory-filters">
                  <label className="staff-search">
                    <Search size={16} />
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search name, email, or role"
                    />
                  </label>
                  <select
                    aria-label="Filter by account status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="archived">Archived</option>
                  </select>
                  <label className="archived-toggle">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(event) => setShowArchived(event.target.checked)}
                    />
                    Include archived
                  </label>
                </div>
              </div>

              <div className="staff-table-wrap">
                <table className="staff-table">
                  <thead>
                    <tr><th scope="col">Account</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Actions</th></tr>
                  </thead>
                  <tbody>
                    {visibleAccounts.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <div className="account-identity">
                            <span className="account-avatar">{initials(account.name)}</span>
                            <span><strong>{account.name}</strong><small>{account.email}</small></span>
                          </div>
                        </td>
                        <td><span className={`role-label role-${account.role}`}>{account.role === "admin" ? "Administrator" : "Staff"}</span></td>
                        <td><span className={`account-status status-${account.status}`}>{account.status}</span></td>
                        <td>{formatDate(account.createdAt)}</td>
                        <td>
                          <div className="account-actions">
                            {account.status !== "archived" && (
                              <button className="table-action" type="button" onClick={() => setDialogAccount(account)} aria-label={`Edit ${account.name}`}>
                                <Pencil size={14} /> Edit
                              </button>
                            )}
                            {account.status === "archived" ? (
                              <button className="table-action restore-action" type="button" onClick={() => restoreAccount(account)}>Restore</button>
                            ) : (
                              <button
                                className="table-action archive-action"
                                type="button"
                                onClick={() => archiveAccount(account)}
                                disabled={account.id === session.id}
                                title={account.id === session.id ? "You cannot archive your own account." : "Archive account"}
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visibleAccounts.length && (
                      <tr><td className="empty-directory" colSpan="5">No accounts match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="directory-footer">
                <span>Showing {visibleAccounts.length} of {accounts.length} account{accounts.length === 1 ? "" : "s"}</span>
                <button className="text-button" type="button" onClick={reload} disabled={loading}>
                  <RefreshCw size={13} /> Refresh directory
                </button>
              </div>
            </section>
          </>
        )}
      </main>
      {dialogAccount !== undefined && (
        <AccountDialog
          key={dialogAccount?.id || "new-staff-invitation"}
          account={dialogAccount}
          onClose={() => setDialogAccount(undefined)}
          onSave={saveAccount}
        />
      )}
    </div>
  );
}

export default AdminPage;
