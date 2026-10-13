import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArchive,
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiDownload,
  FiFileText,
  FiGrid,
  FiLock,
  FiMenu,
  FiSearch,
  FiSettings,
  FiSmartphone,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { SiExpress, SiMongodb, SiNodedotjs, SiReact, SiRender, SiVercel } from "react-icons/si";
import Brand from "components/Brand.js";
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

// Sample figures, matching the demo data
const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const PAID = [1, 1, 1, 1, 0.81, 0];

function MiniChart({ tall = false }) {
  const h = tall ? 150 : 96;
  const bar = tall ? 14 : 9;
  return (
    <svg className="lb-chart" viewBox={`0 0 300 ${h + 22}`} preserveAspectRatio="none" aria-hidden="true">
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1="0" x2="300" y1={4 + (h - 4) * t} y2={4 + (h - 4) * t} className="lb-chart__grid" />
      ))}
      {MONTHS.map((m, i) => {
        const cx = 25 + i * 50;
        const paid = (h - 4) * 0.92 * PAID[i];
        const inv = (h - 4) * 0.92;
        return (
          <g key={m}>
            <rect x={cx - bar - 1} y={h - inv} width={bar} height={inv} rx="2.5" fill="#0a9e94" />
            {paid > 0 && <rect x={cx + 1} y={h - paid} width={bar} height={paid} rx="2.5" fill="#2a78d6" />}
            <text x={cx} y={h + 16} textAnchor="middle">{m}</text>
          </g>
        );
      })}
    </svg>
  );
}

// The admin dashboard, drawn in HTML so it stays sharp and light (sample data)
function DashboardPreview() {
  const nav = [
    [FiGrid, "Dashboard"],
    [FiUsers, "Clients"],
    [FiUserCheck, "Caregivers"],
    [FiFileText, "Contracts"],
    [FiCalendar, "Rotas"],
    [FiBarChart2, "Invoices"],
    [FiSettings, "Settings"],
  ];
  return (
    <div className="lb-frame" role="img" aria-label="The ECMS admin dashboard: people, contracts ending soon, money outstanding and an invoiced-versus-paid chart">
      <span className="lb-frame__dot lb-frame__dot--l" aria-hidden="true" />
      <span className="lb-frame__dot lb-frame__dot--r" aria-hidden="true" />
      <div className="lb-app" aria-hidden="true">
        <aside className="lb-app__side">
          <Brand compact light />
          <ul>
            {nav.map(([Icon, label], i) => (
              <li key={label} className={i === 0 ? "is-active" : ""}>
                <Icon /> {label}
              </li>
            ))}
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
              <small>Good morning, Olivia</small>
              <strong>Dashboard</strong>
            </div>
            <span className="lb-app__search"><FiSearch /> Search people</span>
          </div>
          <div className="lb-app__stats">
            <div><small>Clients</small><strong>12</strong><span>4 without a contract</span></div>
            <div><small>Caregivers</small><strong>8</strong><span>6 active, 1 on leave</span></div>
            <div><small>Contracts ending</small><strong>2</strong><span className="is-warn">in the next 30 days</span></div>
            <div><small>Outstanding</small><strong>£29,700</strong><span className="is-bad">2 invoices overdue</span></div>
          </div>
          <div className="lb-app__panels">
            <div className="lb-app__panel">
              <div className="lb-app__panel-head">
                <strong>Invoiced vs paid</strong>
                <span className="lb-legend"><i className="lb-sw lb-sw--teal" />Invoiced <i className="lb-sw lb-sw--blue" />Paid</span>
              </div>
              <MiniChart tall />
            </div>
            <div className="lb-app__panel">
              <div className="lb-app__panel-head"><strong>Contracts needing attention</strong></div>
              {[
                ["WS", "Winifred Shaw", "Ends in 20 days", "warn"],
                ["LF", "Leonard Fitzgerald", "Ends in 20 days", "warn"],
                ["HB", "Harold Brennan", "Expired", "bad"],
                ["DH", "Dorothy Hughes", "Expired", "bad"],
                ["BE", "Beatrice Eze", "No contract", "muted"],
              ].map(([ini, name, state, tone]) => (
                <div className="lb-app__row" key={name}>
                  <span className="lb-avatar">{ini}</span>
                  <span className="lb-app__name">{name}</span>
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

const ROTA = [
  ["Mon", ["GA", "TR", "PN", "DO"]],
  ["Tue", ["SC", "YB", "GA", "TR"]],
  ["Wed", ["PN", "DO", "SC", "YB"]],
  ["Thu", ["GA", "TR", "PN", "DO"]],
  ["Fri", ["SC", "YB", "GA", "TR"]],
  ["Sat", ["PN", "DO", "SC", "YB"]],
  ["Sun", ["GA", "TR", "PN", "DO"]],
];

const extras = [
  [FiLock, "Private by default", "Everyone sees only their own records, and passwords are stored hashed."],
  [FiArchive, "History is kept", "Deactivate people instead of deleting them, so past rotas and invoices stay."],
  [FiSmartphone, "Works on any device", "Admins on a laptop at the desk, families on a phone at home."],
];

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
            <a href="#how" onClick={closeMenu}>How it works</a>
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
              Contracts, rotas, invoices and care profiles for care-home staff,
              caregivers and families.
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
              <h2>Everything a care home tracks, in one place</h2>
              <p>
                The paperwork around each resident (contracts, rotas and bills) with
                the warnings that stop things slipping.
              </p>
            </div>

            <div className="lb-bento lb-bento--a">
              <article className="lb-card">
                <h3>Contracts that need attention</h3>
                <p>See which contracts end in the next 30 days, which have expired, and who has none.</p>
                <div className="lb-vis lb-vis--list" aria-hidden="true">
                  {[
                    ["WS", "Winifred Shaw", "Ends in 20 days", "warn"],
                    ["AK", "Arthur Kowalski", "Valid", "ok"],
                    ["HB", "Harold Brennan", "Expired", "bad"],
                  ].map(([ini, name, state, tone]) => (
                    <div className="lb-vis__row" key={name}>
                      <span className="lb-avatar">{ini}</span>
                      <span>{name}<small>Residential care agreement</small></span>
                      <span className={"lb-pill lb-pill--" + tone}>{state}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="lb-card">
                <h3>Invoiced vs paid, month by month</h3>
                <p>Paid, unpaid and overdue at a glance, with a six-month chart for the home.</p>
                <div className="lb-vis lb-vis--chart" aria-hidden="true">
                  <div className="lb-vis__kpis">
                    <span><small>Outstanding</small><strong>£29,700</strong></span>
                    <span><small>Overdue</small><strong className="is-bad">2</strong></span>
                  </div>
                  <MiniChart />
                </div>
              </article>
            </div>

            <div className="lb-bento lb-bento--b">
              <article className="lb-card">
                <h3>A fair rota in one click</h3>
                <p>Pick a week and how many people a day. Shifts are shared evenly between active staff.</p>
                <div className="lb-vis lb-vis--rota" aria-hidden="true">
                  {ROTA.map(([day, people]) => (
                    <div key={day}>
                      <small>{day}</small>
                      {people.map((p, i) => (
                        <span key={i} className={"lb-chip lb-chip--" + (p.charCodeAt(0) % 4)}>{p}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </article>

              <article className="lb-card">
                <h3>Every invoice as a PDF</h3>
                <p>Families download their bills; admins mark them paid in one click.</p>
                <div className="lb-vis lb-vis--invoice" aria-hidden="true">
                  <div className="lb-doc lb-doc--back" />
                  <div className="lb-doc">
                    <div className="lb-doc__top">
                      <Brand compact />
                      <span className="lb-pill lb-pill--ok">Paid</span>
                    </div>
                    <small>Invoice for</small>
                    <strong>Margaret Okafor</strong>
                    <div className="lb-doc__line"><span>September care package</span><span>£2,400.00</span></div>
                    <div className="lb-doc__line lb-doc__line--muted"><span>Due 15 Sep</span><span>Paid 10 Sep</span></div>
                    <div className="lb-doc__total"><span>Total</span><strong>£2,400.00</strong></div>
                  </div>
                  <span className="lb-doc__btn"><FiDownload /> Download PDF</span>
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
                <p>Add people, manage contracts, build rotas and send invoices.</p>
                <div className="lb-vis lb-vis--tiles" aria-hidden="true">
                  <span><small>Clients</small><strong>12</strong></span>
                  <span><small>Caregivers</small><strong>8</strong></span>
                  <span><small>Ending soon</small><strong className="is-warn">2</strong></span>
                  <span><small>Overdue</small><strong className="is-bad">2</strong></span>
                </div>
                <Link to="/login" className="lb-link">Try as administrator <FiArrowRight aria-hidden="true" /></Link>
              </article>
              <article className="lb-card">
                <h3>Caregivers</h3>
                <p>See this week's shifts and who else is on each day.</p>
                <div className="lb-vis lb-vis--shifts" aria-hidden="true">
                  {[["Mon", "You, Tomás, Priya, Daniel"], ["Thu", "You, Tomás, Priya, Daniel"], ["Sun", "You, Tomás, Priya, Daniel"]].map(([d, who]) => (
                    <div key={d}><strong>{d}</strong><span>{who}</span></div>
                  ))}
                </div>
                <Link to="/login" className="lb-link">Try as caregiver <FiArrowRight aria-hidden="true" /></Link>
              </article>
              <article className="lb-card">
                <h3>Clients & families</h3>
                <p>Check the contract, see what's due and download every invoice.</p>
                <div className="lb-vis lb-vis--due" aria-hidden="true">
                  <div><small>To pay</small><span className="lb-pill lb-pill--warn">Due 15 Oct</span></div>
                  <strong>£2,400<small>.00</small></strong>
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
                  {["Role checked on every request", "Hashed passwords", "Rate-limited sign-in", "Signed, expiring sessions"].map((c) => (
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

        <section className="lb-statement">
          <div className="lb-wrap">
            <p>
              A care home's records of clients, caregivers, contracts, rotas and billing
              didn't keep up as it grew. <span>ECMS puts them in one place, with the right
              view for each person.</span>
            </p>
            <a href={DOCS_URL + "#problem"} target="_blank" rel="noopener noreferrer" className="lb-statement__by">
              <Brand compact />
              <span>
                The problem we set out to solve
                <small>Original requirements, 2022</small>
              </span>
            </a>
          </div>
        </section>

        <section id="how" className="lb-section lb-how">
          <div className="lb-wrap">
            <p className="lb-eyebrow lb-eyebrow--center">How it works</p>
            <h2>Three simple steps</h2>
            <p className="lb-how__lead">From a new resident to a paid invoice.</p>
            <ol className="lb-steps">
              <li>
                <span className="lb-steps__n">1</span>
                <div className="lb-steps__art" aria-hidden="true">
                  <span className="lb-mini"><i className="lb-avatar">MO</i><b /><b /></span>
                  <span className="lb-mini lb-mini--tilt"><i className="lb-avatar">GA</i><b /><b /></span>
                </div>
                <h3>Add residents and staff</h3>
                <p>Care profiles, next of kin, medical notes and contracts.</p>
              </li>
              <li>
                <span className="lb-steps__n">2</span>
                <div className="lb-steps__art" aria-hidden="true">
                  <span className="lb-mini lb-mini--cal">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <i key={i}>{d}</i>)}
                    {Array.from({ length: 7 }).map((_, i) => <b key={i} />)}
                  </span>
                </div>
                <h3>Generate the rota</h3>
                <p>Choose the week and staff per day; ECMS shares it out fairly.</p>
              </li>
              <li>
                <span className="lb-steps__n">3</span>
                <div className="lb-steps__art" aria-hidden="true">
                  <span className="lb-mini lb-mini--doc"><em className="lb-pill lb-pill--ok">Paid</em><b /><b /></span>
                  <span className="lb-mini lb-mini--doc lb-mini--tilt"><em className="lb-pill lb-pill--warn">Unpaid</em><b /><b /></span>
                </div>
                <h3>Invoice and get paid</h3>
                <p>Send monthly invoices and track what's paid, unpaid and overdue.</p>
              </li>
            </ol>
            <div className="lb-center">
              <Link to="/login" className="lb-btn lb-btn--outline">{cta}</Link>
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
              <a href="#how">How it works</a>
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
