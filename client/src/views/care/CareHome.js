import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import { care } from "data/api";
import { Avatar } from "components/ui/ListUI.js";
import { Pill } from "components/care/CareTimeline.js";
import { dayLabel, fullName, timeOf } from "components/care/labels.js";
import MedicineRound from "views/care/MedicineRound.js";
import SectionTabs, { careTabs } from "components/ui/SectionTabs.js";
import { useAuth } from "contexts/AuthContext";

// Residents with today's dose progress and when something was last written down
export function ResidentGrid({ residents, layout, meId }) {
  if (!residents) return <p className="care-empty">Loading residents…</p>;
  if (!residents.length) return <p className="care-empty">No residents yet.</p>;
  return (
    <div className="care-residents">
      {residents.map((r) => {
        const t = r.today || {};
        const recorded = (t.given || 0) + (t.refused || 0) + (t.missed || 0);
        return (
          <Link className="care-resident" to={`${layout}/care/${r._id}`} key={r._id}>
            <span className="care-resident__top">
              <Avatar name={fullName(r)} />
              <span>
                <strong>{fullName(r)}</strong>
                <span className="care-muted">{r.medicines} medicine{r.medicines === 1 ? "" : "s"}</span>
              </span>
            </span>
            {r.key_worker && (
              <span className="care-resident__kw">
                Key worker: {r.key_worker._id === meId ? <Pill tone="neutral" plain>You</Pill> : r.key_worker.name}
              </span>
            )}
            {r.allergy && <span className="care-allergy">Allergy: {r.allergy}</span>}
            <span className="care-resident__doses">
              <span>
                Doses today: <strong style={{ color: "var(--ink)" }}>{recorded}</strong> of {t.scheduled || 0}
              </span>
              {t.late > 0 ? <Pill tone="bad">{t.late} late</Pill> : t.due > 0 ? <Pill tone="neutral">{t.due} due</Pill> : t.scheduled ? <Pill tone="ok">Up to date</Pill> : null}
            </span>
            <span className="care-muted">
              {r.last_entry ? `Last entry: ${dayLabel(r.last_entry)}, ${timeOf(r.last_entry)}` : "Nothing recorded yet"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// Staff care area: today's medicine round and the residents list
function CareHome() {
  const location = useLocation();
  const { userDetail } = useAuth();
  const layout = "/" + location.pathname.split("/")[1];
  const tab = new URLSearchParams(location.search).get("tab") === "residents" ? "residents" : "round";
  const [residents, setResidents] = useState(null);
  const loadResidents = useCallback(() => {
    axios.get(care.residents).then((r) => setResidents(r.data.data)).catch(() => setResidents([]));
  }, []);
  useEffect(loadResidents, [loadResidents]);

  return (
    <div className="content">
      <div className="care-card">
        <div className="care-card__head">
          <h2>{tab === "round" ? "Today's medicine round" : `Residents${residents ? ` (${residents.length})` : ""}`}</h2>
          <SectionTabs label="Care" tabs={careTabs(layout, userDetail.role === "admin")} />
        </div>
        <div className="care-card__body">
          {tab === "round" ? <MedicineRound layout={layout} onChange={loadResidents} /> : <ResidentGrid residents={residents} layout={layout} meId={userDetail._id} />}
        </div>
      </div>
    </div>
  );
}

export default CareHome;
