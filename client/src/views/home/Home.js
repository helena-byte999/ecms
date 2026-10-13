import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiDownload,
  FiFileText,
  FiLock,
  FiMenu,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { SiExpress, SiMongodb, SiNodedotjs, SiReact, SiRender, SiVercel } from "react-icons/si";
import Brand from "components/Brand.js";
import { NavIcon } from "components/navIcons.js";
import { authenticate } from "data/api";
import "./home.css";
// Care-home footage: Pexels video 7522210 (free Pexels licence), compressed to 1600px
import careVideo from "./media/care-home.mp4";
import carePoster from "./media/care-home-poster.jpg";

const REPO_URL = "https://github.com/helena-byte999/ecms";
const DOCS_URL = REPO_URL + "/blob/main/docs/requirements.md";
const DEMO = process.env.REACT_APP_DEMO === "true";
const HEALTH = authenticate.loggedIn.replace(/\/api\/.*$/, "/api/health");

const prefersStill = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
};

// Live status of the demo API. The request also wakes the free server early,
// so it is usually ready by the time a visitor reaches the sign-in page.
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

function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return scrolled;
}

// Plays the footage only once it is near the screen, so it never slows the first load
function LazyVideo() {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  const still = prefersStill();
  useEffect(() => {
    if (still || !ref.current || !("IntersectionObserver" in window)) {
      setNear(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [still]);

  return (
    <div className="lb-video" ref={ref} aria-hidden="true">
      {still || !near ? (
        <img src={carePoster} alt="" loading="lazy" />
      ) : (
        <video src={careVideo} poster={carePoster} autoPlay muted loop playsInline preload="auto" />
      )}
    </div>
  );
}

// Share of doses given each day this week and the week before (sample data)
const WEEK = [91.7, 95.8, 91.7, 96.2, 96.3, 96.3, 98.1];
const PREV_WEEK = [95.8, 95.8, 100, 95.8, 91.7, 100, 91.7];
const DAYS = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];

function TrendMini({ tall = false }) {
  const w = 300;
  const h = tall ? 150 : 96;
  const lo = 80;
  const x = (i) => 10 + (i / (WEEK.length - 1)) * (w - 20);
  const y = (v) => 6 + (1 - (v - lo) / (100 - lo)) * (h - 12);
  const line = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line(WEEK)}L${x(WEEK.length - 1)},${h}L${x(0)},${h}Z`;
  return (
    <svg className="lb-chart" viewBox={`0 0 ${w} ${h + 22}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="lb-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0a9e94" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0a9e94" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1="0" x2={w} y1={6 + (h - 12) * t} y2={6 + (h - 12) * t} className="lb-chart__grid" />
      ))}
      <path d={area} fill="url(#lb-area)" />
      <path d={line(PREV_WEEK)} fill="none" stroke="#b9c3cd" strokeWidth="2" strokeDasharray="5 4" />
      <path d={line(WEEK)} fill="none" stroke="#0a9e94" strokeWidth="2.5" strokeLinejoin="round" />
      {WEEK.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#fff" stroke="#0a9e94" strokeWidth="2" />)}
      {DAYS.map((d, i) => <text key={d} x={x(i)} y={h + 16} textAnchor="middle">{d}</text>)}
    </svg>
  );
}

// Today's medicine round (sample data): [time, resident, medicine, status, tone]
const ROUND = [
  ["08:00", "Margaret Okafor", "Amoxicillin 500 mg", "Given", "ok"],
  ["08:00", "Harold Brennan", "Sertraline 50 mg", "Refused", "warn"],
  ["12:00", "Agnes Mensah", "Calcium and vitamin D", "Due", "neutral"],
  ["14:00", "Margaret Okafor", "Amoxicillin 500 mg", "Later", "muted"],
];

// The admin dashboard, drawn in HTML so it stays sharp and light (sample data)
function DashboardPreview() {
  const nav = ["home:Dashboard", "heartbeat:Care", "people:People", "contract:Contracts", "calendar:Rota", "bills:Invoices"];
  return (
    <div className="lb-frame" role="img" aria-label="The ECMS admin dashboard: doses given this week, incidents, residents, money outstanding, the dose trend and today's medicine round">
      <span className="lb-frame__dot lb-frame__dot--l" aria-hidden="true" />
      <span className="lb-frame__dot lb-frame__dot--r" aria-hidden="true" />
      <div className="lb-app" aria-hidden="true">
        <aside className="lb-app__side">
          <Brand compact light />
          <ul>
            {nav.map((n, i) => {
              const [icon, label] = n.split(":");
              return (
                <li key={label} className={i === 0 ? "is-active" : ""}>
                  <NavIcon name={icon} size={16} /> {label}
                </li>
              );
            })}
          </ul>
          <div className="lb-app__me">
            <span className="lb-avatar lb-avatar--light">OB</span>
            <span>
              Olivia Bennett
              <small>Administrator</small>
            </span>
          </div>
        </aside>
        <div className="lb-app__main">
          <div className="lb-app__bar">
            <div>
              <small>Today: 3 doses due, 2 contracts ending soon</small>
              <strong>Welcome back, Olivia</strong>
            </div>
            <span className="lb-app__search"><FiSearch /> Search people</span>
          </div>
          <div className="lb-app__stats">
            <div><small>Doses given</small><strong>93.9%</strong><span>this week</span></div>
            <div><small>Incidents</small><strong>2</strong><span className="is-warn">1 more than last week</span></div>
            <div><small>Residents</small><strong>12</strong><span>6 caregivers on staff</span></div>
            <div><small>Outstanding</small><strong>£29,700</strong><span className="is-bad">2 invoices overdue</span></div>
          </div>
          <div className="lb-app__panels">
            <div className="lb-app__panel">
              <div className="lb-app__panel-head">
                <strong>Doses given, last 7 days</strong>
                <span className="lb-legend"><i className="lb-sw lb-sw--teal" />This week <i className="lb-sw lb-sw--grey" />Week before</span>
              </div>
              <TrendMini tall />
            </div>
            <div className="lb-app__panel">
              <div className="lb-app__panel-head"><strong>Today's medicine round</strong></div>
              {ROUND.map(([time, who, med, state, tone]) => (
                <div className="lb-app__row" key={time + who + med}>
                  <span className="lb-time">{time}</span>
                  <span className="lb-app__name">{who}<small>{med}</small></span>
                  <span className={"lb-pill lb-pill--" + tone}>{state}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const extras = [
  [FiFileText, "Contracts and invoices", "Contracts flagged 30 days before they end; invoices as PDF, with paid, unpaid and overdue at a glance."],
  [FiCalendar, "A fair rota in one click", "Pick a week and how many staff a day; shifts are shared evenly between active caregivers."],
  [FiLock, "Private by default", "Everyone sees only what their role allows, and deactivated people keep their history."],
]

const stack = [
  [SiReact, "React"],
  [SiNodedotjs, "Node.js"],
  [SiExpress, "Express"],
  [SiMongodb, "MongoDB"],
  [SiVercel, "Vercel"],
  [SiRender, "Render"],
];

const team = ["Ena Otuokon", "Munachi Umeh", "Hassan Hassan", "Abdulhamid Tukur"];
const initials = (n) => n.split(" ").map((p) => p[0]).join("");

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();
  const status = useDemoStatus();
  const closeMenu = () => setMenuOpen(false);
  const cta = DEMO ? "Try the live demo" : "Sign in";

  const statusPill = DEMO && (
    <span className={"lb-status lb-status--" + status} role="status">
      <i aria-hidden="true" />
      {status === "online" ? "Demo online" : status === "waking" ? "Demo waking up" : "Checking demo"}
    </span>
  );

  return (
    <div className="lb">
      <header className={"lb-nav" + (scrolled || menuOpen ? " is-solid" : "")}>
        <div className="lb-wrap lb-nav__inner">
          <Link to="/" aria-label="ECMS home" className="lb-nav__brand">
            <Brand compact />
          </Link>
          <nav className={"lb-nav__links" + (menuOpen ? " is-open" : "")} aria-label="Main">
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#roles" onClick={closeMenu}>Who it's for</a>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
              Requirements & UML
            </a>
            <Link to="/login" className="lb-nav__cta-mobile">{cta}</Link>
          </nav>
          <Link to="/login" className="lb-btn lb-btn--outline lb-btn--sm lb-nav__cta">
            {DEMO ? "Try the demo" : "Sign in"}
          </Link>
          <button
            type="button"
            className="lb-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </header>

      <main>
        <section className="lb-hero">
          <div className="lb-wrap">
            <h1>
              Elderly care,
              <br />
              organised in one calm place
            </h1>
            <p>
              Medicine rounds, care records and updates for families, with the
              contracts, rotas and invoices behind them.
            </p>
            <div className="lb-hero__actions">
              <Link to="/login" className="lb-btn lb-btn--primary">
                {cta}
              </Link>
              <a href="#features" className="lb-btn lb-btn--outline">
                See what it does
              </a>
            </div>
          </div>
          <div className="lb-wrap lb-wrap--wide">
            <DashboardPreview />
          </div>
        </section>

        <section className="lb-stack" aria-label="Built with">
          <div className="lb-wrap">
            <p className="lb-stack__label">Built with</p>
            <ul>
              {stack.map(([Icon, name]) => (
                <li key={name}><Icon aria-hidden="true" /> {name}</li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="lb-section">
          <div className="lb-wrap">
            <div className="lb-head">
              <h2>Care recorded as it happens</h2>
              <p>
                Medicines, meals, wellbeing and incidents are written down on the round
                and shared with the people who need them.
              </p>
            </div>

            <div className="lb-bento lb-bento--a">
              <article className="lb-card">
                <h3>Today's medicine round</h3>
                <p>Every dose due across the home. One tap for given; refused or missed with a note. Late doses stand out.</p>
                <div className="lb-vis lb-vis--shifts lb-vis--times" aria-hidden="true">
                  {ROUND.slice(0, 3).map(([time, who, med, state, tone]) => (
                    <div key={time + who}>
                      <strong>{time}</strong>
                      <span>{who}<small>{med}</small></span>
                      <span className={"lb-pill lb-pill--" + tone}>{state}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="lb-card">
                <h3>A care log families can read</h3>
                <p>Each relative has their own login to see meals, medicines and how their family member is doing.</p>
                <div className="lb-vis lb-vis--shifts lb-vis--times" aria-hidden="true">
                  {[["08:30", "Breakfast", "Ate all · 200 ml to drink"], ["10:15", "Wellbeing", "Content · 36.9 °C"], ["14:30", "Activity", "Chair exercises"]].map(([time, what, detail]) => (
                    <div key={time}>
                      <strong>{time}</strong>
                      <span>{what}<small>{detail}</small></span>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="lb-bento lb-bento--b">
              <article className="lb-card">
                <h3>Care analytics</h3>
                <p>Doses given, refusals, incidents and illness, each against the previous period.</p>
                <div className="lb-vis lb-vis--chart" aria-hidden="true">
                  <div className="lb-vis__kpis">
                    <span><small>Doses given</small><strong>93.3%</strong></span>
                    <span><small>vs previous 30 days</small><strong className="is-ok">+2.7 pts</strong></span>
                  </div>
                  <TrendMini />
                </div>
              </article>

              <article className="lb-card">
                <h3>Doctor's visits update the record</h3>
                <p>Record the visit once: new medicines go on the round and allergies and conditions update, with a before-and-after trail.</p>
                <div className="lb-vis lb-vis--invoice" aria-hidden="true">
                  <div className="lb-doc lb-doc--back" />
                  <div className="lb-doc">
                    <div className="lb-doc__top">
                      <strong>Dr Amara Patel, GP</strong>
                      <span className="lb-pill lb-pill--ok">Records updated</span>
                    </div>
                    <small>Margaret Okafor · cough and a raised temperature</small>
                    <div className="lb-doc__line"><span>Started</span><span>Amoxicillin 500 mg, 7 days</span></div>
                    <div className="lb-doc__line lb-doc__line--muted"><span>Conditions</span><span>+ chest infection</span></div>
                    <div className="lb-doc__total"><span>Next</span><strong>Review in 7 days</strong></div>
                  </div>
                </div>
              </article>
            </div>

            <div className="lb-extras">
              {extras.map(([Icon, title, text]) => (
                <div key={title}>
                  <Icon aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="lb-section lb-band">
          <svg className="lb-band__edge" viewBox="0 0 1440 28" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0H520L548 28H892L920 0H1440V28H0Z" className="lb-band__fill" />
            <path d="M0 0.5H520L548 27.5H892L920 0.5H1440" className="lb-band__line" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="lb-wrap">
            <p className="lb-eyebrow">Who it's for</p>
            <div className="lb-head">
              <h2>One system for everyone around a resident</h2>
              <p>Three roles, each seeing only what they need. Try any of them with sample data.</p>
            </div>

            <div className="lb-bento lb-bento--c">
              <article className="lb-card">
                <h3>Administrators</h3>
                <p>Run the home: people, contracts, rotas and invoices, plus care analytics.</p>
                <div className="lb-vis lb-vis--tiles" aria-hidden="true">
                  <span><small>Doses given</small><strong>93.9%</strong></span>
                  <span><small>Incidents</small><strong className="is-warn">2</strong></span>
                  <span><small>Residents</small><strong>12</strong></span>
                  <span><small>Overdue</small><strong className="is-bad">2</strong></span>
                </div>
                <Link to="/login" className="lb-link">Try as administrator <FiArrowRight aria-hidden="true" /></Link>
              </article>
              <article className="lb-card">
                <h3>Caregivers</h3>
                <p>Give medicines on the round, write the care log and record doctor's visits.</p>
                <div className="lb-vis lb-vis--shifts lb-vis--times" aria-hidden="true">
                  {[["08:00", "Metformin 500 mg", "Given", "ok"], ["12:00", "Calcium and vitamin D", "Due", "neutral"], ["20:00", "Donepezil 10 mg", "Later", "muted"]].map(([t, med, state, tone]) => (
                    <div key={t}><strong>{t}</strong><span>{med}</span><span className={"lb-pill lb-pill--" + tone}>{state}</span></div>
                  ))}
                </div>
                <Link to="/login" className="lb-link">Try as caregiver <FiArrowRight aria-hidden="true" /></Link>
              </article>
              <article className="lb-card">
                <h3>Families</h3>
                <p>Follow a relative's care, medicines, contract and invoices with their own login.</p>
                <div className="lb-vis lb-vis--due" aria-hidden="true">
                  <div><small>Medicines today</small><span className="lb-pill lb-pill--ok">On track</span></div>
                  <strong>3 of 3<small> given</small></strong>
                  <span className="lb-doc__btn lb-doc__btn--inline"><FiDownload /> October invoice</span>
                </div>
                <Link to="/login" className="lb-link">Try as family member <FiArrowRight aria-hidden="true" /></Link>
              </article>
            </div>

            <div className="lb-bento lb-bento--d">
              <article className="lb-card">
                <h3>Secure by default</h3>
                <p>Checks on every request, not just hidden buttons.</p>
                <ul className="lb-checks">
                  {["Role checked on every request", "Care records can't be deleted, only corrected", "Hashed passwords and rate-limited sign-in", "Signed, expiring sessions"].map((c) => (
                    <li key={c}><FiCheck aria-hidden="true" /> {c}</li>
                  ))}
                </ul>
              </article>
              <article className="lb-card lb-card--media">
                <div>
                  <h3>Made for care homes</h3>
                  <p>Designed around the daily work of a residential home: residents, staff, families and the paperwork between them.</p>
                </div>
                <LazyVideo />
              </article>
            </div>
          </div>
        </section>

        <section className="lb-section lb-team">
          <div className="lb-wrap">
            <p className="lb-eyebrow">The project</p>
            <div className="lb-head">
              <h2>Built by a team of four students</h2>
              <p>
                Final-year team project presented on 2 December 2022, supervised by
                Alexey Vedishchev, and rebuilt in 2026 as a live demo.
              </p>
            </div>
            <div className="lb-bento lb-bento--e">
              <article className="lb-card">
                <h3>The team</h3>
                <ul className="lb-people">
                  {team.map((n) => (
                    <li key={n}><span className="lb-avatar">{initials(n)}</span>{n}</li>
                  ))}
                </ul>
              </article>
              <article className="lb-card">
                <h3>My part</h3>
                <ul className="lb-checks">
                  <li><FiCheck aria-hidden="true" /> Frontend: React views and components</li>
                  <li><FiCheck aria-hidden="true" /> Database design: MongoDB schemas</li>
                  <li><FiCheck aria-hidden="true" /> UML: use-case, ER and class diagrams</li>
                  <li><FiCheck aria-hidden="true" /> Requirements specification</li>
                </ul>
                <p className="lb-card__by">Ena Otuokon</p>
              </article>
              <article className="lb-card">
                <h3>Read the docs</h3>
                <p>The original requirements and diagrams, plus updated ones for how it works today.</p>
                <div className="lb-docs">
                  <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="lb-link">
                    Requirements & UML <FiArrowRight aria-hidden="true" />
                  </a>
                  <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="lb-link">
                    Source on GitHub <FiArrowRight aria-hidden="true" />
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="lb-cta">
          <div className="lb-cta__art" aria-hidden="true">
            <span className="lb-cta__box lb-cta__box--a"><i /><i /><i /><i /></span>
            <span className="lb-cta__box lb-cta__box--b">SAMPLE DATA,<br />RESET EVERY<br />NIGHT.</span>
            <span className="lb-cta__box lb-cta__box--c" />
            <span className="lb-cta__box lb-cta__box--d"><i /><i /><i /><i /></span>
          </div>
          <div className="lb-wrap">
            <h2>See it working in one click</h2>
            <p>Sign in as an administrator, a caregiver or a family member. No sign-up needed.</p>
            <Link to="/login" className="lb-btn lb-btn--primary">{cta}</Link>
            {statusPill && <div className="lb-cta__status">{statusPill}</div>}
          </div>
        </section>
      </main>

      <footer className="lb-footer">
        <div className="lb-wrap">
          <div className="lb-footer__top">
            <div className="lb-footer__about">
              <Brand compact />
              <p>Role-based care management for care-home staff, caregivers and families.</p>
            </div>
            <nav aria-label="Product">
              <h3>Product</h3>
              <a href="#features">Features</a>
              <a href="#roles">Who it's for</a>
              <Link to="/login">{cta}</Link>
            </nav>
            <nav aria-label="Project">
              <h3>Project</h3>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">Source on GitHub</a>
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">Requirements & UML</a>
              <a href={REPO_URL + "#team--my-role"} target="_blank" rel="noopener noreferrer">The team</a>
            </nav>
            <div className="lb-footer__built">
              <h3>Built with</h3>
              <p>React, Node.js, Express and MongoDB</p>
            </div>
          </div>
          <div className="lb-footer__bottom">
            <p>© {new Date().getFullYear()} ECMS. Sample data only.</p>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">github.com/helena-byte999/ecms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
