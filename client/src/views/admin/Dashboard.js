import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FiCreditCard } from "react-icons/fi";
import Notifications from "components/Notification/Notification";
import InvoiceChart from "components/ui/InvoiceChart.js";
import { formatMoney } from "components/ui/ListUI.js";
import { care, user, invoice_api } from "data/api";
import { useAuth } from "contexts/AuthContext";
import { ChartCard, Delta, KpiStrip, Note, SeriesTotals, StackedBars, TrendChart, fmtPct } from "components/care/charts.js";
import { OUTCOME_SERIES, PALETTE } from "components/care/palette.js";
import { daysAgo, ymd } from "components/care/labels.js";
import { Card, CardBody } from "reactstrap";

const plural = (n, word) => (n ? `${n} ${word}${n === 1 ? "" : "s"}` : `no ${word}s`);
const dayLabel = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });

function Dashboard() {
  const { userDetail } = useAuth();
  const [c, setCounts] = useState({});
  const [months, setMonths] = useState([]);
  const [r, setReport] = useState(null);
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({ msg: "", type: "" });

  useEffect(() => {
    Promise.all([
      axios.get(user.getCounts),
      axios.get(invoice_api.summary, { params: { months: 6 } }),
      axios.get(care.report, { params: { from: daysAgo(6), to: ymd() } }),
    ])
      .then(([counts, summary, report]) => {
        setCounts(counts.data.data || {});
        setMonths(summary.data.data || []);
        setReport(report.data.data);
      })
      .catch(() => {
        setNotificationDetails({ msg: "Couldn't load the dashboard. Please refresh.", type: "danger" });
        setNotificationStatus(true);
      });
  }, []);

  const loaded = c.clients !== undefined && r;
  const t = r?.totals;
  const p = r?.previous.totals;
  return (
    <>
      {notificationStatus === true ? <Notifications details={notificationDetails} /> : null}
      <div className="content">
        <div className="ca-head">
          <div>
            <h2>Welcome back, {userDetail.first_name}</h2>
            <p>
              {loaded ? (
                <>
                  Today you have <strong>{plural(t.due, "dose")}</strong> due on the round,{" "}
                  <strong>{plural(c.contractsExpiringSoon, "contract")}</strong> ending within 30 days and{" "}
                  <strong>{plural(c.overdue, "overdue invoice")}</strong>.
                </>
              ) : (
                "Loading today's summary…"
              )}
            </p>
          </div>
          <div className="care-actions">
            <Link to="/admin/care" className="care-btn">Medicine round</Link>
            <Link to="/admin/care/analytics" className="care-btn care-btn--primary">Care analytics</Link>
          </div>
        </div>

        {loaded && (
          <KpiStrip
            items={[
              {
                icon: "medicines",
                label: "Doses given",
                sub: `${fmtPct(p.completion)} the 7 days before`,
                value: fmtPct(t.completion_exact),
                delta: <Delta now={t.completion_exact} before={p.completion} label="vs previous 7 days" />,
              },
              {
                icon: "alert",
                label: "Incidents",
                sub: `${p.incidents} the 7 days before`,
                value: t.incidents,
                delta: <Delta now={t.incidents} before={p.incidents} unit="count" goodWhen="down" label="vs previous 7 days" />,
              },
              {
                icon: "elderly",
                label: "Residents",
                sub: `${c.caregiversActive} active caregivers`,
                value: c.clients,
                delta: c.clientsWithoutContract ? <Note tone="bad">{c.clientsWithoutContract} without a valid contract</Note> : <Note tone="good">All under contract</Note>,
              },
              {
                icon: <FiCreditCard aria-hidden="true" className="ecms-hicon" style={{ width: 18, height: 18 }} />,
                label: "Outstanding",
                sub: plural(c.unpaid, "unpaid invoice"),
                value: formatMoney(c.outstanding),
                delta: c.overdue ? <Note tone="bad">{c.overdue} overdue</Note> : <Note tone="good">Nothing overdue</Note>,
              },
            ]}
          />
        )}

        {r && (
          <div className="ca-grid ca-grid--2-1">
            <ChartCard
              icon="chartLine"
              title="Doses given, last 7 days"
              legend={[{ label: "This week", color: PALETTE.teal }, { label: "Week before", color: PALETTE.prev, dashed: true }]}
            >
              <TrendChart
                height={262}
                dates={r.daily.map((d) => d.date)}
                current={r.daily.map((d) => d.completion)}
                previous={r.previous.daily.map((d) => d.completion)}
                ariaLabel="Share of doses given each day this week, compared with the week before"
              />
            </ChartCard>
            <ChartCard icon="chartBar" title="Doses by outcome" legend={OUTCOME_SERIES}>
              <StackedBars rows={r.daily.map((d) => ({ ...d, label: dayLabel(d.date) }))} series={OUTCOME_SERIES} />
              <SeriesTotals rows={r.daily} series={OUTCOME_SERIES} />
            </ChartCard>
          </div>
        )}

        <Card className="ecms-chart-card">
          <CardBody>
            <InvoiceChart data={months} />
          </CardBody>
        </Card>

      </div>
    </>
  );
}

export default Dashboard;
