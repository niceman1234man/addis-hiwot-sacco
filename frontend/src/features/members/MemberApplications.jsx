import { useCallback, useEffect, useState } from "react";
import { RefreshCw, UsersRound } from "lucide-react";
import { getAdminMembers } from "../../api/membersApi.js";
import Table from "../../components/common/Table.jsx";
import Loader from "../../components/common/Loader.jsx";

const columns = [
	{ key: "member", label: "Applicant", render: (member) => `${member.firstName} ${member.middleName || ""} ${member.lastName}`.trim() },
	{ key: "phoneNumber1", label: "Phone" },
	{ key: "email", label: "Email", render: (member) => member.email || "—" },
	{ key: "region", label: "Region", render: (member) => member.addressInformation?.currentCityRegion || "—" },
	{ key: "status", label: "Status", render: (member) => <span className={`account-status status-${member.status}`}>{member.status}</span> },
	{ key: "createdAt", label: "Applied", render: (member) => member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—" },
];

export default function MemberApplications() {
	const [members, setMembers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const load = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const response = await getAdminMembers();
			setMembers(response.members || []);
		} catch (loadError) {
			setError(loadError.message || "Member applications could not be loaded.");
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => { load(); }, [load]);

	return <section className="workspace-panel">
		<div className="workspace-panel-heading"><div><p className="workspace-kicker">Member services</p><h1>Member applications</h1><p>Review the current application register and statuses.</p></div><button className="button-secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</button></div>
		<div className="workspace-metrics workspace-metrics-compact"><article><span>Applications</span><strong>{members.length}</strong><small>Applications on record</small></article><article><span>Pending review</span><strong>{members.filter((member) => member.status === "pending").length}</strong><small>Awaiting an administrator</small></article><article><span>Approved</span><strong>{members.filter((member) => member.status === "approved").length}</strong><small>Approved applications</small></article></div>
		{error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
		{loading ? <Loader label="Loading member applications…" /> : members.length ? <Table columns={columns} rows={members} /> : <div className="workspace-empty"><UsersRound size={23} /><strong>No applications yet</strong><span>Submitted member applications will appear here.</span></div>}
	</section>;
}
