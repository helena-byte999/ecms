import React, { useState } from "react";
import Axios from "axios";
import { Link, useHistory } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiFileText,
  FiHeart,
  FiLoader,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import Brand from "components/Brand.js";
import { authenticate } from "../../data/api";
import { useAuth } from "../../contexts/AuthContext";
import "./login.css";

const DEMO = process.env.REACT_APP_DEMO === "true";

const demoRoles = [
  {
    role: "admin",
    icon: <FiShield />,
    title: "Administrator",
    text: "Manage people, contracts, rotas and invoices",
  },
  {
    role: "caregiver",
    icon: <FiHeart />,
    title: "Caregiver",
    text: "See this week's shifts and your contract",
  },
  {
    role: "client",
    icon: <FiUsers />,
    title: "Client or family",
    text: "See the care contract and invoices",
  },
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(null);
  const [slow, setSlow] = useState(false);
  const history = useHistory();
  const { getLoggedIn } = useAuth();

  // `which` is "form" or a demo role, so only the clicked button shows progress
  async function signIn(which, request) {
    setMessage("");
    setSubmitting(which);
    // free hosting sleeps when idle; explain the wait instead of looking broken
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    try {
      const { data } = await request();
      if (data.auth === true) {
        window.localStorage.setItem("token", data.token);
        const user = await getLoggedIn();
        clearTimeout(slowTimer);
        history.push(`/${user.role}/dashboard`);
        return;
      }
      setMessage(data.msg);
    } catch (err) {
      setMessage(
        err.response?.data?.msg ||
          "We couldn't reach the server. Please try again in a moment.",
      );
    }
    clearTimeout(slowTimer);
    setSlow(false);
    setSubmitting(null);
  }

  function loginFunc(e) {
    e.preventDefault();
    const nemail = email.toLowerCase().replace(/ /g, "");
    signIn("form", () =>
      Axios.post(authenticate.userAuth, { email: nemail, password }),
    );
  }

  function demoLogin(role) {
    signIn(role, () => Axios.post(authenticate.demoAuth, { role }));
  }

  return (
    <div className="ecms-login">
      <div className="ecms-login__main">
        <div className="ecms-login__top">
          <Link to="/" aria-label="ECMS home">
            <Brand />
          </Link>
          <Link to="/" className="ecms-login__back">
            <FiArrowLeft aria-hidden="true" /> Back to home
          </Link>
        </div>

        <div className="ecms-login__card">
          <h1>{DEMO ? "Try ECMS" : "Welcome back"}</h1>
          <p className="ecms-login__sub">
            {DEMO
              ? "Explore the live demo as any role. No sign-up needed."
              : "Sign in to your ECMS account to continue."}
          </p>

          {message && (
            <div className="ecms-login__error" role="alert">
              <FiAlertCircle aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}
          {slow && (
            <div className="ecms-login__wait" role="status">
              <FiLoader aria-hidden="true" />
              <span>
                Waking up the server. The free hosting sleeps when it's idle,
                so this can take up to a minute.
              </span>
            </div>
          )}

          {DEMO && (
            <>
              <div className="ecms-login__demo">
                {demoRoles.map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    className="ecms-login__demo-btn"
                    onClick={() => demoLogin(d.role)}
                    disabled={!!submitting}
                  >
                    <span className="ecms-login__demo-icon">{d.icon}</span>
                    <span className="ecms-login__demo-text">
                      <strong>
                        {submitting === d.role
                          ? "Signing in…"
                          : `Try as ${d.title.toLowerCase()}`}
                      </strong>
                      <small>{d.text}</small>
                    </span>
                    <FiArrowRight aria-hidden="true" />
                  </button>
                ))}
              </div>
              <p className="ecms-login__demo-note">
                Sample data only. It resets every night.
              </p>
              <div className="ecms-login__divider">
                <span>or sign in with an account</span>
              </div>
            </>
          )}

          <form onSubmit={loginFunc} noValidate>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={!!submitting}>
              {submitting === "form" ? "Signing in…" : "Sign in"}
              {submitting !== "form" && <FiArrowRight aria-hidden="true" />}
            </button>
          </form>

          <p className="ecms-login__note">
            Accounts are created by your care administrator. Ask them if you
            need access.
          </p>
        </div>
      </div>

      <aside className="ecms-login__side" aria-hidden="true">
        <div className="ecms-login__side-inner">
          <span className="ecms-login__pill">ECMS for care teams</span>
          <h2>Contracts, rotas and invoices, all in one place.</h2>
          <p>
            Administrators, caregivers and clients each get a dashboard built
            for what they need to do.
          </p>
          <div className="ecms-login__cards">
            <div>
              <span className="ecms-login__icon ecms-login__icon--ok">
                <FiCheck />
              </span>
              <span>
                <strong>Contract valid</strong>
                <small>Renewal due Feb 2027</small>
              </span>
            </div>
            <div>
              <span className="ecms-login__icon">
                <FiCalendar />
              </span>
              <span>
                <strong>Week 42 rota ready</strong>
                <small>5 caregivers per shift</small>
              </span>
            </div>
            <div>
              <span className="ecms-login__icon ecms-login__icon--amber">
                <FiFileText />
              </span>
              <span>
                <strong>3 new invoices</strong>
                <small>October care packages</small>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Login;
