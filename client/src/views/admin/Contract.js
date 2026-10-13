import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { user } from "../../data/api";
import { BsArrowBarLeft } from "react-icons/bs";
import { FaUserCircle } from "react-icons/fa";
import {
  ListHeader,
  PersonCell,
  DateCell,
  IconButton,
  SortHeader,
} from "components/ui/ListUI.js";
import { FiEye } from "react-icons/fi";
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

function Contracts({ isDashboard }) {
  const [cts, setCts] = useState({});
  const [mode, setMode] = useState("all");
  const [current, setCurrent] = useState({ email: "" });
  const [userFound, setUserFound] = useState({});
  const [pagination, setPagination] = useState({ current: 1 });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({});
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({
    msg: "",
    type: "",
  });
  const [selection, setSelection] = useState("all");
  const location = useLocation();
  useEffect(() => {
    const email = location.state?.addFor;
    if (email && !isDashboard) {
      setMode("add");
      setCurrent({ email });
      fetchUser(email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [newContract, setNewContract] = useState({});
  // called from the "Find User" button, or with an email when opened from a person's page
  async function fetchUser(emailArg) {
    const email = typeof emailArg === "string" ? emailArg : current.email;
    await axios
      .get(user.showUserByEmail + "/" + email)
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
            msg: "Couldn't find that person. Please refresh the page.",
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

  async function fetchContracts() {
        await axios
          .get(user.showAllContracts)
          .then((response) => {
            if (response.data.status === true) {
              setCts({
                no: response.data.noContracts,
                expired: response.data.expired,
                valid: response.data.valid,
                all: response.data.data,
              });
            } else {
              setNotificationDetails({
                msg: "Couldn't load contracts. Please refresh the page.",
                type: "danger",
              });
              setNotificationStatus(true);
            }
          });
  }
  useEffect(
    () => {
      fetchContracts();
    },
    // search and paging happen in the browser over the full list
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
  async function addContract(e) {
    e.preventDefault();
    const { start_date, end_date } = newContract;
    if (!start_date || !end_date) {
      setNotificationDetails({ msg: "Please choose a start and end date.", type: "danger" });
      setNotificationStatus(true);
      return;
    }
    if (end_date <= start_date) {
      setNotificationDetails({ msg: "The end date must be after the start date.", type: "danger" });
      setNotificationStatus(true);
      return;
    }
    try {
      // newest contract first: it becomes the current one
      const res = await axios.patch(user.updateUser + "/" + userFound._id, {
        Contracts: [newContract, ...(userFound.Contracts || [])],
      });
      if (res.data.status) {
        setNotificationDetails({
          msg: `Contract added for ${userFound.first_name} ${userFound.last_name}.`,
          type: "success",
        });
        setUserFound({});
        setNewContract({});
        setCurrent({});
        await fetchContracts();
        setMode("all");
      } else {
        setNotificationDetails({ msg: res.data.msg || "Couldn't add the contract.", type: "danger" });
      }
    } catch (error) {
      setNotificationDetails({
        msg: error.response?.data?.msg || "Couldn't reach the server.",
        type: "danger",
      });
    }
    setNotificationStatus(true);
  }


  // Care contracts belong to clients and caregivers, not admin accounts
  const rows = (cts[selection] || []).filter((u) => {
    if (u.role === "admin") return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q);
  });
  const sortKeys = {
    name: (u) => `${u.first_name} ${u.last_name}`.toLowerCase(),
    role: (u) => u.role || "",
    ends: (u) => u.Contracts?.[0]?.end_date || "",
    status: (u) => contractStatus(u)[1],
  };
  if (sortKeys[sort.field]) {
    const key = sortKeys[sort.field];
    const dir = sort.order === "desc" ? -1 : 1;
    rows.sort((a, b) => (key(a) > key(b) ? dir : key(a) < key(b) ? -dir : 0));
  }
  function sortBy(next) {
    setSort(next);
    setPagination((p) => ({ ...p, current: 1 }));
  }
  const perPage = isDashboard ? 6 : 10;
  const pageRows = rows.slice(
    (pagination.current - 1) * perPage,
    pagination.current * perPage,
  );
  function contractStatus(u) {
    const latest = u.Contracts?.[0];
    if (!latest) return ["warn", "No contract"];
    if (!checkDates(latest.start_date, latest.end_date)) return ["bad", "Expired"];
    return startsLater(latest.start_date) ? ["ok", "Starts soon"] : ["ok", "Valid"];
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
                title={isDashboard ? "Contracts" : "All contracts"}
                count={rows.length}
                onSearch={
                  isDashboard
                    ? undefined
                    : (value) => {
                        setSearch(value);
                        setPagination((p) => ({ ...p, current: 1 }));
                      }
                }
                searchPlaceholder="Search people"
                actionLabel="Add contract"
                onAction={
                  isDashboard
                    ? undefined
                    : () => {
                        setMode("add");
                        setCurrent({});
                      }
                }
              >
                <div
                  className="ecms-tabs"
                  role="tablist"
                  aria-label="Filter contracts"
                >
                  {[
                    ["all", "All"],
                    ["valid", "Valid"],
                    ["expired", "Expired"],
                    ["no", "No contract"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selection === key}
                      className={
                        "ecms-tab" + (selection === key ? " is-active" : "")
                      }
                      onClick={() => {
                        setSelection(key);
                        setPagination((p) => ({ ...p, current: 1 }));
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </ListHeader>

              <CardBody>
                <Table responsive>
                  <thead>
                    <tr>
                      <SortHeader field="name" sort={sort} onSort={sortBy}>
                        Person
                      </SortHeader>
                      {!isDashboard ? (
                        <SortHeader field="role" sort={sort} onSort={sortBy}>
                        Role
                      </SortHeader>
                      ) : null}
                      <SortHeader field="ends" sort={sort} onSort={sortBy}>
                        Contract ends
                      </SortHeader>
                      <SortHeader field="status" sort={sort} onSort={sortBy}>
                        Status
                      </SortHeader>
                      {!isDashboard ? (
                        <th className="ecms-actions">Actions</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={isDashboard ? 3 : 5} className="ecms-empty">
                          Nobody matches this filter.
                        </td>
                      </tr>
                    )}
                    {pageRows.map((items, key) => {
                      const [kind, label] = contractStatus(items);
                      const latest = items.Contracts?.[0];
                      return (
                        <tr key={key}>
                          <td>
                            <PersonCell
                              name={`${items.first_name} ${items.last_name}`}
                              email={items.email}
                            />
                          </td>
                          {!isDashboard ? (
                            <td className="ecms-muted text-capitalize" data-label="Role">
                              {items.role}
                            </td>
                          ) : null}
                          <td data-label="Contract ends">
                            {latest ? (
                              <DateCell value={latest.end_date} />
                            ) : (
                              <span className="ecms-muted">–</span>
                            )}
                          </td>
                          <td data-label="Status">
                            <span className={"ecms-status ecms-status--" + kind}>
                              {label}
                            </span>
                          </td>
                          {!isDashboard ? (
                            <td className="ecms-actions">
                              <IconButton
                                label={`View ${items.first_name} ${items.last_name}'s contracts`}
                                onClick={() => {
                                  setMode("view");
                                  setCurrent(items);
                                }}
                              >
                                <FiEye />
                              </IconButton>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
            <RPagination
              pagination={{ ...pagination, count: rows.length }}
              perPage={perPage}
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
                    <CardTitle tag="h5">Add Contract</CardTitle>
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
                      <BsArrowBarLeft size={20} /> Back to Contracts
                    </button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <Form
                  onSubmit={(e) => {
                    addContract(e);
                  }}
                >
                  <Row>
                    <Col className="pr-1" md="6">
                      <FormGroup>
                        <label>Email</label>
                        <Input
                          placeholder="Person's email"
                          type="email"
                          value={current.email || ""}
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
                      <Col>
                        <h5>
                          Name:{" "}
                          {userFound.first_name + " " + userFound.last_name}
                        </h5>
                        <h5>Role: {userFound.role}</h5>
                      </Col>
                    ) : null}
                  </Row>

                  <Row>
                    <Col className="pr-1" md="6">
                      <FormGroup>
                        <label>Start Date</label>
                        <Input
                          type="date"
                          onChange={(e) =>
                            setNewContract({
                              ...newContract,
                              start_date: e.target.value,
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="6">
                      <FormGroup>
                        <label>End Date</label>
                        <Input
                          type="date"
                          onChange={(e) =>
                            setNewContract({
                              ...newContract,
                              end_date: e.target.value,
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="12">
                      <FormGroup>
                        <label>Description</label>
                        <Input
                          type="textarea"
                          onChange={(e) =>
                            setNewContract({
                              ...newContract,
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
                        Add Contract
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
              <BsArrowBarLeft size={20} /> Back to Views
            </button>

            <Row>
              <Col md={4}>
                <Card className="card-user">
                  <div style={{ textAlign: "center" }}>
                    <h4 style={{ marginTop: "10px" }}>
                      {current.first_name + " " + current.last_name}
                    </h4>
                    <FaUserCircle size={100} />
                    <h5 style={{ marginTop: "10px" }}>
                      {"Contracts: " + current.Contracts.length || 0}
                    </h5>
                  </div>
                </Card>
              </Col>
              <Col md={8}>
                <Card className="card-user">
                  <div style={{ textAlign: "center" }}>
                    <h4 style={{ marginTop: "10px" }}>All Contracts</h4>
                    <Table responsive>
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
                                  <div
                                    className="ecms-status ecms-status--bad"
                                    style={{ cursor: "not-allowed" }}
                                  >
                                    Expired
                                  </div>
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
