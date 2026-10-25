import { useState } from "react";

export default function FinanceForm({ title, description, fields, submitLabel = "Submit", onSubmit, warning = "Financial actions are not enabled until backend posting is implemented." }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? ""])));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleFieldChange(field, value) {
  const dependentValues = field.onChange?.(value, values) || {};
  setValues((current) => ({ ...current, [field.name]: value, ...dependentValues }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await onSubmit(values);
      setMessage(result?.message || "Request completed.");
    } catch (submitError) {
      setError(submitError.message || "This request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-heading">
        <div><p className="workspace-kicker">SACCO operations</p><h1>{title}</h1><p>{description}</p></div>
        <span className="workspace-status">Protected API</span>
      </div>
      <div className="workspace-warning" role="note">{warning}</div>
      <form className="workspace-form" onSubmit={submit}>
        <div className="workspace-fields">
          {fields.map((field) => (
            <label className={field.wide ? "workspace-field workspace-field-wide" : "workspace-field"} key={field.name}>
              <span>{field.label}{field.required && <b aria-hidden="true"> *</b>}</span>
              {field.type === "select" ? (
                <select value={values[field.name]} onChange={(event) => handleFieldChange(field, event.target.value)} required={field.required} disabled={field.disabled}>
                  <option value="" disabled>Select {field.label.toLowerCase()}</option>
                  {field.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea value={values[field.name]} onChange={(event) => setValue(field.name, event.target.value)} required={field.required} maxLength={field.maxLength ?? 500} rows={4} />
              ) : (
                <input type={field.type || "text"} value={values[field.name]} onChange={(event) => setValue(field.name, event.target.value)} required={field.required} min={field.min} max={field.max} step={field.step} maxLength={field.maxLength} placeholder={field.placeholder} />
              )}
              {field.help && <small>{field.help}</small>}
            </label>
          ))}
        </div>
        {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
        {message && <p className="workspace-feedback" role="status">{message}</p>}
        <div className="workspace-form-actions">
          <button className="button-primary" type="submit" disabled={busy}>{busy ? "Sending…" : submitLabel}</button>
          <span>Requests are validated by the server. Financial balances change only when the transaction is successfully posted.</span>
        </div>
      </form>
    </section>
  );
}
