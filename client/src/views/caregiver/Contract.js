import React, { useState, useEffect } from "react";
import axios from "axios";
import { user } from "../../data/api";
import { FaUserCircle } from "react-icons/fa";
import Notifications from "components/Notification/Notification";
import { useAuth } from "contexts/AuthContext";

// reactstrap components
import { Card, CardBody, Table, Row, Col } from "reactstrap";

function Contracts() {
  const [mode, setMode] = useState("view");
  const [current, setCurrent] = useState({ email: "" });
  const [search] = useState("");
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({
    msg: "",
    type: "",
  });
  const { userDetail } = useAuth();

  useEffect(
    () => {
      async function fetchContracts() {
        await axios
          .get(user.showUserByEmail + "/" + userDetail.email)
          .then((response) => {
            if (response.data.status === true) {
              setCurrent(response.data.data);
            } else {
              setNotificationDetails({
                msg: "Couldn't load contracts. Please refresh the page.",
                type: "danger",
              });
              setNotificationStatus(true);
            }
          });
      }
      fetchContracts();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // A contract counts until the end of its end date. One that hasn't started yet
  // still counts (it's signed); it's labelled "Starts soon".
  function checkDates(start1, end1) {
    if (!start1 || !end1) return false;
    return new Date() <= new Date(end1 + "T23:59:59");
  }
  const startsLater = (start) =>
    !!start && new Date() < new Date(start + "T00:00:00");

  return (
    <>
      {notificationStatus === true ? (
        <Notifications details={notificationDetails} />
      ) : null}
      <div className="content">
        {mode === "view" ? (
          <>
            <Row>
              <Col md={4}>
                <Card className="card-user">
                  <div style={{ textAlign: "center" }}>
                    <h4 style={{ marginTop: "10px" }}>
                      {current.first_name + " " + current.last_name}
                    </h4>
                    <FaUserCircle size={100} />
                    <h5 style={{ marginTop: "10px" }}>
                      {"Contracts: " + current?.Contracts?.length || 0}
                    </h5>
                  </div>
                </Card>
              </Col>
              <Col md={8}>
                <Card className="card-user">
                  <div style={{ textAlign: "center" }}>
                    <h4 style={{ marginTop: "10px" }}>All Contracts</h4>
                    <Table>
                      <thead>
                        <tr>
                          <th>Start/End Date</th>
                          <th>Description</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(current.Contracts || []).map((items, key) => {
                          return (
                            <tr key={key}>
                              <td>
                                {items.start_date + " - " + items.end_date}
                                <br />
                              </td>
                              <td> {items.description}</td>
                              <td>
                                {checkDates(
                                  items.start_date,
                                  items.end_date,
                                ) ? (
                                  <div
                                    className="ecms-status ecms-status--ok"
                                    style={{ cursor: "not-allowed" }}
                                  >
                                    {startsLater(items.start_date) ? "Starts soon" : "Valid"}
                                  </div>
                                ) : (
                                  <>
                                    {key === 0 ? (
                                      <div
                                        className="ecms-status ecms-status--warn"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => {
                                          setCurrent({
                                            ...current,
                                            email: items.email,
                                          });
                                          setMode("add");
                                        }}
                                      >
                                        Renew?
                                      </div>
                                    ) : (
                                      <div
                                        className="ecms-status ecms-status--bad"
                                        style={{ cursor: "not-allowed" }}
                                      >
                                        Expired
                                      </div>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>

                  <CardBody></CardBody>
                </Card>
              </Col>
            </Row>
          </>
        ) : null}
      </div>
    </>
  );
}

export default Contracts;
