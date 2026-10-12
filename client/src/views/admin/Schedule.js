import React, { useState, useEffect } from "react";
import axios from "axios";
import { schedule } from "data/api";
import { BsArrowBarLeft } from "react-icons/bs";
import {
  ListHeader,
  DateCell,
  AvatarStack,
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

function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [notificationStatus, setNotificationStatus] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState({
    msg: "",
    type: "",
  });
  const [mode, setMode] = useState("all");
  const [current, setCurrent] = useState({});
  const [pagination, setPagination] = useState({ current: 1 });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({});
  const [date, setDate] = useState({});
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  useEffect(
    () => {
      async function fetchSchedules() {
        await axios
          .get(schedule.showAllSchedules, { params: {
              current: pagination.current,
              search,
              sort: sort.field,
              order: sort.order,
            } })
          .then((response) => {
            if (response.data.status === true) {
              setSchedules(response.data.data);
              if (response.data.data.length > 0) {
                let temp = new Date(response.data.data[0].end_date);
                temp = temp.setDate(temp.getDate() + 1);
                getFirstAndLast(temp);
              }

              setPagination((p) => ({ ...p, count: response.data.count }));
            } else {
              setNotificationDetails({
                msg: "Error Loading Schedules, Please Referesh The Page",
                type: "danger",
              });
              setNotificationStatus(true);
            }
          });
      }
      fetchSchedules();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, pagination.current, sort],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps

  function getFirstAndLast(f) {
    let wDate = new Date();

    if (f) {
      // parse as local midnight; new Date("YYYY-MM-DD") is UTC and shifts the day west of UTC
      wDate = new Date(f + "T00:00:00");
    }
    let dDay = wDate.getDay() > 0 ? wDate.getDay() : 7;
    let first = wDate.getDate() - dDay + 1;
    let firstDayWeek = new Date(wDate.setDate(first));
    let lastDayWeek = new Date(wDate.setDate(firstDayWeek.getDate() + 6));

    var firstJanuary = new Date(wDate.getFullYear(), 0, 1);
    var dayNr = Math.ceil((wDate - firstJanuary) / (24 * 60 * 60 * 1000));
    var week = Math.ceil((dayNr + firstJanuary.getDay()) / 7);

    // local calendar date (toISOString would convert to UTC and can shift the day)
    const ymd = (d) =>
      [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
    setDate((d) => ({
      ...d,
      first: ymd(firstDayWeek),
      last: ymd(lastDayWeek),
      week,
    }));
  }

  async function addSchedule(e) {
    e.preventDefault();
    await axios
      .post(schedule.addSchedule, date)
      .then((res) => {
        if (res.data.status) {
          const saved = res.data.data;
          const exists = schedules.some((s) => s._id === saved._id);
          setNotificationDetails({
            msg: `${exists ? "Rota regenerated" : "Rota generated"} for week ${saved.week}: ${res.data.perDay} caregivers per day from ${res.data.caregivers} active.`,
            type: "success",
          });
          // regenerating a week replaces its row instead of adding a duplicate
          setSchedules(
            exists
              ? schedules.map((s) => (s._id === saved._id ? saved : s))
              : [saved, ...schedules],
          );
          if (!exists)
            setPagination((p) => ({ ...p, count: (p.count || 0) + 1 }));
        } else {
          setNotificationDetails({
            msg: "Error Adding Schedule.",
            type: "danger",
          });
        }
        setNotificationStatus(true);
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
                title="Schedules"
                count={pagination.count}
                onSearch={(value) => {
                  setSearch(value);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                searchPlaceholder="Search schedules"
                actionLabel="Generate rota"
                onAction={() => {
                  setMode("add");
                  setCurrent({});
                }}
              />
              <CardBody>
                <Table responsive>
                  <thead>
                    <tr>
                      <SortHeader field="week" sort={sort} onSort={sortBy}>
                        Week
                      </SortHeader>
                      <SortHeader field="dates" sort={sort} onSort={sortBy}>
                        Dates
                      </SortHeader>
                      <th>Staff on rota</th>
                      <th className="ecms-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.length === 0 && (
                      <tr>
                        <td colSpan={4} className="ecms-empty">
                          No schedules found.
                        </td>
                      </tr>
                    )}
                    {schedules.map((items, key) => (
                      <tr key={key}>
                        <td>
                          <strong className="ecms-amount">Week {items.week}</strong>
                        </td>
                        <td data-label="Dates">
                          <DateCell value={items.start_date} to={items.end_date} />
                        </td>
                        <td data-label="Staff">
                          <AvatarStack
                            names={[
                              ...new Set(
                                Object.values(items.schedule || {})
                                  .flat()
                                  .map((s) => s.name),
                              ),
                            ]}
                          />
                        </td>
                        <td className="ecms-actions">
                          <IconButton label="View details" onClick={() => {
                              setMode("view");
                              setCurrent(items);
                            }}>
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

        {mode === "add" ? (
          <>
            <Card className="card-user">
              <CardHeader>
                <Row style={{ marginBottom: "-20px" }}>
                  <Col>
                    <CardTitle tag="h5">Generate Schedule</CardTitle>
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
                      <BsArrowBarLeft size={20} /> Back to Schedules
                    </button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <Form>
                  <Row>
                    <Col className="pr-1" md="3">
                      <FormGroup>
                        <label>Start Date</label>
                        <Input
                          value={date.first}
                          type="date"
                          onChange={(e) => getFirstAndLast(e.target.value)}
                        />
                      </FormGroup>
                    </Col>
                    <Col className="px-1" md="3">
                      <FormGroup>
                        <label>End Date</label>
                        <Input value={date.last} type="date" disabled={true} />
                      </FormGroup>
                    </Col>
                    <Col className="px-1" md="3">
                      <FormGroup>
                        <label>Week</label>
                        <Input value={date.week} type="text" disabled={true} />
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="3">
                      <FormGroup>
                        <label htmlFor="rota-per-day">Caregivers per day</label>
                        <Input
                          id="rota-per-day"
                          type="number"
                          min={1}
                          max={20}
                          value={date.per_day ?? 5}
                          onChange={(e) =>
                            setDate({ ...date, per_day: e.target.value })
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
                        onClick={addSchedule}
                      >
                        Generate rota
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
              <Col col={12}>
                <Card className="card-user">
                  <CardBody>
                    <Table responsive>
                      <thead>
                        <tr>
                          <th>Days</th>
                          <th>Staff on Duty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(current.schedule).map((items, key) => {
                          return (
                            <tr key={key}>
                              <td className="ecms-rota-day">{days[key]}</td>
                              <td>
                                <div className="ecms-chips">
                                  {items.map((stf, index) => (
                                    <span
                                      key={index}
                                      className={"ecms-chip"}
                                      title={stf.email}
                                    >
                                      {stf.name}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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

export default Schedules;
