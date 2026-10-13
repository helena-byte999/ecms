import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Modal from "react-modal";
import { FiPlus } from "react-icons/fi";
import { user as userApi } from "data/api";
import { useAuth } from "contexts/AuthContext";
import { PersonCell } from "components/ui/ListUI.js";
import AccountStatusButton from "components/ui/AccountStatusButton.js";
import { Pill } from "components/care/CareTimeline.js";
import { fullName } from "components/care/labels.js";
import "components/care/care.css";

const modalStyle = {
  overlay: { zIndex: 1100, background: "rgba(15, 23, 42, 0.45)" },
  content: { top: "50%", left: "50%", right: "auto", bottom: "auto", transform: "translate(-50%, -50%)", maxHeight: "92vh", maxWidth: "calc(100vw - 24px)", overflowY: "auto", borderRadius: 16, padding: 24 },
};

const FIELDS = {
  admin: [["first_name", "First name"], ["last_name", "Last name"], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["dob", "Date of birth", "date"], ["address", "Address"], ["password", "Temporary password", "password"]],
  family: [["first_name", "First name"], ["last_name", "Last name"], ["relationship", "Relationship (e.g. Daughter)"], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["password", "Temporary password", "password"]],
};

// Create an admin or a family member (linked to `residentId`)
export function AddPersonDialog({ open, onClose, role, residentId, title, intro, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setForm({});
      setError("");
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    if (String(form.password || "").length < 8) return setError("The temporary password must be at least 8 characters.");
    setBusy(true);
    setError("");
    try {
      const res = await axios.post(userApi.addUser, { ...form, role, resident: residentId });
      if (res.data.status === false) setError(res.data.msg || "Couldn't create the account.");
      else {
        onSaved(res.data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't reach the server.");
    }
    setBusy(false);
  }

  return (
    <Modal isOpen={open} onRequestClose={() => !busy && onClose()} contentLabel={title} style={modalStyle}>
      <form className="care-dialog" onSubmit={submit}>
        <h4>{title}</h4>
        <p>{intro}</p>
        <div className="care-form">
          <div className="care-form__row">
            {FIELDS[role].map(([key, label, type = "text"]) => (
              <div key={key} style={key === "address" || key === "relationship" ? { gridColumn: "1 / -1" } : undefined}>
                <label htmlFor={`p-${key}`}>{label}</label>
                <input
                  id={`p-${key}`}
                  type={type}
                  autoComplete={type === "password" ? "new-password" : "off"}
                  required={key !== "relationship"}
                  value={form[key] || ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {error && <div className="care-error" role="alert">{error}</div>}
          <div className="care-dialog__foot">
            <button type="button" className="care-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="care-btn care-btn--primary" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// A list of accounts with deactivate / reactivate. `me` gets a "You" label instead.
export function PeopleTable({ people, meId, extra, onChanged, onError, empty }) {
  if (!people) return <p className="care-empty">Loading…</p>;
  if (!people.length) return <p className="care-empty">{empty}</p>;
  return (
    <div className="care-scroll">
      <table className="care-meds">
        <thead>
          <tr>
            <th>Name</th>
            {extra && <th>{extra.label}</th>}
            <th>Phone</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p._id}>
              <td><PersonCell name={fullName(p)} email={p.email} /></td>
              {extra && <td>{extra.value(p) || "–"}</td>}
              <td>{p.phone || "–"}</td>
              <td>
                <Pill tone={p.status === "in-active" ? "bad" : "ok"}>{p.status === "in-active" ? "Deactivated" : "Active"}</Pill>
              </td>
              <td className="care-num">
                {p._id === meId ? (
                  <Pill tone="neutral" plain>You</Pill>
                ) : (
                  <AccountStatusButton person={p} onChanged={onChanged} onError={onError} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Family members linked to a resident, shown on the resident's record (admin)
export function FamilyMembers({ resident }) {
  const [family, setFamily] = useState(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => {
    axios.get(`${userApi.family}/${resident._id}`).then((r) => setFamily(r.data.data)).catch(() => setFamily([]));
  }, [resident._id]);
  useEffect(load, [load]);

  return (
    <div className="care-card" style={{ marginTop: 16 }}>
      <div className="care-card__head">
        <h3>Family members</h3>
        <button type="button" className="care-btn care-btn--primary care-btn--sm" onClick={() => setOpen(true)}>
          <FiPlus aria-hidden="true" /> Add family member
        </button>
      </div>
      <div className="care-card__body">
        <p className="care-muted" style={{ marginBottom: 12, fontSize: 13.5 }}>
          Each family member has their own read-only login to {resident.first_name}'s care log, medicines, contract and invoices.
        </p>
        {msg && <p className={msg.ok ? "care-muted" : "care-error"} role="status">{msg.text}</p>}
        <PeopleTable
          people={family}
          extra={{ label: "Relationship", value: (p) => p.relationship }}
          empty={`No family members linked to ${resident.first_name} yet.`}
          onChanged={(u) => {
            setFamily((list) => list.map((p) => (p._id === u._id ? u : p)));
            setMsg({ ok: true, text: `${fullName(u)} ${u.status === "in-active" ? "can no longer sign in" : "can sign in again"}.` });
          }}
          onError={(text) => setMsg({ ok: false, text })}
        />
      </div>
      <AddPersonDialog
        open={open}
        onClose={() => setOpen(false)}
        role="family"
        residentId={resident._id}
        title={`Add a family member for ${resident.first_name}`}
        intro="They'll sign in with this email and temporary password, and can change the password from their profile."
        onSaved={(u) => {
          load();
          setMsg({ ok: true, text: `${fullName(u)} can now sign in with ${u.email}.` });
        }}
      />
    </div>
  );
}

// Admins (Team page)
export function TeamAdmins() {
  const { userDetail } = useAuth();
  const [admins, setAdmins] = useState(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => {
    axios.get(`${userApi.showUsers}/admin`).then((r) => setAdmins(r.data.data)).catch(() => setAdmins([]));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="content">
      <div className="care-card">
        <div className="care-card__head">
          <h2>Team admins</h2>
          <button type="button" className="care-btn care-btn--primary" onClick={() => setOpen(true)}>
            <FiPlus aria-hidden="true" /> Add admin
          </button>
        </div>
        <div className="care-card__body">
          <p className="care-muted" style={{ marginBottom: 12, fontSize: 13.5 }}>
            Admins manage people, contracts, rotas, invoices and care records. There must always be at least one active admin, and you can't deactivate yourself.
          </p>
          {msg && <p className={msg.ok ? "care-muted" : "care-error"} role="status">{msg.text}</p>}
          <PeopleTable
            people={admins}
            meId={userDetail._id}
            empty="No admins found."
            onChanged={(u) => {
              setAdmins((list) => list.map((p) => (p._id === u._id ? u : p)));
              setMsg({ ok: true, text: `${fullName(u)} ${u.status === "in-active" ? "has been deactivated" : "is active again"}.` });
            }}
            onError={(text) => setMsg({ ok: false, text })}
          />
        </div>
      </div>
      <AddPersonDialog
        open={open}
        onClose={() => setOpen(false)}
        role="admin"
        title="Add an admin"
        intro="They'll have full access. Share the temporary password with them privately; they can change it from their profile."
        onSaved={(u) => {
          load();
          setMsg({ ok: true, text: `${fullName(u)} can now sign in as an admin.` });
        }}
      />
    </div>
  );
}
