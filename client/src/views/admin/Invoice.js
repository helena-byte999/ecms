import React, { useState, useEffect } from "react";
import axios from "axios";
import { invoice_api, user } from "../../data/api";
import { BsArrowBarLeft } from "react-icons/bs";
import {
  ListHeader,
  PersonCell,
  DateCell,
  IconButton,
  formatMoney,
  SortHeader,
  InvoiceStatus,
  formatDate,
} from "components/ui/ListUI.js";
import { FiCheckCircle, FiDownload, FiEye, FiRotateCcw } from "react-icons/fi";
import { downloadInvoicePdf } from "components/ui/invoicePdf.js";
import Brand from "components/Brand.js";
import Notifications from "components/Notification/Notification";
import RPagination from "components/Pagination/Pagination";

// reactstrap components
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
  Row,
  Col,
  Input,
  Form,
  FormGroup,
  Button,
} from "reactstrap";

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({
    msg: "",
    type: "",
  });
  const [mode, setMode] = useState("all");
  const [current, setCurrent] = useState({
    email: "",
    description: "",
    amount: "",
  });
  const [userFound, setUserFound] = useState({});
  const [pagination, setPagination] = useState({ current: 1 });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({});

  async function fetchUser() {
    await axios
      .get(user.showUserByEmail + "/" + current.email)
      .then((response) => {
        if (response.data.status === true) {
          setUserFound(response.data.data);
          setNotificationDetails({
            msg: "User found successfully",
            type: "success",
          });
          setNotificationStatus(true);
        } else {
          setNotificationDetails({
            msg: "Error finding user, Please Referesh The Page",
            type: "danger",
          });
          setNotificationStatus(true);
        }
      })
      .catch((error) => {
        if (error.response) {
          setNotificationDetails({
            msg: error.response.data.msg,
            type: "danger",
          });
          setNotificationStatus(true);
        } else {
          setNotificationDetails({ msg: "Network Error!", type: "danger" });
          setNotificationStatus(true);
        }
      });
  }

  useEffect(
    () => {
      async function fetchInvoices() {
        await axios
          .get(invoice_api.showInvoices, { params: {
              current: pagination.current,
              search,
              sort: sort.field,
              order: sort.order,
            } })
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

  async function addInvoice(e) {
    e.preventDefault();

    await axios
      .post(invoice_api.addInvoice, current)
      .then((res) => {
        if (res.data.status) {
          setNotificationDetails({
            msg: "Invoice Added Successfully.",
            type: "success",
          });
          setInvoices([res.data.data, ...invoices]);
          setPagination((p) => ({ ...p, count: (p.count || 0) + 1 }));
          setCurrent({});
          setUserFound({});
          e.target.reset();
        } else {
          setNotificationDetails({
            msg: "Error Adding Invoice, ensure all fields are filled.",
            type: "danger",
          });
        }
        setNotificationStatus(true);
      })
      .catch((error) => {
        if (error.response) {
          setNotificationDetails({
            msg: error.response.data.msg || "Couldn't add the invoice.",
            type: "danger",
          });
          setNotificationStatus(true);
        } else {
          setNotificationDetails({ msg: "Network Error!", type: "danger" });
          setNotificationStatus(true);
        }
      });
  }

  // Save an invoice (edit form) or just change its status (list button)
  async function saveInvoice(changes, doneMsg) {
    try {
      const res = await axios.patch(invoice_api.updateInvoice, changes);
      if (res.data.status) {
        const saved = res.data.data;
        setInvoices((list) => list.map((i) => (i._id === saved._id ? saved : i)));
        setCurrent((c) => (c._id === saved._id ? saved : c));
        setNotificationDetails({ msg: doneMsg, type: "success" });
      } else {
        setNotificationDetails({ msg: res.data.msg || "Couldn't save the invoice.", type: "danger" });
      }
    } catch (error) {
      setNotificationDetails({
        msg: error.response?.data?.msg || "Couldn't reach the server.",
        type: "danger",
      });
    }
    setNotificationStatus(true);
  }

  function updateInvoice(e) {
    e.preventDefault();
    const { _id, amount, type, description, due_date, status } = current;
    saveInvoice({ _id, amount, type, description, due_date, status }, "Invoice saved.");
  }

  // Look up who it's billed to (name, address), then build the PDF
  async function download(inv) {
    let person = {};
    try {
      person = (await axios.get(user.showUserByEmail + "/" + inv.email)).data.data || {};
    } catch (e) {}
    try {
      await downloadInvoicePdf(inv, person);
    } catch (e) {
      setNotificationDetails({ msg: "Couldn't create the PDF.", type: "danger" });
      setNotificationStatus(true);
    }
  }

  function togglePaid(inv) {
    const status = inv.status === "paid" ? "unpaid" : "paid";
    saveInvoice({ _id: inv._id, status }, status === "paid" ? "Marked as paid." : "Marked as unpaid.");
  }

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
                title="Invoices"
                count={pagination.count}
                onSearch={(value) => {
                  setSearch(value);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                searchPlaceholder="Search invoices"
                actionLabel="Add invoice"
                onAction={() => {
                  setMode("add");
                  setCurrent({});
                }}
              />
              <CardBody>
                <Table responsive>
                  <thead>
                    <tr>
                      <SortHeader field="client" sort={sort} onSort={sortBy}>
                        Client
                      </SortHeader>
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
                        <td colSpan={6} className="ecms-empty">
                          No invoices found.
                        </td>
                      </tr>
                    )}
                    {invoices.map((items, key) => (
                      <tr key={key}>
                        <td>
                          <PersonCell email={items.email} />
                        </td>
                        <td className="ecms-muted" data-label="Description">
                          {items.description || items.type || "–"}
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
                          <IconButton label="View details" onClick={() => {
                              setMode("view");
                              setCurrent(items);
                            }}>
                            <FiEye />
                          </IconButton>
                          <IconButton
                            label={items.status === "paid" ? "Mark as unpaid" : "Mark as paid"}
                            onClick={() => togglePaid(items)}
                          >
                            {items.status === "paid" ? <FiRotateCcw /> : <FiCheckCircle />}
                          </IconButton>
                          <IconButton label="Download PDF" onClick={() => download(items)}>
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

        {mode === "add" ? (
          <>
            <Card className="card-user">
              <CardHeader>
                <Row style={{ marginBottom: "-20px" }}>
                  <Col>
                    <CardTitle tag="h5">Send Invoice</CardTitle>
                  </Col>
                  <Col md={3}>
                    <button
                      onClick={() => {
                        setMode("all");
                        setCurrent({});
                      }}
                      className="btn"
                      style={{
                        width: "100%",
                        marginTop: "20px",
                        marginBottom: "20px",
                      }}
                    >
                      <BsArrowBarLeft size={20} /> Back to Invoices
                    </button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <Form
                  onSubmit={(e) => {
                    addInvoice(e);
                  }}
                >
                  <Row>
                    <Col className="pr-1" md="6">
                      <FormGroup>
                        <label>Email</label>
                        <Input
                          defaultValue={current.email}
                          placeholder="Person's email"
                          type="text"
                          onChange={(e) =>
                            setCurrent({ ...current, email: e.target.value })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="6">
                      <FormGroup>
                        <label>Fetch Details</label>
                        <br />
                        <Button
                          style={{ marginTop: "-2px" }}
                          onClick={fetchUser}
                        >
                          Find User
                        </Button>
                      </FormGroup>
                    </Col>
                    {Object.keys(userFound).length > 0 ? (
                      <Row style={{ marginTop: "-30px" }}>
                        <Col>
                          <h4>
                            Name:{" "}
                            {userFound.first_name + " " + userFound.last_name}
                          </h4>
                        </Col>
                        <Col>
                          <h4>Role: {userFound.role}</h4>
                        </Col>
                      </Row>
                    ) : null}
                  </Row>

                  <Row>
                    <Col md="12">
                      <FormGroup>
                        <label>Amount</label>
                        <Input
                          defaultValue={current.amount}
                          onChange={(e) =>
                            setCurrent({ ...current, amount: e.target.value })
                          }
                          placeholder="0.00"
                          type="number"
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pr-1" md="6">
                      <FormGroup>
                        <label htmlFor="inv-type">Type</label>
                        <Input
                          id="inv-type"
                          placeholder="e.g. Monthly care"
                          type="text"
                          onChange={(e) =>
                            setCurrent({ ...current, type: e.target.value })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="6">
                      <FormGroup>
                        <label htmlFor="inv-due">Due date</label>
                        <Input
                          id="inv-due"
                          type="date"
                          onChange={(e) =>
                            setCurrent({ ...current, due_date: e.target.value })
                          }
                        />
                        <small className="ecms-fieldhint">Leave empty for 14 days from today.</small>
                      </FormGroup>
                    </Col>
                    <Col md="12">
                      <FormGroup>
                        <label htmlFor="exampleInputEmail1">Description</label>
                        <Input
                          placeholder="This is an invoice for..."
                          type="textarea"
                          defaultValue={current.description}
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              description: e.target.value,
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <div className="update ml-auto mr-auto">
                      <Button
                        className="btn-round"
                        color="primary"
                        type="submit"
                        disabled={
                          Object.keys(userFound).length > 0 ? false : true
                        }
                      >
                        Send Invoice
                      </Button>
                    </div>
                  </Row>
                </Form>
              </CardBody>
            </Card>
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

            <Card className="ecms-invoice">
              <CardBody>
                <div className="ecms-invoice__head">
                  <Brand compact />
                  <div>
                    <h2>Invoice</h2>
                    <InvoiceStatus invoice={current} />
                  </div>
                </div>
                <dl className="ecms-invoice__meta">
                  <div>
                    <dt>Billed to</dt>
                    <dd>{current.email}</dd>
                  </div>
                  <div>
                    <dt>Issued</dt>
                    <dd>{formatDate(current.date_created)}</dd>
                  </div>
                  <div>
                    <dt>{current.status === "paid" ? "Paid on" : "Due"}</dt>
                    <dd>
                      {formatDate(
                        current.status === "paid" ? current.paid_at : current.due_date,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Amount</dt>
                    <dd className="ecms-amount">{formatMoney(current.amount)}</dd>
                  </div>
                </dl>

                <Form onSubmit={updateInvoice}>
                  <Row>
                    <Col className="pr-1" md="4">
                      <FormGroup>
                        <label htmlFor="edit-amount">Amount</label>
                        <Input
                          id="edit-amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={current.amount ?? ""}
                          onChange={(e) => setCurrent({ ...current, amount: e.target.value })}
                        />
                      </FormGroup>
                    </Col>
                    <Col className="px-1" md="4">
                      <FormGroup>
                        <label htmlFor="edit-due">Due date</label>
                        <Input
                          id="edit-due"
                          type="date"
                          value={current.due_date || ""}
                          onChange={(e) => setCurrent({ ...current, due_date: e.target.value })}
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="4">
                      <FormGroup>
                        <label htmlFor="edit-status">Status</label>
                        <Input
                          id="edit-status"
                          type="select"
                          value={current.status || "unpaid"}
                          onChange={(e) => setCurrent({ ...current, status: e.target.value })}
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col className="pr-1" md="4">
                      <FormGroup>
                        <label htmlFor="edit-type">Type</label>
                        <Input
                          id="edit-type"
                          type="text"
                          value={current.type || ""}
                          onChange={(e) => setCurrent({ ...current, type: e.target.value })}
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="8">
                      <FormGroup>
                        <label htmlFor="edit-description">Description</label>
                        <Input
                          id="edit-description"
                          type="text"
                          value={current.description || ""}
                          onChange={(e) => setCurrent({ ...current, description: e.target.value })}
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  <Button color="primary" type="submit">
                    Save changes
                  </Button>{" "}
                  <Button type="button" onClick={() => download(current)}>
                    <FiDownload aria-hidden="true" /> Download PDF
                  </Button>
                </Form>
              </CardBody>
            </Card>
          </>
        ) : null}
      </div>
    </>
  );
}

export default Invoices;
