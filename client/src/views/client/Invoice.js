import React, { useState, useEffect } from "react";
import axios from "axios";
import { invoice_api } from "../../data/api";
import { BsArrowBarLeft } from "react-icons/bs";
import { FaFileInvoice } from "react-icons/fa";
import logo from "../../assets/img/logo.png";
import {
  ListHeader,
  DateCell,
  IconButton,
  formatMoney,
} from "components/ui/ListUI.js";
import { FiEye } from "react-icons/fi";
import Notifications from "components/Notification/Notification";
import RPagination from "components/Pagination/Pagination";
import { useAuth } from "contexts/AuthContext";

// reactstrap components
import {
  Card,
  CardBody,
  Table,
  Row,
  Col,
} from "reactstrap";

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({
    msg: "",
    type: "",
  });
  const [mode, setMode] = useState("all");
  const [current, setCurrent] = useState({ email: "" });
  const [pagination, setPagination] = useState({ current: 1 });
  const [search, setSearch] = useState("");
  const { userDetail } = useAuth();

  useEffect(
    () => {
      async function fetchInvoices() {
        await axios
          .get(invoice_api.showInvoice + "/" + userDetail.email, {
            params: { ...pagination, search },
          })
          .then((response) => {
            if (response.data.status === true) {
              setInvoices(response.data.data);
              setPagination((p) => ({ ...p, count: response.data.count }));
            } else {
              setNotificationDetails({
                msg: "Error Loading Invoices, Please Referesh The Page",
                type: "danger",
              });
              setNotificationStatus(true);
            }
          });
      }
      fetchInvoices();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, pagination.current],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps

  return (
    <>
      {notificationStatus === true ? (
        <Notifications details={notificationDetails} />
      ) : null}
      <div className="content">
        {mode === "all" ? (
          <>
            <Card className="ecms-list">
              <ListHeader
                title="Your invoices"
                count={pagination.count}
                onSearch={(value) => {
                  setSearch(value);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                searchPlaceholder="Search invoices"
              />
              <CardBody>
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th className="ecms-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={4} className="ecms-empty">
                          No invoices yet.
                        </td>
                      </tr>
                    )}
                    {invoices.map((items, key) => (
                      <tr key={key}>
                        <td>
                          <strong className="ecms-amount">
                            {items.description || items.type || "Invoice"}
                          </strong>
                        </td>
                        <td>
                          <DateCell value={items.date_created} />
                        </td>
                        <td className="ecms-amount">{formatMoney(items.amount)}</td>
                        <td className="ecms-actions">
                          <IconButton
                            label="View details"
                            onClick={() => {
                              setMode("view");
                              setCurrent(items);
                            }}
                          >
                            <FiEye />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
            <RPagination
              pagination={pagination}
              setPagination={setPagination}
            />
          </>
        ) : null}

        {mode === "view" ? (
          <>
            <button
              onClick={() => {
                setMode("all");
                setCurrent({});
              }}
              className="btn"
              style={{ margin: "0px", padding: "10px", marginBottom: "15px" }}
            >
              <BsArrowBarLeft size={20} /> Back to Invoices
            </button>

            <Row>
              <Col col={12}>
                <Card className="card-user">
                  <Row>
                    <Col md={9} style={{ padding: "20px" }}>
                      <img src={logo} alt="cms logo" />
                      <h3 style={{ paddingLeft: "10px" }}>
                        {" "}
                        <FaFileInvoice size={30} /> INVOICE
                      </h3>
                    </Col>
                    <Col style={{ padding: "10px" }}>
                      <h4 style={{ marginTop: "10px", marginRight: "10px" }}>
                        Elderly Care Management System
                      </h4>
                    </Col>
                  </Row>

                  <CardBody>
                    <Table>
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{current.email}</td>
                          <td>
                            {new Date(
                              current.date_created,
                            ).toLocaleDateString()}
                          </td>
                          <td className="ecms-amount">{formatMoney(current.amount)}</td>
                          <td>{current.description}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </>
        ) : null}
      </div>
    </>
  );
}

export default Invoices;
