import React, { useState, useEffect } from "react";
import axios from "axios";
import Notifications from "components/Notification/Notification";
import StatCard from "components/ui/StatCard.js";
import { formatDate, formatMoney } from "components/ui/ListUI.js";
import { user } from "data/api";
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
  return (
    <>
      {notificationStatus === true ? <Notifications details={notificationDetails} /> : null}
      <div className="content">
        <div className="ecms-stats ecms-stats--3">
          <StatCard label="Contract" value={contract.value} badge={contract.badge} note="Your current care agreement" />
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
          <StatCard
            label="Member since"
            value={userDetail.date_created ? new Date(userDetail.date_created).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : undefined}
            note="Questions? Contact your care administrator"
          />
        </div>
        <Schedules />
      </div>
    </>
  );
}

export default Dashboard;
