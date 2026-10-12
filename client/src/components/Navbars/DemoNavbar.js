import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { FiLogOut } from "react-icons/fi";
import Modal from "react-modal";

import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
  Container,
  Button,
} from "reactstrap";

function Header({ props, routes }) {
  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
    },
  };
  const [modalIsOpen, setIsModalOpen] = useState(false);

  const [isOpen, setIsOpen] = React.useState(false);
  const [color, setColor] = React.useState("transparent");
  const sidebarToggle = React.useRef();
  const location = useLocation();
  const { userDetail } = useAuth();
  const initials =
    ((userDetail.first_name || "")[0] || "") +
      ((userDetail.last_name || "")[0] || "") || "?";
  const toggle = () => {
    if (isOpen) {
      setColor("transparent");
    } else {
      setColor("dark");
    }
    setIsOpen(!isOpen);
  };

  const getBrand = () => {
    let brandName = "Default";
    routes.map((prop, key) => {
      if (window.location.href.indexOf(prop.layout + prop.path) !== -1) {
        brandName = prop.name;
      }
      return null;
    });
    return brandName;
  };
  const openSidebar = () => {
    document.documentElement.classList.toggle("nav-open");
    sidebarToggle.current.classList.toggle("toggled");
  };
  // function that adds color dark/transparent to the navbar on resize (this is for the collapse)
  const updateColor = () => {
    if (window.innerWidth < 993 && isOpen) {
      setColor("dark");
    } else {
      setColor("transparent");
    }
  };
  React.useEffect(() => {
    window.addEventListener("resize", updateColor.bind(this));
  });
  React.useEffect(() => {
    if (
      window.innerWidth < 993 &&
      document.documentElement.className.indexOf("nav-open") !== -1
    ) {
      document.documentElement.classList.toggle("nav-open");
      sidebarToggle.current.classList.toggle("toggled");
    }
  }, [location]);
  const { getLoggedIn } = useAuth();

  async function logout() {
    try {
      window.localStorage.removeItem("token");
      await getLoggedIn();
    } catch (e) {
      alert(e);
    }
  }
  return (
    // add or remove classes depending if we are on full-screen-maps page or not
    <Navbar
      color={
        props.location.pathname.indexOf("full-screen-maps") !== -1
          ? "dark"
          : color
      }
      expand="lg"
      className={
        props.location.pathname.indexOf("full-screen-maps") !== -1
          ? "navbar-absolute fixed-top"
          : "navbar-absolute fixed-top " +
            (color === "transparent" ? "navbar-transparent " : "")
      }
    >
      <Container fluid>
        <div className="navbar-wrapper">
          <div className="navbar-toggle">
            <button
              type="button"
              ref={sidebarToggle}
              className="navbar-toggler"
              onClick={() => openSidebar()}
            >
              <span className="navbar-toggler-bar bar1" />
              <span className="navbar-toggler-bar bar2" />
              <span className="navbar-toggler-bar bar3" />
            </button>
          </div>

        </div>
        <NavbarBrand href="/">{getBrand()}</NavbarBrand>
        <NavbarToggler onClick={toggle}>
          <span className="navbar-toggler-bar navbar-kebab" />
          <span className="navbar-toggler-bar navbar-kebab" />
          <span className="navbar-toggler-bar navbar-kebab" />
        </NavbarToggler>
        <Collapse isOpen={isOpen} navbar className="justify-content-end">
          <Nav navbar className="ecms-navactions">
            <NavItem>
              <Link
                to={`/${userDetail.role}/user-page`}
                className="ecms-userchip"
                title="Your profile"
              >
                <span className="ecms-avatar">{initials}</span>
                <span className="ecms-userchip__text">
                  <strong>
                    {[userDetail.first_name, userDetail.last_name]
                      .filter(Boolean)
                      .join(" ")}
                  </strong>
                  <small>{userDetail.role}</small>
                </span>
              </Link>
            </NavItem>
            <NavItem>
              <button
                type="button"
                className="ecms-btn-ghost"
                onClick={() => setIsModalOpen(true)}
              >
                <FiLogOut aria-hidden="true" /> Sign out
              </button>
            </NavItem>
          </Nav>
        </Collapse>
      </Container>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setIsModalOpen(false)}
        style={customStyles}
        contentLabel="Sign out"
      >
        <div className="ecms-dialog">
          <h4>Sign out of ECMS?</h4>
          <p>You'll need your email and password to sign back in.</p>
          <div className="ecms-dialog__actions">
            <Button type="button" onClick={() => setIsModalOpen(false)}>
              Stay signed in
            </Button>
            <Button color="primary" type="button" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </Modal>
    </Navbar>
  );
}

export default Header;
