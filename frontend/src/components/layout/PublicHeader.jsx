import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

function PublicBrand() {
  return <Link to="/" className="brand" aria-label="Addis Hiwot SACCO home">
    <span className="brand-mark" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 26.5C9.7 23.9 7.2 18.7 9.4 12.8c4.9.2 8.3 3.5 8.2 8.1-.1 2.2-.7 4-1.6 5.6Z" fill="currentColor" opacity=".7"/><path d="M16.2 25.8c-1.7-7.5.7-14.5 7.1-19.9 3.7 6.4 2 13.6-4.4 18.1-1 .7-1.9 1.3-2.7 1.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 27V16.6m0 4.4c-1.5-1.8-3.2-3-5.3-3.6m5.5-1.8c1-1.7 2.3-3.3 4.1-4.8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/></svg></span>
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
