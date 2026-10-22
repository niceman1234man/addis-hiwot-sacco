export default function Loader({ label = "Loading…" }) {
  return <div className="staff-state-panel" role="status" aria-live="polite"><span className="staff-loader" /><span>{label}</span></div>;
}