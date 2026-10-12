import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiFileText,
  FiHeart,
  FiLayout,
  FiLock,
  FiMenu,
  FiShield,
  FiUsers,
  FiX,
} from "react-icons/fi";
import Brand from "components/Brand.js";
import "./home.css";

const REPO_URL = "https://github.com/helena-byte999/ecms";
const DEMO = process.env.REACT_APP_DEMO === "true";

const roles = [
  {
    icon: <FiShield />,
    title: "Administrators",
    text: "Run the whole service from one dashboard.",
    points: [
      "Add and manage clients and caregivers",
      "Track which contracts are valid or expiring",
      "Generate the weekly rota in one click",
      "Raise and update invoices",
    ],
  },
  {
    icon: <FiHeart />,
    title: "Caregivers",
    text: "Know where you're needed and when.",
    points: [
      "See this week's shifts at a glance",
      "Check your own contract status",
      "View your invoices and profile",
    ],
  },
  {
    icon: <FiUsers />,
    title: "Clients & families",
    text: "Clear information, without chasing anyone.",
    points: [
      "See your care contract and renewal dates",
      "Review invoices in one place",
      "Keep personal and emergency details current",
    ],
  },
];

const features = [
  {
    icon: <FiFileText />,
    title: "Contract tracking",
    text: "Start and end dates on every agreement, with valid, expiring and missing contracts flagged automatically.",
  },
  {
    icon: <FiCalendar />,
    title: "Automatic weekly rotas",
    text: "Build a seven-day rota from your active caregivers, spread fairly across every shift.",
  },
  {
    icon: <FiLayout />,
    title: "Invoices in one place",
    text: "Create invoices per client and let clients and caregivers see their own history.",
  },
  {
    icon: <FiHeart />,
    title: "Complete care profiles",
    text: "Personal details, medical notes, next of kin and emergency contacts, kept together.",
  },
  {
    icon: <FiUsers />,
    title: "A dashboard for every role",
    text: "Admins, caregivers and clients each get a view built for what they need to do.",
  },
  {
    icon: <FiLock />,
    title: "Private by default",
    text: "Hashed passwords, token-based sign-in, and permissions so people only see their own records.",
  },
];

const steps = [
  {
    title: "Set up your people",
    text: "An administrator adds clients and caregivers, with their care and contact details.",
  },
  {
    title: "Add contracts & build the rota",
    text: "Record each care agreement, then generate the week's rota from active staff.",
  },
  {
    title: "Everyone signs in to their own view",
    text: "Caregivers see shifts, clients see contracts and invoices, admins see everything.",
  },
];

const rota = [
  { day: "Mon", staff: ["GA", "TR", "PN"], tone: "teal" },
  { day: "Tue", staff: ["SC", "YB", "HP"], tone: "amber" },
  { day: "Wed", staff: ["DO", "GA", "SC"], tone: "teal" },
  { day: "Thu", staff: ["PN", "HP", "TR"], tone: "coral" },
];

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="ecms-home">
      <header className="eh-header">
        <div className="eh-container eh-header__inner">
          <Link to="/" className="eh-header__brand" aria-label="ECMS home">
            <Brand />
          </Link>
          <nav
            className={"eh-nav" + (menuOpen ? " is-open" : "")}
            aria-label="Main"
          >
            <a href="#roles" onClick={closeMenu}>
              Who it's for
            </a>
            <a href="#features" onClick={closeMenu}>
              Features
            </a>
            <a href="#how" onClick={closeMenu}>
              How it works
            </a>
            <Link to="/login" className="eh-btn eh-btn--primary eh-nav__cta">
              Sign in
            </Link>
          </nav>
          <Link to="/login" className="eh-btn eh-btn--outline eh-header__signin">
            Sign in <FiArrowRight aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="eh-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </header>

      <main>
        <section className="eh-hero">
          <div className="eh-container eh-hero__grid">
            <div className="eh-hero__copy">
              <span className="eh-eyebrow">Care coordination, simplified</span>
              <h1>
                Elderly care, organised in <span>one calm place.</span>
              </h1>
              <p className="eh-lead">
                ECMS brings administrators, caregivers and clients onto one
                platform. Contracts, weekly rotas, invoices and care profiles,
                without the spreadsheets.
              </p>
              <div className="eh-hero__actions">
                <Link to="/login" className="eh-btn eh-btn--primary eh-btn--lg">
                  {DEMO ? "Try the live demo" : "Sign in to your dashboard"}{" "}
                  <FiArrowRight aria-hidden="true" />
                </Link>
                <a href="#how" className="eh-btn eh-btn--ghost eh-btn--lg">
                  See how it works
                </a>
              </div>
              <ul className="eh-checks">
                <li>
                  <FiCheck aria-hidden="true" /> Role-based access
                </li>
                <li>
                  <FiCheck aria-hidden="true" /> One-click weekly rotas
                </li>
                <li>
                  <FiCheck aria-hidden="true" /> Medical & emergency details
                </li>
              </ul>
            </div>

            <div className="eh-hero__visual" aria-hidden="true">
              <div className="eh-preview">
                <div className="eh-preview__bar">
                  <span />
                  <span />
                  <span />
                  <em>ECMS · Admin</em>
                </div>
                <div className="eh-preview__body">
                  <div className="eh-preview__stats">
                    <div>
                      <small>Active contracts</small>
                      <strong>24</strong>
                    </div>
                    <div>
                      <small>Clients</small>
                      <strong>18</strong>
                    </div>
                    <div>
                      <small>Caregivers</small>
                      <strong>11</strong>
                    </div>
                  </div>
                  <div className="eh-preview__panel">
                    <div className="eh-preview__head">
                      <strong>This week's rota</strong>
                      <span>Week 42</span>
                    </div>
                    {rota.map((r) => (
                      <div className="eh-rota" key={r.day}>
                        <span className="eh-rota__day">{r.day}</span>
                        <span className={"eh-rota__bar eh-rota__bar--" + r.tone} />
                        <span className="eh-rota__staff">
                          {r.staff.map((s) => (
                            <i key={s}>{s}</i>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="eh-float eh-float--top">
                <span className="eh-float__icon eh-float__icon--ok">
                  <FiCheck />
                </span>
                <span>
                  <strong>Contract renewed</strong>
                  <small>Margaret O. · until Feb 2027</small>
                </span>
              </div>
              <div className="eh-float eh-float--bottom">
                <span className="eh-float__icon">
                  <FiFileText />
                </span>
                <span>
                  <strong>Invoice created</strong>
                  <small>October care package</small>
                </span>
              </div>
            </div>
          </div>

          <div className="eh-container">
            <dl className="eh-stats">
              <div>
                <dt>user roles, each with its own dashboard</dt>
                <dd>3</dd>
              </div>
              <div>
                <dt>day rotas generated automatically</dt>
                <dd>7</dd>
              </div>
              <div>
                <dt>place for contracts, invoices & profiles</dt>
                <dd>1</dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="roles" className="eh-section">
          <div className="eh-container">
            <div className="eh-heading">
              <span className="eh-eyebrow">Who it's for</span>
              <h2>Built around the people in care</h2>
              <p>
                Everyone signs in to the same system but sees only what they
                need.
              </p>
            </div>
            <div className="eh-roles">
              {roles.map((r) => (
                <article className="eh-role" key={r.title}>
                  <span className="eh-icon">{r.icon}</span>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                  <ul>
                    {r.points.map((p) => (
                      <li key={p}>
                        <FiCheck aria-hidden="true" /> {p}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="eh-section">
          <div className="eh-container">
            <div className="eh-heading">
              <span className="eh-eyebrow">Features</span>
              <h2>Everything a care team needs, nothing it doesn't</h2>
            </div>
            <div className="eh-features">
              {features.map((f) => (
                <article className="eh-feature" key={f.title}>
                  <span className="eh-icon eh-icon--soft">{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="eh-section">
          <div className="eh-container">
            <div className="eh-heading">
              <span className="eh-eyebrow">How it works</span>
              <h2>Up and running in three steps</h2>
            </div>
            <ol className="eh-steps">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <span className="eh-steps__num">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="eh-section eh-section--cta">
          <div className="eh-container">
            <div className="eh-cta">
              <div>
                <h2>
                  {DEMO ? "See it in action" : "Ready to see your dashboard?"}
                </h2>
                <p>
                  {DEMO
                    ? "Try ECMS as an administrator, caregiver or client. No sign-up needed."
                    : "Sign in with the account your administrator set up for you."}
                </p>
              </div>
              <Link to="/login" className="eh-btn eh-btn--light eh-btn--lg">
                {DEMO ? "Try the demo" : "Sign in"}{" "}
                <FiArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="eh-footer">
        <div className="eh-container eh-footer__inner">
          <Brand compact />
          <p>
            © {new Date().getFullYear()} ECMS. An undergraduate team project.
          </p>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

export default Home;
