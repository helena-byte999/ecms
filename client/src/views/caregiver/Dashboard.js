import React, { useState, useEffect } from "react";
import axios from "axios";
import Notifications from "components/Notification/Notification";
import StatCard from "components/ui/StatCard.js";
import { formatDate } from "components/ui/ListUI.js";
import { Link } from "react-router-dom";
import { care, user } from "data/api";
import { useAuth } from "contexts/AuthContext";
import Schedules from "./Schedule";

const DAY = 86400000;

// What the person's current contract means for them
function contractBadge(contract) {
  if (!contract) return { value: "None", badge: { tone: "warn", text: "No contract yet" } };
  if (contract.state === "expired") return { value: "Expired", badge: { tone: "bad", text: `Ended ${formatDate(contract.end_date)}` } };
  const today = new Date();
  if (new Date(contract.start_date + "T00:00:00") > today) {
    return { value: "Starts soon", badge: { tone: "neutral", text: `From ${formatDate(contract.start_date)}` } };
  }
  const days = Math.ceil((new Date(contract.end_date + "T23:59:59") - today) / DAY);
  return {
    value: "Valid",
    badge: days <= 30 ? { tone: "warn", text: `Ends in ${days} days` } : { tone: "ok", text: `Until ${formatDate(contract.end_date)}` },
  };
}

function Dashboard() {
  const { userDetail } = useAuth();
  const [c, setCounts] = useState({});
  const [round, setRound] = useState(null);
  useEffect(() => {
    axios.get(care.round).then((res) => setRound(res.data.data)).catch(() => {});
  }, []);
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({ msg: "", type: "" });

  useEffect(
    () => {
      axios
        .get(user.getCounts + "/" + userDetail.email)
        .then((response) => setCounts(response.data.data || {}))
        .catch(() => {
          setNotificationDetails({ msg: "Couldn't load your dashboard. Please refresh.", type: "danger" });
          setNotificationStatus(true);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const loaded = c.invoices !== undefined;
  const contract = loaded ? contractBadge(c.contract) : {};
  const r = round?.totals;
  const late = round ? round.slots.filter((s) => s.status === "late").length : 0;
  const open = r ? r.due : 0;
  return (
    <>
      {notificationStatus === true ? <Notifications details={notificationDetails} /> : null}
      <div className="content">
        <div className="ecms-stats ecms-stats--2">
          <StatCard
            label="Medicine round"
            value={r ? (open ? `${open} to give` : "Up to date") : undefined}
            badge={r && (late ? { tone: "bad", text: `${late} late` } : { tone: "ok", text: `${r.given + r.refused + r.missed} of ${r.scheduled} recorded` })}
            note={<Link to="/caregiver/care">Open today's round</Link>}
          />
          <StatCard label="Contract" value={contract.value} badge={contract.badge} note="Your current care agreement" />
        </div>
        <Schedules />
      </div>
    </>
  );
}

export default Dashboard;
