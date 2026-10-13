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
  SortHeader,
  InvoiceStatus,
  formatDate,
} from "components/ui/ListUI.js";
import { FiDownload, FiEye } from "react-icons/fi";
import { downloadInvoicePdf } from "components/ui/invoicePdf.js";
import Notifications from "components/Notification/Notification";
import RPagination from "components/Pagination/Pagination";
import { useSubject } from "components/care/useSubject.js";

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
  const [sort, setSort] = useState({});
  const subject = useSubject();

  useEffect(
    () => {
      async function fetchInvoices() {
        await axios
          .get(invoice_api.showInvoice + "/" + subject.email, {
            params: {
              current: pagination.current,
              search,
              sort: sort.field,
              order: sort.order,
            },
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
    [search, pagination.current, sort],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps

  function sortBy(next) {
    setSort(next);
    setPagination((p) => ({ ...p, current: 1 }));
  }

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
                      <SortHeader field="description" sort={sort} onSort={sortBy}>
                        Description
                      </SortHeader>
                      <SortHeader field="due" sort={sort} onSort={sortBy}>
                        Due
                      </SortHeader>
                      <SortHeader field="status" sort={sort} onSort={sortBy}>
                        Status
                      </SortHeader>
                      <SortHeader field="amount" sort={sort} onSort={sortBy}>
                        Amount
                      </SortHeader>
                      <th className="ecms-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="ecms-empty">
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
                        <td data-label="Due">
                          <DateCell value={items.due_date} />
                        </td>
                        <td data-label="Status">
                          <InvoiceStatus invoice={items} />
                        </td>
                        <td className="ecms-amount" data-label="Amount">
                          {formatMoney(items.amount)}
                        </td>
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
                          <IconButton
                            label="Download PDF"
                            onClick={() => downloadInvoicePdf(items, subject)}
                          >
                            <FiDownload />
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
                          <th>Due</th>
                          <th>Status</th>
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
                          <td>{formatDate(current.due_date)}</td>
                          <td><InvoiceStatus invoice={current} /></td>
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
