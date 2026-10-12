import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBatteryCharging,
  FiCalendar,
  FiDownload,
  FiWifi,
  FiChevronRight,
  FiFileText,
  FiLock,
  FiMenu,
  FiShield,
  FiX,
} from "react-icons/fi";
import Brand from "components/Brand.js";
import { authenticate } from "data/api";
import "./home.css";
// Hero footage: Pexels video 7522210 (free Pexels licence), compressed to 1600px
import heroVideo from "./media/care-home.mp4";
import heroPoster from "./media/care-home-poster.jpg";

const REPO_URL = "https://github.com/helena-byte999/ecms";
const DOCS_URL = REPO_URL + "/blob/main/docs/requirements.md";
const DEMO = process.env.REACT_APP_DEMO === "true";
const HEALTH = authenticate.loggedIn.replace(/\/api\/.*$/, "/api/health");

// Respect "reduce motion": show the still frame instead of playing the video
const prefersStill = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
};

const stories = [
  {
    icon: <FiShield />,
    eyebrow: "No surprises",
    title: "Know which contracts end in the next 30 days.",
    text: "Valid, expired, starting soon and missing contracts, flagged on the dashboard.",
  },
  {
    icon: <FiCalendar />,
    eyebrow: "Fair rotas",
    title: "Every active caregiver, shared out evenly across the week.",
    text: "Pick a week and how many people a day. Nobody works the same day twice.",
  },
  {
    icon: <FiFileText />,
    eyebrow: "Paid, unpaid, overdue",
    title: "See what's owed and download any invoice as a PDF.",
    text: "Due dates, one-click “mark as paid”, and a monthly invoiced-vs-paid chart.",
  },
  {
    icon: <FiLock />,
    eyebrow: "Private by default",
    title: "Everyone sees only their own records.",
    text: "Role-based access, hashed passwords, deactivation that keeps history.",
  },
];

// Live status of the demo API (free hosting sleeps when idle)
function useDemoStatus() {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    if (!DEMO) return undefined;
    let done = false;
    const slow = setTimeout(() => !done && setStatus("waking"), 2500);
    fetch(HEALTH)
      .then((r) => r.json())
      .then((d) => setStatus(d.status ? "online" : "waking"))
      .catch(() => setStatus("waking"))
      .finally(() => {
        done = true;
        clearTimeout(slow);
      });
    return () => clearTimeout(slow);
  }, []);
  return status;
}

function useScrolled(offset = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return scrolled;
}

// A phone showing what a family member sees in ECMS (static, sample data)
function PhonePreview() {
  return (
    <div
      className="tk-phone"
      role="img"
      aria-label="ECMS on a phone: a client's contract, amount to pay and recent invoices"
    >
      <div className="tk-phone__screen" aria-hidden="true">
        <div className="tk-phone__status">
          <span>9:41</span>
          <span className="tk-phone__icons">
            <i className="tk-phone__bars"><b /><b /><b /><b /></i>
            <FiWifi />
            <FiBatteryCharging />
          </span>
        </div>
        <div className="tk-phone__app">
          <div className="tk-phone__top">
            <Brand compact />
            <span className="tk-phone__avatar">MO</span>
          </div>
          <p className="tk-phone__hello">Good morning, Margaret</p>
          <h2 className="tk-phone__title">Your care</h2>

          <div className="tk-phone__card">
            <div className="tk-phone__row">
              <span>Contract</span>
              <span className="tk-phone__pill tk-phone__pill--ok">Valid</span>
            </div>
            <strong>Until 26 Mar 2027</strong>
            <div className="tk-phone__progress"><i style={{ width: "55%" }} /></div>
          </div>

          <div className="tk-phone__card">
            <div className="tk-phone__row">
              <span>To pay</span>
              <span className="tk-phone__pill tk-phone__pill--warn">Due 15 Oct</span>
            </div>
            <strong className="tk-phone__amount">£2,400<small>.00</small></strong>
            <span className="tk-phone__btn"><FiDownload /> October invoice (PDF)</span>
          </div>

          <p className="tk-phone__section">Recent invoices</p>
          {["September", "August", "July"].map((m) => (
            <div className="tk-phone__invoice" key={m}>
              <span>{m} care package</span>
              <span className="tk-phone__paid">Paid</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();
  const status = useDemoStatus();
  const closeMenu = () => setMenuOpen(false);
  const cta = DEMO ? "Try the live demo" : "Sign in";

  return (
    <div className="tk">
      <div className="tk-sky tk-sky--video" aria-hidden="true">
        {prefersStill() ? (
          <img className="tk-sky__video" src={heroPoster} alt="" />
        ) : (
          <video
            className="tk-sky__video"
            src={heroVideo}
            poster={heroPoster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        )}
      </div>
      <header className={"tk-nav" + (scrolled || menuOpen ? " is-solid" : "")}>
        <div className="tk-wrap tk-nav__inner">
          <Link to="/" aria-label="ECMS home" className="tk-nav__brand">
            <Brand compact />
          </Link>
          <nav className={"tk-nav__links" + (menuOpen ? " is-open" : "")} aria-label="Main">
            <a href="#roles" onClick={closeMenu}>Who it's for</a>
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
              Requirements & UML
            </a>
            <Link to="/login" className="tk-nav__cta-mobile">{cta}</Link>
          </nav>
          <Link to="/login" className="tk-continue">
            {DEMO ? "Try the demo" : "Sign in"}
            <span aria-hidden="true"><FiArrowRight /></span>
          </Link>
          <button
            type="button"
            className="tk-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </header>

      <main>
        <section className="tk-hero">
          <div className="tk-wrap">
            <h1>
              Elderly care,
              <br />
              organised in one calm place
            </h1>
            <p>Contracts, rotas, invoices and care profiles. One place for everyone.</p>
            <div className="tk-hero__actions">
              <Link to="/login" className="tk-pill">
                <FiArrowRight aria-hidden="true" /> {cta}
              </Link>
              <a href="#features" className="tk-pill">
                <FiCalendar aria-hidden="true" /> See what it does
              </a>
            </div>
            <PhonePreview />
          </div>
        </section>

        <div className="tk-grid">
          <div className="tk-wrap tk-grid__frame">
            <section id="roles" className="tk-feature" aria-label="Who it's for">
              <article className="tk-card tk-card--night">
                <span className="tk-card__tag"><FiShield aria-hidden="true" /> Administrators</span>
                <p className="tk-card__quote">
                  Build next week's rota in one click, <strong>shared fairly between every
                  active caregiver.</strong>
                </p>
                <Link to="/login" className="tk-link tk-link--light">
                  Try as administrator <FiChevronRight aria-hidden="true" />
                </Link>
                <dl className="tk-card__stats">
                  <div><dt>1 click</dt><dd>to generate a whole week's rota</dd></div>
                  <div><dt>30 days</dt><dd>warning before a contract ends</dd></div>
                </dl>
              </article>

              <article className="tk-card tk-card--lagoon">
                <span className="tk-card__tag"><FiFileText aria-hidden="true" /> Clients & families</span>
                <p className="tk-card__quote">
                  See the care contract, what's due and <strong>download every invoice
                  as a PDF.</strong>
                </p>
                <Link to="/login" className="tk-link tk-link--light">
                  Try as a family member <FiChevronRight aria-hidden="true" />
                </Link>
                <dl className="tk-card__stats">
                  <div><dt>3 states</dt><dd>paid, unpaid and overdue at a glance</dd></div>
                  <div><dt>24/7</dt><dd>access to your own records</dd></div>
                </dl>
              </article>
            </section>

            <section id="features" className="tk-stories" aria-label="Features">
              {stories.map((s) => (
                <article className="tk-story" key={s.title}>
                  <span className="tk-story__icon" aria-hidden="true">{s.icon}</span>
                  <p className="tk-story__eyebrow">{s.eyebrow}</p>
                  <h2>{s.title}</h2>
                  <p className="tk-story__text">{s.text}</p>
                  <Link to="/login" className="tk-link">
                    See it in the demo <FiChevronRight aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </section>
          </div>
        </div>
      </main>

      <footer className="tk-footer">
        <div className="tk-wrap">
          <div className="tk-footer__top">
            <div className="tk-footer__about">
              <Brand compact />
              <p>
                An undergraduate team project, rebuilt for my portfolio: role-based
                care management for admins, caregivers and families.
              </p>
            </div>
            <nav aria-label="Product">
              <h3>Product</h3>
              <a href="#roles">Who it's for</a>
              <a href="#features">Features</a>
              <Link to="/login">{cta}</Link>
            </nav>
            <nav aria-label="Project">
              <h3>Project</h3>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">Source on GitHub</a>
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">Requirements & UML</a>
              <a href={REPO_URL + "#team--my-role"} target="_blank" rel="noopener noreferrer">The team</a>
            </nav>
            <div className="tk-footer__built">
              <h3>Built with</h3>
              <p>React, Node.js, Express and MongoDB</p>
            </div>
          </div>
          <div className="tk-footer__bottom">
            <p>© {new Date().getFullYear()} ECMS. Sample data only.</p>
            {DEMO && (
              <span className={"tk-status tk-status--" + status} role="status">
                <i aria-hidden="true" />
                {status === "online"
                  ? "Demo online"
                  : status === "waking"
                  ? "Demo waking up"
                  : "Checking demo"}
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
