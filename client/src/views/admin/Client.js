import React, { useState, useEffect } from "react";
import axios from "axios";
import { user } from "data/api";
import { BsArrowBarLeft } from "react-icons/bs";
import { FaUserCircle } from "react-icons/fa";
import {
  ListHeader,
  PersonCell,
  IconButton,
  SortHeader,
} from "components/ui/ListUI.js";
import { FiEye } from "react-icons/fi";
import AccountStatusButton from "components/ui/AccountStatusButton.js";
import ContractsCard from "components/ui/ContractsCard.js";
import { FamilyMembers } from "components/care/people.js";
import { Link, useHistory } from "react-router-dom";
import Notifications from "components/Notification/Notification";
import SectionTabs, { peopleTabs } from "components/ui/SectionTabs.js";
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

function Clients() {
  const history = useHistory();
  const [clients, setClients] = useState([]);
  const [mode, setMode] = useState("all");
  const [current, setCurrent] = useState({});
  const [pagination, setPagination] = useState({ current: 1 });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({});
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({
    msg: "",
    type: "",
  });

  function getAge(dateString) {
    var ageInMilliseconds = new Date() - new Date(dateString);
    return Math.floor(ageInMilliseconds / 1000 / 60 / 60 / 24 / 365); // convert to years
  }

  useEffect(
    () => {
      async function fetchClients() {
        await axios
          .get(user.showUsers + "/client", {
            params: {
              current: pagination.current,
              search,
              sort: sort.field,
              order: sort.order,
            },
          })
          .then((response) => {
            if (response.data.status === true) {
              setClients(response.data.data);
              setPagination((p) => ({ ...p, count: response.data.count }));
            } else {
              setNotificationDetails({
                msg: "Couldn't load residents. Please refresh the page.",
                type: "danger",
              });
              setNotificationStatus(true);
            }
          });
      }
      fetchClients();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, pagination.current, sort],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps

  async function addClient(e) {
    e.preventDefault();
    await axios
      .post(user.addUser, { ...current, role: "client" })
      .then((res) => {
        if (res.data.status) {
          setNotificationDetails({
            msg: "Resident added.",
            type: "success",
          });
          setClients([...clients, res.data.data]);
          setPagination({ ...pagination, count: pagination.count + 1 });
          setCurrent({});
          e.target.reset();
        } else {
          setNotificationDetails({
            msg: "Couldn't add the resident. Check every field is filled in.",
            type: "danger",
          });
        }
        setNotificationStatus(true);
      })
      .catch((error) => {
        if (error.response) {
          setNotificationDetails({
            msg:
              error.response.data.msg ||
              "Couldn't add the resident. Check every field is filled in.",
            type: "danger",
          });
          setNotificationStatus(true);
        } else {
          setNotificationDetails({ msg: "Network Error!", type: "danger" });
          setNotificationStatus(true);
        }
      });
  }

  async function updateClient(e) {
    e.preventDefault();
    try {
      const res = await axios.patch(user.updateUser + "/" + current._id, current);
      if (res.data.status) {
        const saved = res.data.data;
        setClients((list) => list.map((u) => (u._id === saved._id ? saved : u)));
        setCurrent({ ...saved, password: "" });
        setNotificationDetails({ msg: "Changes saved.", type: "success" });
      } else {
        setNotificationDetails({ msg: res.data.msg || "Couldn't save the changes.", type: "danger" });
      }
    } catch (error) {
      setNotificationDetails({
        msg: error.response?.data?.msg || "Couldn't reach the server.",
        type: "danger",
      });
    }
    setNotificationStatus(true);
  }

  function statusKind(status) {
    if (status === "active") return "ok";
    if (status === "in-active") return "bad";
    return "warn";
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
        <SectionTabs label="People" tabs={peopleTabs} />
        {mode === "all" ? (
          <>
            <Card className="ecms-list">
              <ListHeader
                title="Residents"
                count={pagination.count}
                onSearch={(value) => {
                  setSearch(value);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                searchPlaceholder="Search residents"
                actionLabel="Add resident"
                onAction={() => {
                  setMode("add");
                  setCurrent({});
                }}
              />
              <CardBody>
                <Table responsive>
                  <thead>
                    <tr>
                      <SortHeader field="name" sort={sort} onSort={sortBy}>
                        Resident
                      </SortHeader>
                      <SortHeader field="age" sort={sort} onSort={sortBy}>
                        Age
                      </SortHeader>
                      <SortHeader field="phone" sort={sort} onSort={sortBy}>
                        Phone
                      </SortHeader>
                      <SortHeader field="status" sort={sort} onSort={sortBy}>
                        Status
                      </SortHeader>
                      <th className="ecms-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 && (
                      <tr>
                        <td colSpan={5} className="ecms-empty">
                          No residents found.
                        </td>
                      </tr>
                    )}
                    {clients.map((items, key) => (
                      <tr key={key}>
                        <td>
                          <PersonCell
                            name={`${items.first_name} ${items.last_name}`}
                            email={items.email}
                          />
                        </td>
                        <td data-label="Age">
                          {getAge(items.dob) >= 0 ? getAge(items.dob) : "–"}
                        </td>
                        <td className="ecms-muted" data-label="Phone">
                          {items.phone || "–"}
                        </td>
                        <td data-label="Status">
                          <span
                            className={
                              "ecms-status ecms-status--" + statusKind(items.status)
                            }
                          >
                            {items.status}
                          </span>
                        </td>
                        <td className="ecms-actions">
                          <IconButton
                            label={`View ${items.first_name} ${items.last_name}`}
                            onClick={() => {
                              setMode("view");
                              setCurrent(items);
                            }}
                          >
                            <FiEye />
                          </IconButton>
                          <AccountStatusButton
                            person={items}
                            onChanged={(updated) => {
                              setClients((list) =>
                                list.map((u) => (u._id === updated._id ? updated : u)),
                              );
                              setNotificationDetails({
                                msg:
                                  updated.status === "in-active"
                                    ? `${updated.first_name} ${updated.last_name} has been deactivated.`
                                    : `${updated.first_name} ${updated.last_name} is active again.`,
                                type: "success",
                              });
                              setNotificationStatus(true);
                            }}
                            onError={(msg) => {
                              setNotificationDetails({ msg, type: "danger" });
                              setNotificationStatus(true);
                            }}
                          />
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
                    <CardTitle tag="h5">Add resident</CardTitle>
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
                      <BsArrowBarLeft size={20} /> Back to residents
                    </button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <Form onSubmit={(e) => addClient(e)}>
                  <Row>
                    <Col className="pr-1" md="6">
                      <FormGroup>
                        <label>First Name</label>
                        <Input
                          defaultValue={current.first_name}
                          type="text"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              first_name: e.target.value,
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="6">
                      <FormGroup>
                        <label>Last Name</label>
                        <Input
                          defaultValue={current.last_name}
                          type="text"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              last_name: e.target.value,
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row>
                    <Col className="pr-1" md="6">
                      <FormGroup>
                        <label>Email</label>
                        <Input
                          defaultValue={current.email}
                          onChange={(e) =>
                            setCurrent({ ...current, email: e.target.value })
                          }
                          type="text"
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="6">
                      <FormGroup>
                        <label htmlFor="exal1">Phone</label>
                        <Input
                          placeholder="Phone"
                          type="text"
                          defaultValue={current.phone}
                          onChange={(e) =>
                            setCurrent({ ...current, phone: e.target.value })
                          }
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col className="pr-1" md="6">
                      <FormGroup>
                        <label>Date of Birth</label>
                        <Input
                          defaultValue={current.dob}
                          type="date"
                          onChange={(e) =>
                            setCurrent({ ...current, dob: e.target.value })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col md="6" className="pl-1">
                      <FormGroup>
                        <label>Address</label>
                        <Input
                          placeholder="Home Address"
                          type="text"
                          onChange={(e) =>
                            setCurrent({ ...current, address: e.target.value })
                          }
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  <hr></hr>
                  <h6> Medical</h6>

                  <Row>
                    <Col className="pr-1" md="3">
                      <FormGroup>
                        <label>GP</label>
                        <Input
                          placeholder="e.g. Dr Patel, Riverside Surgery"
                          type="text"
                          defaultValue={current?.Medical?.gp_name}
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              Medical: {
                                ...current.Medical,
                                gp_name: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="px-1" md="3">
                      <FormGroup>
                        <label>GP phone</label>
                        <Input
                          placeholder="Surgery phone number"
                          type="tel"
                          defaultValue={current?.Medical?.gp_phone}
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              Medical: {
                                ...current.Medical,
                                gp_phone: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>

                    <Col className="pl-1" md="6">
                      <FormGroup>
                        <label htmlFor="example">Allergies?</label>
                        <Input
                          placeholder="Allergies"
                          type="text"
                          defaultValue={current?.Medical?.allergy}
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              Medical: {
                                ...current.Medical,
                                allergy: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col md="12">
                      <FormGroup>
                        <label htmlFor="exampleInpu">Others</label>
                        <Input
                          placeholder="Other Info"
                          type="text"
                          defaultValue={current?.Medical?.others}
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              Medical: {
                                ...current.Medical,
                                others: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  <hr></hr>
                  <h6> Next of Kin</h6>
                  <Row>
                    <Col className="pr-1" md="3">
                      <FormGroup>
                        <label>Name</label>
                        <Input
                          defaultValue={current?.NextOfKin?.name}
                          type="text"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              NextOfKin: {
                                ...current.NextOfKin,
                                name: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="px-1" md="3">
                      <FormGroup>
                        <label>Phone</label>
                        <Input
                          defaultValue={current?.NextOfKin?.phone}
                          type="text"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              NextOfKin: {
                                ...current.NextOfKin,
                                phone: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="px-1" md="3">
                      <FormGroup>
                        <label>Address</label>
                        <Input
                          defaultValue={current?.NextOfKin?.address}
                          type="text"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              NextOfKin: {
                                ...current.NextOfKin,
                                address: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="3">
                      <FormGroup>
                        <label>Relationship</label>
                        <Input
                          placeholder="Relationship"
                          type="select"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              NextOfKin: {
                                ...current.NextOfKin,
                                relationship: e.target.value,
                              },
                            })
                          }
                        >
                          <option disabled selected>
                            Select Relative...
                          </option>
                          {[
                            "Father",
                            "Mother",
                            "Brother",
                            "Sister",
                            "Cousin",
                            "Relative",
                            "Friend",
                          ].map((stat, key) => {
                            return <option key={key}>{stat}</option>;
                          })}
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>
                  <hr></hr>
                  <h6> Emergency Contact</h6>
                  <Row>
                    <Col className="pr-1" md="3">
                      <FormGroup>
                        <label>Name</label>
                        <Input
                          defaultValue={current?.EmergencyContact?.name}
                          type="text"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              EmergencyContact: {
                                ...current.EmergencyContact,
                                name: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="px-1" md="3">
                      <FormGroup>
                        <label>Phone</label>
                        <Input
                          defaultValue={current?.EmergencyContact?.phone}
                          type="text"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              EmergencyContact: {
                                ...current.EmergencyContact,
                                phone: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="px-1" md="3">
                      <FormGroup>
                        <label>Address</label>
                        <Input
                          defaultValue={current?.EmergencyContact?.address}
                          type="text"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              EmergencyContact: {
                                ...current.EmergencyContact,
                                address: e.target.value,
                              },
                            })
                          }
                        />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="3">
                      <FormGroup>
                        <label>Relationship</label>
                        <Input
                          placeholder="Relationship"
                          type="select"
                          onChange={(e) =>
                            setCurrent({
                              ...current,
                              EmergencyContact: {
                                ...current.EmergencyContact,
                                relationship: e.target.value,
                              },
                            })
                          }
                        >
                          <option disabled selected>
                            Select Relative...
                          </option>
                          {[
                            "Father",
                            "Mother",
                            "Brother",
                            "Sister",
                            "Cousin",
                            "Relative",
                          ].map((stat, key) => {
                            return <option key={key}>{stat}</option>;
                          })}
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <div className="update ml-auto mr-auto">
                      <Button
                        className="btn-round"
                        color="primary"
                        type="submit"
                      >
                        Add resident
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
              <BsArrowBarLeft size={20} /> Back to residents
            </button>

            <Row>
              <Col md={8}>
                <Card className="card-user">
                  <div style={{ textAlign: "center" }}>
                    <h4 style={{ marginTop: "10px" }}>
                      {current.first_name + " " + current.last_name}
                    </h4>
                    <FaUserCircle size={100} />
                    <h5 style={{ marginTop: "10px" }}>
                      {getAge(current.dob) + " Years Old"}
                    </h5>
                  </div>

                  <CardBody>
                    <Form>
                      <Row>
                        <Col className="pr-1" md="6">
                          <FormGroup>
                            <label>First Name</label>
                            <Input
                              defaultValue={current.first_name}
                              type="text"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  first_name: e.target.value,
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col className="pl-1" md="6">
                          <FormGroup>
                            <label>Last Name</label>
                            <Input
                              defaultValue={current.last_name}
                              type="text"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  last_name: e.target.value,
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <Col className="pr-1" md="6">
                          <FormGroup>
                            <label>Email</label>
                            <Input
                              defaultValue={current.email}
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  email: e.target.value,
                                })
                              }
                              type="text"
                            />
                          </FormGroup>
                        </Col>
                        <Col className="pl-1" md="6">
                          <FormGroup>
                            <label htmlFor="exampleInputEmail1">Phone</label>
                            <Input
                              placeholder="Phone"
                              type="text"
                              defaultValue={current.phone}
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  phone: e.target.value,
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                      </Row>

                      <Row>
                        <Col className="pr-1" md="6">
                          <FormGroup>
                            <label>Date of Birth</label>
                            <Input
                              defaultValue={current.dob}
                              type="date"
                              onChange={(e) =>
                                setCurrent({ ...current, dob: e.target.value })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col md="6" className="pl-1">
                          <FormGroup>
                            <label>Status</label>
                            <Input
                              placeholder="Status"
                              type="select"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  status: e.target.value,
                                })
                              }
                            >
                              <option>{current.status}</option>
                              {["active", "on-leave", "in-active"].map((stat, key) => {
                                return (
                                  <>
                                    {current.status !== stat ? (
                                      <option>{stat}</option>
                                    ) : null}
                                  </>
                                );
                              })}
                            </Input>
                          </FormGroup>
                        </Col>
                        <Col md="12">
                          <FormGroup>
                            <label>Address</label>
                            <Input
                              defaultValue={current.address}
                              placeholder="Home Address"
                              type="text"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  address: e.target.value,
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                      </Row>

                      <hr></hr>
                      <h6> Medical</h6>

                      <Row>
                        <Col className="pr-1" md="3">
                          <FormGroup>
                            <label>GP</label>
                            <Input
                              placeholder="e.g. Dr Patel, Riverside Surgery"
                              type="text"
                              defaultValue={current?.Medical?.gp_name}
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  Medical: {
                                    ...current.Medical,
                                    gp_name: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col className="px-1" md="3">
                          <FormGroup>
                            <label>GP phone</label>
                            <Input
                              placeholder="Surgery phone number"
                              type="tel"
                              defaultValue={current?.Medical?.gp_phone}
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  Medical: {
                                    ...current.Medical,
                                    gp_phone: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>

                        <Col className="pl-1" md="6">
                          <FormGroup>
                            <label htmlFor="exaple">Allergies?</label>
                            <Input
                              placeholder="Allergies"
                              type="text"
                              defaultValue={current?.Medical?.allergy}
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  Medical: {
                                    ...current.Medical,
                                    allergy: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col md="12">
                          <FormGroup>
                            <label htmlFor="exampleInpu">Others</label>
                            <Input
                              placeholder="Other Info"
                              type="text"
                              defaultValue={current?.Medical?.others}
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  Medical: {
                                    ...current.Medical,
                                    others: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <hr></hr>
                      <h6> Next of Kin</h6>
                      <Row>
                        <Col className="pr-1" md="3">
                          <FormGroup>
                            <label>Name</label>
                            <Input
                              defaultValue={current?.NextOfKin?.name}
                              type="text"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  NextOfKin: {
                                    ...current.NextOfKin,
                                    name: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col className="px-1" md="3">
                          <FormGroup>
                            <label>Phone</label>
                            <Input
                              defaultValue={current?.NextOfKin?.phone}
                              type="text"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  NextOfKin: {
                                    ...current.NextOfKin,
                                    phone: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col className="px-1" md="3">
                          <FormGroup>
                            <label>Address</label>
                            <Input
                              defaultValue={current?.NextOfKin?.address}
                              type="text"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  NextOfKin: {
                                    ...current.NextOfKin,
                                    address: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col md="3" className="pl-1">
                          <FormGroup>
                            <label>Relationship</label>
                            <Input
                              placeholder="Relationship"
                              type="select"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  NextOfKin: {
                                    ...current.NextOfKin,
                                    relationship: e.target.value,
                                  },
                                })
                              }
                            >
                              <option>
                                {current?.NextOfKin?.relationship ||
                                  "Select Relationship..."}
                              </option>
                              {[
                                "Father",
                                "Mother",
                                "Brother",
                                "Sister",
                                "Cousin",
                                "Relative",
                                "friend",
                              ].map((stat, key) => {
                                return (
                                  <>
                                    {current?.NextOfKin?.relationship !==
                                    stat ? (
                                      <option>{stat}</option>
                                    ) : null}
                                  </>
                                );
                              })}
                            </Input>
                          </FormGroup>
                        </Col>
                      </Row>
                      <hr></hr>
                      <h6> Emergency Contact</h6>
                      <Row>
                        <Col className="pr-1" md="3">
                          <FormGroup>
                            <label>Name</label>
                            <Input
                              defaultValue={current?.EmergencyContact?.name}
                              type="text"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  EmergencyContact: {
                                    ...current.EmergencyContact,
                                    name: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col className="px-1" md="3">
                          <FormGroup>
                            <label>Phone</label>
                            <Input
                              defaultValue={current?.EmergencyContact?.phone}
                              type="text"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  EmergencyContact: {
                                    ...current.EmergencyContact,
                                    phone: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col className="px-1" md="3">
                          <FormGroup>
                            <label>Address</label>
                            <Input
                              defaultValue={current?.EmergencyContact?.address}
                              type="text"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  EmergencyContact: {
                                    ...current.EmergencyContact,
                                    address: e.target.value,
                                  },
                                })
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col md="3" className="pl-1">
                          <FormGroup>
                            <label>Relationship</label>
                            <Input
                              placeholder="Relationship"
                              type="select"
                              onChange={(e) =>
                                setCurrent({
                                  ...current,
                                  EmergencyContact: {
                                    ...current.EmergencyContact,
                                    relationship: e.target.value,
                                  },
                                })
                              }
                            >
                              <option>
                                {current?.EmergencyContact?.relationship ||
                                  "Select Relationship"}
                              </option>
                              {[
                                "Father",
                                "Mother",
                                "Brother",
                                "Sister",
                                "Cousin",
                                "Relative",
                                "Friend",
                              ].map((stat, key) => {
                                return (
                                  <>
                                    {current?.EmergencyContact?.relationship !==
                                    stat ? (
                                      <option>{stat}</option>
                                    ) : null}
                                  </>
                                );
                              })}
                            </Input>
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <div className="update ml-auto mr-auto">
                          <Button
                            className="btn-round"
                            color="primary"
                            type="submit"
                            onClick={updateClient}
                          >
                            Save changes
                          </Button>
                        </div>
                      </Row>
                    </Form>
                  </CardBody>
                </Card>
              </Col>
              <Col md={4}>
                <Link to={`/admin/care/${current._id}`} className="btn btn-primary" style={{ width: "100%", marginBottom: 16 }}>
                  Open care record
                </Link>
                <ContractsCard
                  contracts={current.Contracts || []}
                  onAdd={() =>
                    history.push("/admin/contracts", { addFor: current.email })
                  }
                />
              </Col>
            </Row>
            {current._id && <FamilyMembers resident={current} />}
          </>
        ) : null}
      </div>
    </>
  );
}

export default Clients;
