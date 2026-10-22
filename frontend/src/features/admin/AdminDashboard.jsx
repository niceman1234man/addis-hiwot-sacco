import { useCallback, useEffect, useMemo, useState } from "react";
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
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  archiveAdminUser,
  createAdminUser,
  exportAdminUsersCsv,
  getAdminUsers,
  restoreAdminUser,
  updateAdminUser,
} from "../../api/usersApi.js";
import {
  deleteAdminMember,
  exportAdminMembersCsv,
  getAdminMembers,
  getAdminMemberDocument,
  updateAdminMember,
} from "../../api/membersApi.js";
import { getAdminSession, signOutAdmin } from "../../api/authApi.js";

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
  const [role, setRole] = useState(account?.role ?? "cashier");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        email: email.trim(),
        role,
        password,
      });
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
            <span className="eyebrow">{account ? "Account details" : "New staff account"}</span>
            <h2 id="account-dialog-title">{account ? "Edit account" : "Register a colleague"}</h2>
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
              <option value="admin">Administrator</option>
              <option value="manager">Manager</option>
              <option value="accountant">Accountant</option>
              <option value="cashier">Cashier</option>
              {account?.role === "staff" && <option value="staff">Staff (legacy)</option>}
            </select>
          </label>
          <label>
            {account ? "Set a new password (optional)" : "Initial password"}
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={!account}
              minLength={12}
              maxLength={128}
            />
          </label>
          <p className="dialog-note">
            <KeyRound size={15} />
            {account
              ? "Leave blank to keep the current password. New passwords need at least 12 characters."
              : "Set an initial password; the account holder can change it after signing in."}
          </p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="dialog-actions">
            <button className="button-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : account ? "Save changes" : "Create account"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MemberDialog({ member, onClose, onSave, onViewDocument }) {
  const [values, setValues] = useState({
    firstName: member.firstName ?? "",
    middleName: member.middleName ?? "",
    lastName: member.lastName ?? "",
    gender: member.gender ?? "prefer_not_to_say",
    phoneNumber1: member.phoneNumber1 ?? "",
    phoneNumber2: member.phoneNumber2 ?? "",
    email: member.email ?? "",
    currentCityRegion: member.addressInformation?.currentCityRegion ?? "",
    subCityZone: member.addressInformation?.subCityZone ?? "",
    woreda: member.addressInformation?.woreda ?? "",
    status: member.status ?? "pending",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [openingDocument, setOpeningDocument] = useState("");
  const setField = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  async function viewDocument(documentType) {
    setDocumentError("");
    setOpeningDocument(documentType);
    try {
      await onViewDocument(member.id, documentType);
    } catch (viewError) {
      setDocumentError(viewError.message || "The document could not be opened.");
    } finally {
      setOpeningDocument("");
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(member.id, {
        firstName: values.firstName,
        middleName: values.middleName,
        lastName: values.lastName,
        gender: values.gender,
        phoneNumber1: values.phoneNumber1,
        phoneNumber2: values.phoneNumber2,
        email: values.email,
        status: values.status,
        addressInformation: {
          currentCityRegion: values.currentCityRegion,
          subCityZone: values.subCityZone,
          woreda: values.woreda,
        },
      });
      onClose();
    } catch (saveError) {
      setError(saveError.message || "The member could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="account-dialog member-dialog" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
        <div className="dialog-heading">
          <div><span className="eyebrow">Member application</span><h2 id="member-dialog-title">View and update member</h2></div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose} disabled={saving}><X size={18} /></button>
        </div>
        <form className="account-form member-form" onSubmit={submit}>
          <div className="member-form-grid">
            <label>First name<input value={values.firstName} onChange={setField("firstName")} required maxLength={80} /></label>
            <label>Middle name<input value={values.middleName} onChange={setField("middleName")} maxLength={80} /></label>
            <label>Last name<input value={values.lastName} onChange={setField("lastName")} required maxLength={80} /></label>
            <label>Gender<select value={values.gender} onChange={setField("gender")}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
            <label>Primary phone<input value={values.phoneNumber1} onChange={setField("phoneNumber1")} required maxLength={32} /></label>
            <label>Secondary phone<input value={values.phoneNumber2} onChange={setField("phoneNumber2")} maxLength={32} /></label>
            <label>Email<input type="email" value={values.email} onChange={setField("email")} maxLength={254} /></label>
            <label>Application status<select value={values.status} onChange={setField("status")}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
            <label>City / region<input value={values.currentCityRegion} onChange={setField("currentCityRegion")} required maxLength={100} /></label>
            <label>Sub-city / zone<input value={values.subCityZone} onChange={setField("subCityZone")} required maxLength={100} /></label>
            <label>Woreda<input value={values.woreda} onChange={setField("woreda")} required maxLength={100} /></label>
          </div>
          <section className="member-documents" aria-label="Member documents">
            <h3>Submitted documents</h3>
            <div className="member-document-actions">
              {[["nationalIdFront", "National ID front"], ["nationalIdBack", "National ID back"], ["personalPhoto", "Photo"], ["signature", "Signature"]].map(([type, label]) => (
                <button className="button-secondary" key={type} type="button" disabled={!member.documents?.[type] || Boolean(openingDocument)} onClick={() => viewDocument(type)}>
                  {openingDocument === type ? "Opening…" : member.documents?.[type] ? `View ${label}` : `${label} unavailable`}
                </button>
              ))}
            </div>
            <p className="member-document-summary">Documents are private and can only be viewed by an administrator.</p>
            {documentError && <div className="form-error" role="alert">{documentError}</div>}
          </section>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="dialog-actions">
            <button className="button-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save member"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MembersPanel({ members, loading, onReload, onExport, onSave, onDelete, onViewDocument }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return members.filter((member) => {
      if (statusFilter !== "all" && member.status !== statusFilter) return false;
      const address = member.addressInformation ?? {};
      return !query || `${member.firstName} ${member.middleName} ${member.lastName} ${member.phoneNumber1} ${member.email} ${address.currentCityRegion}`.toLowerCase().includes(query);
    });
  }, [members, search, statusFilter]);
  const counts = useMemo(() => ({
    total: members.length,
    pending: members.filter((member) => member.status === "pending").length,
    approved: members.filter((member) => member.status === "approved").length,
    rejected: members.filter((member) => member.status === "rejected").length,
  }), [members]);

  async function saveMember(id, changes) {
    setError("");
    try {
      const result = await onSave(id, changes);
      setNotice(result.message || "Member updated.");
    } catch (saveError) {
      setError(saveError.message || "The member could not be updated.");
      throw saveError;
    }
  }

  async function removeMember(member) {
    if (!window.confirm(`Permanently delete ${member.firstName} ${member.lastName} and all associated documents? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      const result = await onDelete(member.id);
      setNotice(result.message || "Member deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "The member could not be deleted.");
    }
  }

  async function exportReport() {
    setExporting(true);
    setError("");
    try {
      await onExport();
    } catch (exportError) {
      setError(exportError.message || "The member report could not be exported.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="staff-page-heading">
        <div><span className="eyebrow">Addis Hiwot SACCO · member administration</span><h1>Members</h1><p>Review applications, update member details and status, or export a report.</p></div>
        <div className="staff-page-actions"><button className="button-secondary" type="button" onClick={exportReport} disabled={exporting}><Download size={16} />{exporting ? "Preparing…" : "Export member report"}</button></div>
      </div>
      {notice && <div className="staff-notice" role="status">{notice}</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <section className="staff-metrics" aria-label="Member application totals">
        {[ ["Total members", counts.total, ""], ["Pending", counts.pending, "metric-gold"], ["Approved", counts.approved, "metric-green"], ["Rejected", counts.rejected, "metric-muted"] ].map(([label, value, tone]) => <article className="staff-metric" key={label}><span className={`metric-icon ${tone}`}><UsersRound size={18} /></span><span><small>{label}</small><strong>{value}</strong></span></article>)}
      </section>
      <section className="staff-directory">
        <div className="directory-toolbar"><div><h2>Member directory</h2><p>Reports include member contact details, application status, and location; identity documents are not exported.</p></div>
          <div className="directory-filters"><label className="staff-search"><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, email" /></label><select aria-label="Filter by application status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
        </div>
        <div className="staff-table-wrap"><table className="staff-table member-table"><thead><tr><th scope="col">Member</th><th scope="col">Contact</th><th scope="col">Location</th><th scope="col">Status</th><th scope="col">Applied</th><th scope="col">Actions</th></tr></thead><tbody>
          {visibleMembers.map((member) => <tr key={member.id}><td><div className="account-identity"><span className="account-avatar">{initials(`${member.firstName} ${member.lastName}`)}</span><span><strong>{member.firstName} {member.middleName} {member.lastName}</strong><small>{member.gender.replaceAll("_", " ")}</small></span></div></td><td>{member.phoneNumber1}<small className="member-email">{member.email || "No email"}</small></td><td>{member.addressInformation?.currentCityRegion}<small className="member-email">{member.addressInformation?.subCityZone}, {member.addressInformation?.woreda}</small></td><td><span className={`account-status status-${member.status}`}>{member.status}</span></td><td>{formatDate(member.createdAt)}</td><td><div className="account-actions"><button className="table-action" type="button" onClick={() => setMemberToEdit(member)}><Pencil size={14} />View / edit</button><button className="table-action archive-action" type="button" onClick={() => removeMember(member)} aria-label={`Delete ${member.firstName} ${member.lastName}`}><Trash2 size={14} />Delete</button></div></td></tr>)}
          {!visibleMembers.length && <tr><td className="empty-directory" colSpan="6">{loading ? "Loading members…" : "No members match these filters."}</td></tr>}
        </tbody></table></div>
        <div className="directory-footer"><span>Showing {visibleMembers.length} of {members.length} member{members.length === 1 ? "" : "s"}</span><button className="text-button" type="button" onClick={onReload} disabled={loading}><RefreshCw size={13} />Refresh members</button></div>
      </section>
      {memberToEdit && <MemberDialog key={memberToEdit.id} member={memberToEdit} onClose={() => setMemberToEdit(null)} onSave={saveMember} onViewDocument={onViewDocument} />}
    </>
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
          <span className="staff-user-email">{user?.email || "Staff account"}</span>
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
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [members, setMembers] = useState([]);
  const [adminView, setAdminView] = useState("accounts");
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
        const memberResponse = await getAdminMembers();
        if (!cancelled) {
          setAccounts(userResponse.users || []);
          setMembers(memberResponse.members || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setSession(null);
          setAccounts([]);
          setMembers([]);
          if (loadError.status !== 401) {
            setError(loadError.message || "Staff accounts could not be loaded.");
          }
        }
      } finally {
        if (!cancelled) {
          setAuthLoaded(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

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
      await updateAdminUser(dialogAccount.id, {
        name: values.name,
        role: values.role,
        password: values.password || undefined,
      });
      setNotice(values.password ? "Account details and password updated." : "Account details updated.");
    } else {
      const result = await createAdminUser(values);
      setNotice(result.message || "Account created.");
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

  async function saveMember(id, changes) {
    const result = await updateAdminMember(id, changes);
    setMembers((current) => current.map((member) => member.id === id ? result.member : member));
    return result;
  }

  async function removeMember(id) {
    const result = await deleteAdminMember(id);
    setMembers((current) => current.filter((member) => member.id !== id));
    return result;
  }

  async function viewMemberDocument(id, documentType) {
    const viewer = window.open("about:blank", "_blank");
    if (!viewer) {
      throw new Error("Allow pop-ups for this site to view the document.");
    }
    viewer.opener = null;
    try {
      const blob = await getAdminMemberDocument(id, documentType);
      const objectUrl = URL.createObjectURL(blob);
      viewer.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      viewer.close();
      throw error;
    }
  }

  async function handleSignOut() {
    try {
      await signOutAdmin();
      setSession(null);
      setAccounts([]);
      setMembers([]);
      navigate("/sign-in");
    } catch (signOutError) {
      setError(signOutError.message || "Sign-out could not be completed.");
    }
  }

  return (
    <div className="staff-shell">
      <StaffHeader user={session} isSignedIn={Boolean(session)} onSignOut={handleSignOut} />
      <main className="staff-main">
        {!authLoaded || loading ? (
          <section className="staff-state-panel" aria-live="polite">
            <span className="staff-loader" />
            <h1>Checking your staff access…</h1>
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
        ) : !session ? (
          <section className="staff-state-panel">
            <span className="staff-state-icon"><ShieldCheck size={22} /></span>
            <span className="eyebrow">Staff portal</span>
            <h1>Sign in to manage staff accounts.</h1>
            <p>Only registered Addis Hiwot staff can access account management.</p>
            <Link className="button-primary" to="/sign-in">Staff sign in</Link>
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
            <nav className="admin-tabs" aria-label="Administration sections">
              <button type="button" className={adminView === "accounts" ? "admin-tab active" : "admin-tab"} onClick={() => setAdminView("accounts")}>Staff accounts</button>
              <button type="button" className={adminView === "members" ? "admin-tab active" : "admin-tab"} onClick={() => setAdminView("members")}>Members <span>{members.length}</span></button>
            </nav>
            {adminView === "members" ? (
              <MembersPanel
                members={members}
                loading={loading}
                onReload={reload}
                onSave={saveMember}
                onDelete={removeMember}
                onViewDocument={viewMemberDocument}
                onExport={exportAdminMembersCsv}
              />
            ) : (
            <>
            <div className="staff-page-heading">
              <div>
                <span className="eyebrow">Addis Hiwot SACCO · Staff administration</span>
                <h1>Staff accounts</h1>
                <p>Register colleagues, manage access, and export a staff directory report.</p>
              </div>
              <div className="staff-page-actions">
                <button className="button-secondary" type="button" onClick={exportAccounts} disabled={exporting}>
                  <Download size={16} /> {exporting ? "Preparing…" : "Export report"}
                </button>
                <button className="button-primary" type="button" onClick={() => setDialogAccount(null)}>
                  <Plus size={16} /> Register staff
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
                        <td><span className={`role-label role-${account.role}`}>{({ admin: "Administrator", manager: "Manager", accountant: "Accountant", cashier: "Cashier", staff: "Staff (legacy)" })[account.role] || account.role}</span></td>
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
