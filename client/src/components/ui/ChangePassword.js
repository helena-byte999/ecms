import React, { useState } from "react";
import axios from "axios";
import { Card, CardBody, FormGroup, Input, Button } from "reactstrap";
import { authenticate } from "data/api";

// "Change your password" card for every role's profile page
function ChangePassword() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (form.next.length < 8) return setMsg(["bad", "New password must be at least 8 characters."]);
    if (form.next !== form.confirm) return setMsg(["bad", "The new passwords don't match."]);
    setBusy(true);
    try {
      const { data } = await axios.post(authenticate.changePassword, {
        current_password: form.current,
        new_password: form.next,
      });
      if (data.status) {
        setMsg(["ok", "Password changed. Use your new password next time you sign in."]);
        setForm({ current: "", next: "", confirm: "" });
      } else {
        setMsg(["bad", data.msg || "Couldn't change your password."]);
      }
    } catch (err) {
      setMsg(["bad", err.response?.data?.msg || "Couldn't reach the server."]);
    }
    setBusy(false);
  }

  const field = (key, label, autoComplete) => (
    <FormGroup>
      <label htmlFor={`pw-${key}`}>{label}</label>
      <Input
        id={`pw-${key}`}
        type="password"
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required
      />
    </FormGroup>
  );

  return (
    <Card className="ecms-password">
      <CardBody>
        <h3>Change password</h3>
        <form onSubmit={submit}>
          {field("current", "Current password", "current-password")}
          {field("next", "New password (at least 8 characters)", "new-password")}
          {field("confirm", "Confirm new password", "new-password")}
          {msg && (
            <p className={"ecms-formmsg ecms-formmsg--" + msg[0]} role="status">
              {msg[1]}
            </p>
          )}
          <Button color="primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

export default ChangePassword;
