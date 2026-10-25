import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.jpg";
import { LanguageToggle } from "../../i18n/LanguageContext.jsx";

function PublicBrand() {
  return <Link to="/" className="brand" aria-label="Addis Hiwot SACCO home">
    <img className="brand-logo" src={logo} alt="" />
    <span className="brand-name"><strong>Addis Hiwot SACCO</strong><span>አዲስ ሕይወት · Savings &amp; Credit</span></span>
  </Link>;
}

export default function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return <header className="site-header">
    <div className="nav-inner">
      <PublicBrand />
      <nav className="desktop-nav" aria-label="Main navigation">
        <a href="/#about">About us</a>
        <a href="/#services">Services</a>
        <a href="/#contact">Contacts</a>
      </nav>
      <div className="nav-actions">
        <Link to="/admin" className="nav-staff-link">Staff portal</Link>
        <Link to="/register" className="nav-cta">Become a member <ArrowRight size={15} /></Link>
      </div>
      <LanguageToggle />
      <button type="button" className="menu-toggle" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        {menuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
    </div>
    {menuOpen && <nav className="mobile-nav" aria-label="Mobile navigation">
      <a href="/#about" onClick={closeMenu}>About us</a>
      <a href="/#services" onClick={closeMenu}>Services</a>
      <a href="/#contact" onClick={closeMenu}>Contacts</a>
      <Link to="/register" onClick={closeMenu}>Become a member</Link>
      <Link to="/admin" onClick={closeMenu}>Staff portal</Link>
    </nav>}
  </header>;
}
