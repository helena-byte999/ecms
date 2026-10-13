import React, { useState } from "react";
import { useAuth } from "contexts/AuthContext";
import Notifications from "components/Notification/Notification";
import { FaUserCircle } from "react-icons/fa";
// reactstrap components
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  FormGroup,
  Form,
  Row,
  Col,
} from "reactstrap";
import ChangePassword from "components/ui/ChangePassword.js";

function User() {
  const { userDetail } = useAuth();
  const [profile] = useState(userDetail);
  const [notificationStatus] = useState(false);
  const [notificationDetails] = useState({ msg: "", type: "" });

  return (
    <>
      {notificationStatus ? (
        <Notifications details={notificationDetails} />
      ) : null}
      <div className="content">
        <Row>
          <Col md="4">
            <Card className="card-user">
              <div className="image"></div>
              <CardBody style={{ minHeight: "unset", textAlign: "center" }}>
                <div className="author" style={{ textAlign: "center" }}>
                  <a href="#pablo" onClick={(e) => e.preventDefault()}>
                    <FaUserCircle size={100} />
                    <h5 className="title">
                      {profile.first_name + " " + profile.last_name}
                    </h5>
                  </a>
                  <p className="description">@{profile.email}</p>
                </div>
              </CardBody>
            </Card>
            <ChangePassword />
          </Col>
          <Col md="8">
            <Card className="card-user">
              <CardHeader>
                <CardTitle tag="h5">User Profile</CardTitle>
              </CardHeader>
              <CardBody>
                <Form>
                  <Row>
                    <Col className="pr-1" md="6">
                      <FormGroup>
                        <label>Email</label>
                        <br />
                        {profile.email}
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="6">
                      <FormGroup>
                        <label htmlFor="exampleInputEmail1">Phone</label>
                        <br />
                        {profile.phone}
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row>
                    <Col className="pr-1" md="6">
                      <FormGroup>
                        <label>First Name</label>
                        <br />
                        {profile.first_name}
                      </FormGroup>
                    </Col>
                    <Col className="pl-1" md="6">
                      <FormGroup>
                        <label>Last Name</label>
                        <br />
                        {profile.last_name}
                      </FormGroup>
                    </Col>
                  </Row>
                  {profile.role === "family" ? (
                  <Row>
                    <Col md="12">
                      <FormGroup>
                        <label>Family member of</label>
                        <br />
                        {[profile.resident?.first_name, profile.resident?.last_name].join(" ")}
                        {profile.relationship ? ` (${profile.relationship})` : ""}
                      </FormGroup>
                    </Col>
                  </Row>
                  ) : null}
                </Form>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default User;
