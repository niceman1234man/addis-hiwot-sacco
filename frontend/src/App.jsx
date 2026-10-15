import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  HandCoins,
  HeartHandshake,
  Info,
  Landmark,
  Menu,
  RefreshCw,
  ShieldCheck,
  Sprout,
  UsersRound,
  X,
} from "lucide-react";
import { createMemberApplication, getApiHealth } from "./lib/api.js";

function SeedMark({ size = 25 }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16 26.5C9.7 23.9 7.2 18.7 9.4 12.8c4.9.2 8.3 3.5 8.2 8.1-.1 2.2-.7 4-1.6 5.6Z" fill="currentColor" opacity=".7" />
      <path d="M16.2 25.8c-1.7-7.5.7-14.5 7.1-19.9 3.7 6.4 2 13.6-4.4 18.1-1 .7-1.9 1.3-2.7 1.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 27V16.6m0 4.4c-1.5-1.8-3.2-3-5.3-3.6m5.5-1.8c1-1.7 2.3-3.3 4.1-4.8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand${light ? " footer-brand-link" : ""}`} aria-label="Addis Hiwot SACCO home">
      <span className="brand-mark"><SeedMark /></span>
      <span className="brand-name">
        <strong>Addis Hiwot SACCO</strong>
        <span>አዲስ ሕይወት · Savings &amp; Credit</span>
      </span>
    </Link>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="/#about">Our cooperative</a>
          <a href="/#how-it-works">How membership works</a>
          <Link to="/admin">Staff portal</Link>
        </nav>
        <Link to="/register" className="nav-cta">Become a member <ArrowRight size={15} /></Link>
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {menuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <a href="/#about" onClick={closeMenu}>Our cooperative</a>
          <a href="/#how-it-works" onClick={closeMenu}>How membership works</a>
          <Link to="/admin" onClick={closeMenu}>Staff portal</Link>
          <Link to="/register" onClick={closeMenu}>Become a member</Link>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-wrap footer-inner">
        <div>
          <div className="footer-brand"><Brand light /></div>
          <div className="footer-note">A cooperative built on shared effort and mutual care.</div>
        </div>
        <nav className="footer-nav" aria-label="Footer navigation">
          <a href="/#about">About the cooperative</a>
          <a href="/#how-it-works">Membership</a>
          <Link to="/register">Apply to join</Link>
          <Link to="/admin">Staff portal</Link>
        </nav>
      </div>
    </footer>
  );
}

function SiteLayout({ children }) {
  return (
    <div className="site-shell">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="hero-art" aria-label="Illustration of a community home among terraced green hills">
      <span className="hero-side-label">Stronger together · Addis Ababa</span>
      <div className="art-frame" role="img" aria-label="A warm sunrise over green hills and a welcoming home">
        <div className="art-sky" />
        <div className="art-sun" />
        <div className="art-hill art-hill-one" />
        <div className="art-hill art-hill-two" />
        <div className="art-field" />
        <div className="art-hill art-hill-three" />
        <div className="art-tree tree-a" />
        <div className="art-tree tree-b" />
        <div className="art-house" />
        <div className="art-window" />
        <div className="art-window art-window-two" />
        <div className="art-caption">
          <span className="caption-mark"><SeedMark size={21} /></span>
          <div><span>Our promise</span><strong>Progress, shared.</strong></div>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <SiteLayout>
      <main>
        <section className="hero">
          <div className="page-wrap hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">A cooperative for a brighter tomorrow</span>
              <h1>
                A little shared
                <em> becomes a lot.</em>
                <span className="hero-ethiopic" lang="am">አብረን ለተሻለ ነገ</span>
              </h1>
              <p>
                At Addis Hiwot, people come together to save with purpose and build
                financial strength—one member, one contribution, one future at a time.
              </p>
              <div className="hero-actions">
                <Link to="/register" className="button-primary">Start your application <ArrowRight size={16} /></Link>
                <a href="#about" className="text-link">Get to know us <ArrowDown size={15} /></a>
              </div>
              <div className="hero-note">Member-owned. Community-minded. Rooted in Addis Ababa.</div>
            </div>
            <HeroArtwork />
          </div>
        </section>

        <section className="principle-strip" aria-label="Cooperative principles">
          <div className="page-wrap principle-inner">
            <div className="strip-intro">Good things grow when we build them together.</div>
            <div className="strip-item"><UsersRound size={18} />People before profit</div>
            <div className="strip-item"><ShieldCheck size={18} />Trust through transparency</div>
            <div className="strip-item"><Sprout size={18} />Steady, shared progress</div>
          </div>
        </section>

        <section className="section" id="about">
          <div className="page-wrap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">What we make possible</span>
                <h2>Financial strength,<br />with people at its heart.</h2>
              </div>
              <p>A SACCO is more than a place to save. It is a community choosing to make opportunity more reachable for one another.</p>
            </div>
            <div className="offer-grid">
              <article className="offer-card">
                <span className="offer-index">01 / SAVE TOGETHER</span>
                <span className="offer-symbol"><CircleDollarSign size={25} strokeWidth={1.5} /></span>
                <div>
                  <h3>Make room for your plans.</h3>
                  <p>Build a savings habit with the support of a member-owned cooperative and a community that understands the value of every contribution.</p>
                </div>
                <div className="card-foot"><span>Small steps. Meaningful momentum.</span><ChevronRight size={16} /></div>
              </article>
              <article className="offer-card">
                <span className="offer-index">02 / GROW WITH CARE</span>
                <span className="offer-symbol"><HandCoins size={25} strokeWidth={1.5} /></span>
                <div>
                  <h3>Opportunity, built on trust.</h3>
                  <p>Cooperative finance connects members to one another, creating a foundation for thoughtful financial progress.</p>
                </div>
                <div className="card-foot"><span>Member needs come first.</span><ChevronRight size={16} /></div>
              </article>
            </div>
          </div>
        </section>

        <section className="story-section">
          <div className="page-wrap story-grid">
            <div className="story-visual" aria-label="A seedling at the center of interconnected paths">
              <div className="story-orbit" />
              <div className="seed-center"><SeedMark size={43} /></div>
              <div className="story-quote">“A stronger future is something we grow together.”</div>
            </div>
            <div className="story-copy">
              <span className="eyebrow">The cooperative difference</span>
              <h2>One member's hope can become everyone's strength.</h2>
              <p>
                Addis Hiwot means “new life.” That idea sits at the centre of how we
                work: members are not customers watching from the sidelines. They are
                the cooperative—sharing responsibility, possibility, and a voice in
                the community they build.
              </p>
              <div className="story-values">
                <div className="story-value"><strong>Owned by members</strong><span>People who join are part of the cooperative.</span></div>
                <div className="story-value"><strong>Grounded in community</strong><span>Local relationships shape how we move forward.</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="steps-section" id="how-it-works">
          <div className="page-wrap steps-layout">
            <div className="steps-intro">
              <span className="eyebrow">Your first step</span>
              <h2>Joining starts with a conversation.</h2>
              <p>Tell us a little about yourself. Our team can follow up about the next steps in becoming a member.</p>
              <Link to="/register" className="text-link">Begin your application <ArrowRight size={15} /></Link>
            </div>
            <div className="steps-list">
              <div className="step-row">
                <span className="step-num">01</span>
                <div><h3>Share your details</h3><p>Complete the membership application with your contact and identification information.</p></div>
                <ArrowRight size={17} />
              </div>
              <div className="step-row">
                <span className="step-num">02</span>
                <div><h3>We receive your application</h3><p>Your information is sent to the cooperative for follow-up.</p></div>
                <ArrowRight size={17} />
              </div>
              <div className="step-row">
                <span className="step-num">03</span>
                <div><h3>Connect with our team</h3><p>A cooperative representative can guide you through membership details and what comes next.</p></div>
                <HeartHandshake size={19} />
              </div>
            </div>
          </div>
        </section>

        <section className="closing-band">
          <div className="page-wrap closing-inner">
            <div>
              <span className="eyebrow">አዲስ ሕይወት · A new life, together</span>
              <h2>Your next chapter can begin with one small step.</h2>
            </div>
            <Link to="/register" className="button-primary">Apply for membership <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}

function RegisterPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    const formData = new FormData(event.currentTarget);
    const application = {
      fullName: String(formData.get("fullName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      nationalId: String(formData.get("nationalId") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      occupation: String(formData.get("occupation") || "").trim(),
    };
    setSubmitting(true);
    try {
      const response = await createMemberApplication(application);
      setResult(response);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      setError(submitError.message || "We could not send your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <main className="inner-page">
        <div className="page-wrap">
          <div className="page-heading">
            <span className="eyebrow">Membership application · አባልነት</span>
            <h1>Let’s start with you.</h1>
            <p>Share your details so our cooperative team can get in touch about joining Addis Hiwot SACCO. Fields marked required are needed to submit.</p>
          </div>
          <div className="form-layout">
            <div>
              {result ? (
                <section className="success-panel" aria-live="polite">
                  <span className="success-icon"><Check size={23} /></span>
                  <h2>Application received.</h2>
                  <p>{result.message || "Thank you for your interest in Addis Hiwot SACCO. Your application has been received by the cooperative."} Our team can follow up using the contact details you provided.</p>
                  {result.applicationId && (
                    <>
                      <span className="reference-label">Application reference</span>
                      <span className="reference-id">{result.applicationId}</span>
                    </>
                  )}
                  <p>Please keep this reference for your records.</p>
                  <Link to="/" className="text-link">Return to the home page <ArrowRight size={15} /></Link>
                </section>
              ) : (
                <form className="application-form" onSubmit={handleSubmit}>
                  <div className="form-topline">
                    <strong>Your details</strong>
                    <span>We’ll use these to follow up on your application.</span>
                  </div>
                  <div className="form-grid">
                    <div className="field field-wide">
                      <label htmlFor="fullName">Full name <span>Required</span></label>
                      <input id="fullName" name="fullName" type="text" autoComplete="name" placeholder="Name as shown on your ID" required maxLength={120} />
                    </div>
                    <div className="field">
                      <label htmlFor="phone">Phone number <span>Required</span></label>
                      <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+251 9…" required maxLength={30} />
                    </div>
                    <div className="field">
                      <label htmlFor="email">Email address <span>Optional</span></label>
                      <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={160} />
                    </div>
                    <div className="field field-wide">
                      <label htmlFor="nationalId">National ID number <span>Required</span></label>
                      <input id="nationalId" name="nationalId" type="text" autoComplete="off" placeholder="Enter your national ID number" required maxLength={80} />
                    </div>
                    <div className="field field-wide">
                      <label htmlFor="address">Address <span>Required</span></label>
                      <textarea id="address" name="address" autoComplete="street-address" placeholder="Your neighbourhood, area, or full address" required maxLength={500} />
                    </div>
                    <div className="field field-wide">
                      <label htmlFor="occupation">Occupation <span>Optional</span></label>
                      <input id="occupation" name="occupation" type="text" autoComplete="organization-title" placeholder="Your occupation" maxLength={120} />
                    </div>
                  </div>
                  {error && <div className="form-error" role="alert">{error}</div>}
                  <div className="form-bottom">
                    <div className="privacy-note"><Info size={14} />Your details are submitted to Addis Hiwot SACCO to support this membership application.</div>
                    <button className="button-primary submit-button" type="submit" disabled={submitting}>
                      {submitting ? "Sending application…" : "Submit application"}
                      {!submitting && <ArrowRight size={16} />}
                    </button>
                  </div>
                </form>
              )}
            </div>
            <aside className="form-aside">
              <span className="aside-symbol"><Landmark size={21} /></span>
              <h2>A cooperative begins with its members.</h2>
              <p>Applying is a first step. Our team will help explain membership and answer your questions as you continue.</p>
              <div className="aside-divider" />
              <div className="aside-check"><CheckCircle2 size={15} /> Share accurate contact details so we can reach you.</div>
              <div className="aside-check"><CheckCircle2 size={15} /> Required fields are marked on the form.</div>
              <div className="aside-check"><CheckCircle2 size={15} /> Submission does not itself confirm membership.</div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}

function AdminPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHealth() {
    setLoading(true);
    setError("");
    try {
      setHealth(await getApiHealth());
    } catch (healthError) {
      setHealth(null);
      setError(healthError.message || "The health service could not be reached.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHealth(); }, []);

  return (
    <SiteLayout>
      <main className="inner-page">
        <div className="page-wrap">
          <div className="page-heading">
            <span className="eyebrow">Addis Hiwot SACCO · Staff portal</span>
            <h1>A place for cooperative staff.</h1>
            <p>This page is a setup placeholder. The staff tools are not ready to use yet.</p>
          </div>
          <section className="admin-card">
            <div>
              <h2>Staff tools are not implemented yet.</h2>
              <p>Review and login tools are not ready. There is no staff sign-in or member application review available here today. This page does not provide access to member records.</p>
              <div className="admin-note"><ShieldCheck size={19} /><span>API and database readiness below reflects the health response only. It is not an indication that staff features are available.</span></div>
              <div className="admin-caution">For membership questions, please use the application form and the cooperative team can follow up.</div>
              <Link to="/register" className="text-link">Go to membership application <ArrowRight size={15} /></Link>
            </div>
            <section className="health-box" aria-label="API and database setup status" aria-live="polite">
              <div className="health-heading">
                <strong>Setup status</strong>
                <button className="health-refresh" type="button" onClick={loadHealth} disabled={loading}>
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
              {loading ? (
                <div className="health-loading" aria-label="Checking setup status">
                  <div className="skeleton" />
                  <div className="skeleton" />
                </div>
              ) : error ? (
                <>
                  <div className="health-row"><span>API</span><span className="health-value"><i className="status-dot bad" />Unavailable</span></div>
                  <div className="health-row"><span>Database</span><span className="health-value">Unknown</span></div>
                  <p className="health-error" role="status">{error}</p>
                </>
              ) : (
                <>
                  <div className="health-row">
                    <span>API</span>
                    <span className="health-value"><i className={`status-dot ${health?.status?.toLowerCase() === "ok" ? "ok" : ""}`} />{health?.status || "Unknown"}</span>
                  </div>
                  <div className="health-row">
                    <span>Database</span>
                    <span className="health-value"><i className={`status-dot ${health?.database?.toLowerCase() === "connected" ? "ok" : ""}`} />{health?.database || "Unknown"}</span>
                  </div>
                </>
              )}
            </section>
          </section>
        </div>
      </main>
    </SiteLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
