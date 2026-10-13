import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Nav } from "reactstrap";
import Brand from "components/Brand.js";
import { FiChevronsLeft, FiChevronsRight } from "react-icons/fi";

// javascript plugin used to create scrollbars on windows
import PerfectScrollbar from "perfect-scrollbar";

const KEY = "ecms.sidebar.collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch (e) {
    return false;
  }
};

var ps;

function Sidebar(props) {
  const sidebar = React.useRef();
  // Collapse to icons on wide screens (remembered per browser)
  const [collapsed, setCollapsed] = React.useState(readCollapsed);
  React.useEffect(() => {
    document.body.classList.toggle("ecms-sidebar-mini", collapsed);
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch (e) {}
    return () => document.body.classList.remove("ecms-sidebar-mini");
  }, [collapsed]);
  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName) => {
    return props.location.pathname.indexOf(routeName) > -1 ? "active" : "";
  };
  React.useEffect(() => {
    if (navigator.platform.indexOf("Win") > -1) {
      ps = new PerfectScrollbar(sidebar.current, {
        suppressScrollX: true,
        suppressScrollY: false,
      });
    }
    return function cleanup() {
      if (navigator.platform.indexOf("Win") > -1) {
        ps.destroy();
      }
    };
  });
  return (
    <div
      className="sidebar"
      data-color={props.bgColor}
      data-active-color={props.activeColor}
    >
      <div className="logo">
        <Link to="/" aria-label="ECMS home">
          <Brand light />
        </Link>
      </div>
      <div className="sidebar-wrapper" ref={sidebar}>
        <Nav>
          {props.routes.map((prop, key) => {
            if (prop.hidden) return null;
            return (
              <li
                className={
                  activeRoute(prop.path) + (prop.pro ? " active-pro" : "")
                }
                key={key}
              >
                <NavLink
                  to={prop.layout + prop.path}
                  className="nav-link"
                  activeClassName="active"
                  title={collapsed ? prop.name : undefined}
                >
                  {prop.icon_comp ? (
                    <>
                      {prop.icon_comp}
                      <span>{prop.name}</span>
                    </>
                  ) : (
                    <>
                      <i className={prop.icon} />
                      <p>{prop.name}</p>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </Nav>
      </div>
      <button
        type="button"
        className="ecms-collapse"
        onClick={() => setCollapsed(!collapsed)}
        aria-pressed={collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <FiChevronsRight aria-hidden="true" /> : <FiChevronsLeft aria-hidden="true" />}
        <span>Collapse</span>
      </button>
    </div>
  );
}

export default Sidebar;
