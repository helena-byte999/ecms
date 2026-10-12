import React, { useState } from "react";
import axios from "axios";
import Modal from "react-modal";
import { Button } from "reactstrap";
import { FiUserCheck, FiUserX } from "react-icons/fi";
import { user as userApi } from "data/api";
import { IconButton } from "components/ui/ListUI.js";

// Deactivate / reactivate an account. Nothing is deleted: a deactivated person
// keeps their records but can't sign in and is left off new rotas.
function AccountStatusButton({ person, onChanged, onError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = `${person.first_name} ${person.last_name}`;
  const deactivating = person.status !== "in-active";

  async function confirm() {
    setBusy(true);
    try {
      const res = await axios.patch(`${userApi.setStatus}/${person._id}`, {
        status: deactivating ? "in-active" : "active",
      });
      if (res.data.status) {
        onChanged(res.data.data);
        setOpen(false);
      } else {
        onError(res.data.msg || "Couldn't update this account.");
      }
    } catch (err) {
      onError(err.response?.data?.msg || "Couldn't reach the server.");
    }
    setBusy(false);
  }

  return (
    <>
      <IconButton
        label={deactivating ? `Deactivate ${name}` : `Reactivate ${name}`}
        onClick={() => setOpen(true)}
      >
        {deactivating ? <FiUserX /> : <FiUserCheck />}
      </IconButton>
      <Modal
        isOpen={open}
        onRequestClose={() => !busy && setOpen(false)}
        contentLabel={deactivating ? "Deactivate account" : "Reactivate account"}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
          },
        }}
      >
        <div className="ecms-dialog">
          <h4>{deactivating ? `Deactivate ${name}?` : `Reactivate ${name}?`}</h4>
          <p>
            {deactivating
              ? "They won't be able to sign in and won't be added to new rotas. Their records, contracts and invoices are kept, and you can reactivate them at any time."
              : "They'll be able to sign in again and can be added to new rotas."}
          </p>
          <div className="ecms-dialog__actions">
            <Button type="button" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              color={deactivating ? "danger" : "primary"}
              onClick={confirm}
              disabled={busy}
            >
              {busy ? "Saving…" : deactivating ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default AccountStatusButton;
