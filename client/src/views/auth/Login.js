import React, { useState } from "react";
import Axios from "axios";
import { Link, useHistory } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiFileText,
} from "react-icons/fi";
import HealthIcon from "components/HealthIcon.js";
import Brand, { BrandMark } from "components/Brand.js";
import { authenticate } from "../../data/api";
import { useAuth } from "../../contexts/AuthContext";
import "./login.css";
// Pexels video 7522210 (free Pexels licence), the same footage as the landing page
import photo from "../home/media/care-home-poster.jpg";

// Photo outline with two stepped, rounded corners (0-1 units, for a 6:7 box)
const PHOTO_SHAPE =
  "M0.3767,0 H0.94 A0.06,0.0514 0 0 1 1,0.0514 V0.7914 A0.06,0.0514 0 0 1 0.94,0.8429 H0.81 A0.06,0.0514 0 0 0 0.75,0.8943 V0.9486 A0.06,0.0514 0 0 1 0.69,1 H0.06 A0.06,0.0514 0 0 1 0,0.9486 V0.2229 A0.06,0.0514 0 0 1 0.06,0.1714 H0.2567 A0.06,0.0514 0 0 0 0.3167,0.12 V0.0514 A0.06,0.0514 0 0 1 0.3767,0 Z";

const DEMO = process.env.REACT_APP_DEMO === "true";

const demoRoles = [
  {
    role: "admin",
    icon: <HealthIcon name="hospital" size={20} />,
    title: "Administrator",
    text: "Manage people, contracts, rotas and invoices",
  },
  {
    role: "caregiver",
    icon: <HealthIcon name="nurse" size={20} />,
    title: "Caregiver",
    text: "See this week's shifts and your contract",
  },
  {
    role: "family",
    icon: <HealthIcon name="family" size={20} />,
    title: "Family member",
    text: "Follow Margaret's care, medicines and invoices",
  },
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(null);
  const [slow, setSlow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="ecms-login__shell">
        <div className="ecms-login__main">
          <Link to="/" className="ecms-login__back">
            <FiArrowLeft aria-hidden="true" /> Back to home
          </Link>

          <div className="ecms-login__card">
            <Link to="/" aria-label="ECMS home" className="ecms-login__logo">
              <Brand />
            </Link>
            <h1>{DEMO ? "Welcome to ECMS" : "Welcome back"}</h1>
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
                <BrandMark className="ecms-login__wait-mark ecms-beat" />
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
                            : `Continue as ${d.title.toLowerCase()}`}
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
                  <span>Or sign in with an account</span>
                </div>
              </>
            )}

            <form onSubmit={loginFunc} noValidate>
              <div className="ecms-field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="ecms-field ecms-field--password">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="ecms-field__eye"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <div className="ecms-login__row">
                <button
                  type="button"
                  className="ecms-login__forgot"
                  aria-expanded={forgot}
                  onClick={() => setForgot(!forgot)}
                >
                  Forgot password?
                </button>
              </div>
              {forgot && (
                <p className="ecms-login__forgot-help" role="status">
                  {DEMO
                    ? "The demo accounts all use the password ecms-demo. "
                    : ""}
                  Ask your care administrator to reset it. They'll give you a
                  temporary password, which you can change from your profile.
                </p>
              )}
              <button type="submit" className="ecms-login__submit" disabled={!!submitting}>
                {submitting === "form" ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="ecms-login__note">
              Need an account? <span>Your care administrator creates them.</span>
            </p>
          </div>
        </div>

        <aside className="ecms-login__side" aria-hidden="true">
          <svg className="ecms-login__defs" width="0" height="0" focusable="false">
            <clipPath id="ecms-login-shape" clipPathUnits="objectBoundingBox">
              <path d={PHOTO_SHAPE} />
            </clipPath>
          </svg>
          <div className="ecms-login__photo">
            <img src={photo} alt="" loading="lazy" />
            <div className="ecms-login__overlay">
              <span className="ecms-login__pill">ECMS for care teams</span>
              <h2>Contracts, rotas and invoices, all in one place.</h2>
            </div>
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
                  <small>4 caregivers a day</small>
                </span>
              </div>
              <div>
                <span className="ecms-login__icon ecms-login__icon--amber">
                  <FiFileText />
                </span>
                <span>
                  <strong>October invoices sent</strong>
                  <small>10 care packages</small>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Login;
