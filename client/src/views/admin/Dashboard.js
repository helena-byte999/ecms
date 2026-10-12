import React, { useState, useEffect } from "react";
import axios from "axios";
import Notifications from "components/Notification/Notification";
import StatCard from "components/ui/StatCard.js";
import InvoiceChart from "components/ui/InvoiceChart.js";
import { formatMoney } from "components/ui/ListUI.js";
import { user, invoice_api } from "data/api";
import Schedules from "../caregiver/Schedule";
import Contracts from "./Contract";
import { Card, CardBody, Row, Col } from "reactstrap";

const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

function Dashboard() {
  const [c, setCounts] = useState({});
  const [months, setMonths] = useState([]);
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({ msg: "", type: "" });

  useEffect(() => {
    Promise.all([axios.get(user.getCounts), axios.get(invoice_api.summary, { params: { months: 6 } })])
      .then(([counts, summary]) => {
        setCounts(counts.data.data || {});
        setMonths(summary.data.data || []);
      })
      .catch(() => {
        setNotificationDetails({ msg: "Couldn't load the dashboard. Please refresh.", type: "danger" });
        setNotificationStatus(true);
      });
  }, []);

  const loaded = c.clients !== undefined;
  return (
    <>
      {notificationStatus === true ? <Notifications details={notificationDetails} /> : null}
      <div className="content">
        <div className="ecms-stats">
          <StatCard
            label="Clients"
            value={c.clients}
            badge={
              loaded &&
              (c.clientsWithoutContract
                ? { tone: "warn", text: `${c.clientsWithoutContract} without a contract` }
                : { tone: "ok", text: "All under contract" })
            }
            note="Residents and families in your care"
          />
          <StatCard
            label="Active caregivers"
            value={c.caregiversActive}
            badge={loaded && c.caregiversOnLeave > 0 && { tone: "neutral", text: `${c.caregiversOnLeave} on leave` }}
            note={loaded && `${plural(c.caregivers, "caregiver")} on staff`}
          />
          <StatCard
            label="Valid contracts"
            value={c.contractsValid}
            badge={
              loaded &&
              (c.contractsExpiringSoon
                ? { tone: "warn", text: `${c.contractsExpiringSoon} end within 30 days` }
                : { tone: "ok", text: "None ending soon" })
            }
            note="Includes contracts starting soon"
          />
          <StatCard
            label="Outstanding"
            value={loaded ? formatMoney(c.outstanding) : undefined}
            badge={
              loaded &&
              (c.overdue
                ? { tone: "bad", text: `${c.overdue} overdue` }
                : { tone: "ok", text: "Nothing overdue" })
            }
            note={loaded && `${plural(c.unpaid, "unpaid invoice")}`}
          />
        </div>

        <Card className="ecms-chart-card">
          <CardBody>
            <InvoiceChart data={months} />
          </CardBody>
        </Card>

        <Row>
          <Col lg={6}>
            <Contracts isDashboard={true} />
          </Col>
          <Col lg={6}>
            <Schedules />
          </Col>
        </Row>
      </div>
    </>
  );
}

export default Dashboard;
