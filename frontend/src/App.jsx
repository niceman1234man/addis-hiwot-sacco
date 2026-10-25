import { useRef, useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { createMemberApplication } from "./api/membersApi.js";
import AppRoutes from "./routes/AppRoutes.jsx";
import PublicHeader from "./components/layout/PublicHeader.jsx";
import logo from "./assets/logo.jpg";

const regions = [
  "Addis Ababa",
  "Afar",
  "Amhara",
  "Benishangul-Gumuz",
  "Central Ethiopia",
  "Dire Dawa",
  "Gambela",
  "Harari",
  "Oromia",
  "Sidama",
  "Somali",
  "South Ethiopia",
  "Southwest Ethiopia",
  "Tigray",
];

function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand${light ? " footer-brand-link" : ""}`} aria-label="Addis Hiwot SACCO home">
      <img className="brand-logo" src={logo} alt="" />
      <span className="brand-name">
        <strong>Addis Hiwot SACCO</strong>
        <span>አዲስ ሕይወት · Savings &amp; Credit</span>
      </span>
    </Link>
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
          <Link to="/admin">Staff portal</Link>
        </nav>
      </div>
    </footer>
  );
}

function SiteLayout({ children }) {
  return (
    <div className="site-shell">
      <PublicHeader />
      {children}
      <Footer />
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="hero-art" aria-label="Addis Hiwot SACCO community logo">
      <span className="hero-side-label">Stronger together · Addis Ababa</span>
      <div className="hero-logo-frame">
        <img className="hero-logo" src={logo} alt="Addis Hiwot SACCO logo showing members building shared savings" />
        <div className="hero-logo-caption">
          <span>Our promise</span>
          <strong>Progress, shared.</strong>
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

        <section className="section" id="about">
          <div className="page-wrap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">What we make possible</span>
                <h2>Financial strength, together.</h2>
              </div>
              <p>A member-owned community helping make saving and financial opportunity more reachable.</p>
            </div>
            <div className="offer-grid" id="services">
              <article className="offer-card">
                <span className="offer-index">01 / SAVE TOGETHER</span>
                <span className="offer-symbol"><CircleDollarSign size={25} strokeWidth={1.5} /></span>
                <div>
                  <h3>Save with purpose.</h3>
                  <p>Build a steady savings habit with the support of a member-owned cooperative.</p>
                </div>
                <div className="card-foot"><span>Small steps. Shared progress.</span><ChevronRight size={16} /></div>
              </article>
              <article className="offer-card">
                <span className="offer-index">02 / GROW WITH CARE</span>
                <span className="offer-symbol"><HandCoins size={25} strokeWidth={1.5} /></span>
                <div>
                  <h3>Grow together.</h3>
                  <p>Members support one another and build a stronger financial future together.</p>
                </div>
                <div className="card-foot"><span>Member needs come first.</span><ChevronRight size={16} /></div>
              </article>
            </div>
          </div>
        </section>

        <section className="steps-section" id="how-it-works">
          <div className="page-wrap steps-layout">
            <div className="steps-intro">
              <span className="eyebrow">Your first step</span>
              <h2>Joining starts with a conversation.</h2>
              <p>Submit your details and our team will contact you about joining.</p>
            </div>
            <div className="steps-list">
              <div className="step-row">
                <span className="step-num">01</span>
                <div><h3>Share your details</h3><p>Complete the short application and provide an ID document.</p></div>
                <ArrowRight size={17} />
              </div>
              <div className="step-row">
                <span className="step-num">02</span>
                <div><h3>We review it</h3><p>Our cooperative team receives your application.</p></div>
                <ArrowRight size={17} />
              </div>
              <div className="step-row">
                <span className="step-num">03</span>
                <div><h3>We get in touch</h3><p>Our team will help you with the next steps.</p></div>
                <HeartHandshake size={19} />
              </div>
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="page-wrap contact-inner">
            <div><span className="eyebrow">Get in touch</span><h2>Here for our community.</h2><p>Visit the Addis Hiwot team in Addis Ababa for cooperative services and membership information.</p></div>
            <div className="contact-card"><span>ADDIS HIWOT SACCO</span><strong>Visit our team</strong><p>Addis Ababa, Ethiopia</p></div>
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
  const [hasSignature, setHasSignature] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({});
  const signatureCanvas = useRef(null);
  const isDrawing = useRef(false);

  function updateSelectedFile(event) {
    const { name, files } = event.currentTarget;
    setSelectedFiles((current) => ({
      ...current,
      [name]: files?.[0]?.name || "",
    }));
  }

  function signaturePoint(event) {
    const canvas = signatureCanvas.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }

  function startSignature(event) {
    const canvas = signatureCanvas.current;
    if (!canvas) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const context = canvas.getContext("2d");
    const point = signaturePoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#19392e";
    isDrawing.current = true;
    setHasSignature(true);
  }

  function drawSignature(event) {
    if (!isDrawing.current || !signatureCanvas.current) return;
    event.preventDefault();
    const context = signatureCanvas.current.getContext("2d");
    const point = signaturePoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopSignature() {
    isDrawing.current = false;
  }

  function clearSignature() {
    const canvas = signatureCanvas.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    const formData = new FormData(event.currentTarget);
    const front = formData.get("nationalIdFront");
    const back = formData.get("nationalIdBack");
    const photo = formData.get("personalPhoto");
    if (!(front instanceof File && front.size) && !(back instanceof File && back.size)) {
      setError("Upload at least one national ID document (front or back).");
      return;
    }
    if (front instanceof File && front.size > 10 * 1024 * 1024) {
      setError("The front of your national ID must be 10MB or smaller.");
      return;
    }
    if (back instanceof File && back.size > 10 * 1024 * 1024) {
      setError("The back of your national ID must be 10MB or smaller.");
      return;
    }
    if (photo instanceof File && photo.size > 5 * 1024 * 1024) {
      setError("Your personal photo must be 5MB or smaller.");
      return;
    }
    formData.set(
      "signature",
      hasSignature && signatureCanvas.current
        ? signatureCanvas.current.toDataURL("image/png")
        : "",
    );
    setSubmitting(true);
    try {
      const response = await createMemberApplication(formData);
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
                    <strong>Personal information</strong>
                    <span>Fields marked * are required.</span>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="firstName">First name *</label>
                      <input id="firstName" name="firstName" type="text" autoComplete="given-name" required maxLength={80} />
                    </div>
                    <div className="field">
                      <label htmlFor="middleName">Middle name</label>
                      <input id="middleName" name="middleName" type="text" autoComplete="additional-name" maxLength={80} />
                    </div>
                    <div className="field">
                      <label htmlFor="lastName">Last name *</label>
                      <input id="lastName" name="lastName" type="text" autoComplete="family-name" required maxLength={80} />
                    </div>
                    <div className="field">
                      <label htmlFor="gender">Gender *</label>
                      <select id="gender" name="gender" required defaultValue="">
                        <option value="" disabled>Select gender</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="phoneNumber1">Phone number 1 *</label>
                      <input id="phoneNumber1" name="phoneNumber1" type="tel" autoComplete="tel" required maxLength={32} />
                    </div>
                    <div className="field">
                      <label htmlFor="phoneNumber2">Phone number 2</label>
                      <input id="phoneNumber2" name="phoneNumber2" type="tel" autoComplete="tel" maxLength={32} />
                    </div>
                    <div className="field field-wide">
                      <label htmlFor="email">Email</label>
                      <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} />
                    </div>
                    <div className="field field-wide form-section-title">
                      <h3>Address information</h3>
                    </div>
                    <div className="field">
                      <label htmlFor="currentCityRegion">Current city / region *</label>
                      <select id="currentCityRegion" name="currentCityRegion" required defaultValue="">
                        <option value="" disabled>Select region</option>
                        {regions.map((region) => <option key={region} value={region}>{region}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="subCityZone">Sub city / zone *</label>
                      <input id="subCityZone" name="subCityZone" type="text" required maxLength={100} />
                    </div>
                    <div className="field">
                      <label htmlFor="woreda">Woreda *</label>
                      <input id="woreda" name="woreda" type="text" required maxLength={100} />
                    </div>
                    <div className="field field-wide form-section-title document-section-title">
                      <h3>Document uploads</h3>
                      <p><strong>National ID (front &amp; back) *</strong> — Upload at least one side. Files must be JPG, PNG, GIF, WebP, or PDF.</p>
                    </div>
                    <div className="field upload-field">
                      <label htmlFor="nationalIdFront">National ID — front</label>
                      <input id="nationalIdFront" name="nationalIdFront" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={updateSelectedFile} />
                      <span className="field-help">Maximum 10MB{selectedFiles.nationalIdFront ? ` · ${selectedFiles.nationalIdFront}` : ""}</span>
                    </div>
                    <div className="field upload-field">
                      <label htmlFor="nationalIdBack">National ID — back</label>
                      <input id="nationalIdBack" name="nationalIdBack" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={updateSelectedFile} />
                      <span className="field-help">Maximum 10MB{selectedFiles.nationalIdBack ? ` · ${selectedFiles.nationalIdBack}` : ""}</span>
                    </div>
                    <div className="field field-wide upload-field">
                      <label htmlFor="personalPhoto">Personal photo (passport size) <span>Optional</span></label>
                      <input id="personalPhoto" name="personalPhoto" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={updateSelectedFile} />
                      <span className="field-help">Recent passport-sized photo or PDF · Maximum 5MB{selectedFiles.personalPhoto ? ` · ${selectedFiles.personalPhoto}` : ""}</span>
                    </div>
                    <div className="field field-wide signature-field">
                      <div className="signature-heading">
                        <label htmlFor="signatureCanvas">Signature <span>Optional · Draw your signature</span></label>
                        <button className="signature-clear" type="button" onClick={clearSignature}>Clear signature</button>
                      </div>
                      <canvas
                        id="signatureCanvas"
                        ref={signatureCanvas}
                        className="signature-canvas"
                        width="720"
                        height="200"
                        aria-label="Draw your signature in this box"
                        onPointerDown={startSignature}
                        onPointerMove={drawSignature}
                        onPointerUp={stopSignature}
                        onPointerCancel={stopSignature}
                        onLostPointerCapture={stopSignature}
                      />
                      <span className="field-help">Draw your signature in the box above.</span>
                    </div>
                  </div>
                  {error && <div className="form-error" role="alert">{error}</div>}
                  <div className="form-bottom">
                    <div className="privacy-note"><Info size={14} />Your details and ID documents are submitted to Addis Hiwot SACCO for this membership application.</div>
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
              <p>Applying is a first step. Our team can use your contact details to follow up about membership and answer your questions.</p>
              <div className="aside-divider" />
              <div className="aside-check"><CheckCircle2 size={15} />Upload at least one side of your national ID.</div>
              <div className="aside-check"><CheckCircle2 size={15} />Required personal and address fields are marked *.</div>
              <div className="aside-check"><CheckCircle2 size={15} />Submitting an application does not itself confirm membership.</div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}

export default function App() {
  return <AppRoutes HomePage={HomePage} RegisterPage={RegisterPage} />;
}
