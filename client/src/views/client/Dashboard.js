import React, { useState, useEffect } from "react";
import axios from "axios";
import Notifications from "components/Notification/Notification";
import StatCard from "components/ui/StatCard.js";
import { formatDate, formatMoney } from "components/ui/ListUI.js";
import { Link } from "react-router-dom";
import { care, user } from "data/api";
import { useAuth } from "contexts/AuthContext";
import { useSubject } from "components/care/useSubject.js";
import CareTimeline from "components/care/CareTimeline.js";
import { daysAgo, ymd } from "components/care/labels.js";


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

// For a resident, and for a family member (who sees the resident they're linked to)
function Dashboard() {
  const { userDetail } = useAuth();
  const subject = useSubject();
  const [c, setCounts] = useState({});
  const [today, setToday] = useState(null);
  const [recent, setRecent] = useState(null);
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({ msg: "", type: "" });

  useEffect(
    () => {
      axios
        .get(care.residents)
        .then((r) => setToday(r.data.data?.[0]?.today || {}))
        .catch(() => setToday({}));
      axios
        .get(`${care.resident}/${subject.id}/entries`, { params: { from: daysAgo(2), to: ymd() } })
        .then((r) => setRecent(r.data.data.filter((e) => !e.corrected_by).slice(0, 6)))
        .catch(() => setRecent([]));
      axios
        .get(user.getCounts + "/" + subject.email)
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
  const doses = today && today.scheduled !== undefined ? today : null;
  const recorded = doses ? doses.given + doses.refused + doses.missed : 0;
  const contract = loaded ? contractBadge(c.contract) : {};
  return (
    <>
      {notificationStatus === true ? <Notifications details={notificationDetails} /> : null}
      <div className="content">
        {subject.isFamily && (
          <p className="ecms-muted" style={{ margin: "0 0 14px", fontSize: 15 }}>
            You're viewing {subject.first_name} {subject.last_name}'s records.
          </p>
        )}
        <div className="ecms-stats ecms-stats--3">
          <StatCard
            label="Medicines today"
            value={doses ? `${recorded} of ${doses.scheduled}` : undefined}
            badge={
              doses &&
              (doses.late
                ? { tone: "warn", text: `${doses.late} not yet recorded` }
                : doses.refused
                ? { tone: "warn", text: `${doses.refused} refused` }
                : { tone: "ok", text: doses.scheduled ? "On track" : "None due yet" })
            }
            note="Doses due so far today"
          />
          <StatCard label="Contract" value={contract.value} badge={contract.badge} note={subject.isFamily ? "Current care agreement" : "Your current care agreement"} />
          <StatCard
            label="To pay"
            value={loaded ? formatMoney(c.outstanding) : undefined}
            badge={
              loaded &&
              (c.overdue
                ? { tone: "bad", text: `${c.overdue} overdue` }
                : c.unpaid
                ? { tone: "neutral", text: `${c.unpaid} unpaid` }
                : { tone: "ok", text: "All paid" })
            }
            note={loaded && `${c.invoices} invoice${c.invoices === 1 ? "" : "s"} in total`}
          />
        </div>

        <div className="care-card" style={{ marginTop: 16 }}>
          <div className="care-card__head">
            <h3>Latest care</h3>
            <Link to={`/${userDetail.role}/care`} className="care-link">
              See the full care log
            </Link>
          </div>
          <div className="care-card__body">
            {recent ? <CareTimeline entries={recent} /> : <p className="care-empty">Loading…</p>}
          </div>
        </div>

      </div>
    </>
  );
}

export default Dashboard;
