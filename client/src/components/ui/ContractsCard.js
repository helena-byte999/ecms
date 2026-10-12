import React from "react";
import { Card, CardBody } from "reactstrap";
import { DateCell } from "components/ui/ListUI.js";

const DAY = 86400000;

function contractState(c, today = new Date()) {
  const start = new Date(c.start_date + "T00:00:00");
  const end = new Date(c.end_date + "T23:59:59");
  if (isNaN(start) || isNaN(end)) return ["warn", "Check dates"];
  if (today < start) return ["warn", "Starts soon"];
  if (today > end) return ["bad", "Expired"];
  return ["ok", "Valid"];
}

// A person's contracts: the current one (newest first) with its status and
// time left, then earlier ones. `onAdd` shows an "Add contract" button.
function ContractsCard({ contracts = [], onAdd }) {
  const [current, ...earlier] = contracts;
  const [kind, label] = current ? contractState(current) : ["warn", "No contract"];
  const daysLeft =
    current && kind === "ok"
      ? Math.ceil((new Date(current.end_date + "T23:59:59") - new Date()) / DAY)
      : null;

  return (
    <Card className="ecms-contracts">
      <CardBody>
        <div className="ecms-contracts__head">
          <h3>Contracts</h3>
          <span className={"ecms-status ecms-status--" + kind}>{label}</span>
        </div>

        {current ? (
          <div className="ecms-contracts__current">
            <DateCell value={current.start_date} to={current.end_date} />
            {daysLeft !== null && (
              <p className="ecms-contracts__left">
                {daysLeft <= 30
                  ? `Ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Time to renew.`
                  : `Ends in ${daysLeft} days`}
              </p>
            )}
            {current.description && <p>{current.description}</p>}
          </div>
        ) : (
          <p className="ecms-muted">No contract on record yet.</p>
        )}

        {earlier.length > 0 && (
          <div className="ecms-contracts__history">
            <h4>Earlier</h4>
            <ul>
              {earlier.map((c, i) => (
                <li key={i}>
                  <DateCell value={c.start_date} to={c.end_date} />
                  {c.description && <small>{c.description}</small>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {onAdd && (
          <button type="button" className="btn btn-primary btn-block" onClick={onAdd}>
            {current ? "Add a new contract" : "Add contract"}
          </button>
        )}
      </CardBody>
    </Card>
  );
}

export default ContractsCard;
