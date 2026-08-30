import { useEffect, useRef, useState } from 'react';
import AuthModal from '../components/AuthModal';
import PageBackground from '../components/PageBackground';
import { setAuthRedirect } from '../lib/authRedirect';
import useDocumentTitle from '../lib/useDocumentTitle';
import '../styles/style.css';

const STUDENTS = [
  { name: 'Divye', branch: 'CSE Core', color: '59, 130, 246', review: 'Very fast printing and affordable pricing. Saved my semester submissions!' },
  { name: 'Kartike', branch: 'CSE AI-ML', color: '249, 115, 22', review: 'Upload system is smooth and no more long queues.' },
  { name: 'Ananya', branch: 'ECE', color: '20, 184, 166', review: 'Clean prints and very quick service inside campus.' },
  { name: 'Bhargavii', branch: 'BCA', color: '239, 68, 68', review: 'Very fast printing and affordable pricing. Saved my semester submissions!' },
  { name: 'Kush', branch: 'CSE Core', color: '139, 92, 246', review: 'Upload system is smooth and no more long queues.' },
  { name: 'Yashavii', branch: 'CSE AI-ML', color: '56, 189, 248', review: 'Upload system is smooth and no more long queues.' },
];

const PRICES = { bw: 2, color: 5, a3: 10, spiral: 20, express: 15 };

function smoothScrollToElement(target) {
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  window.scrollTo({ top: rect.top + scrollTop - 40, behavior: 'smooth' });
}

export default function Home() {
  useDocumentTitle('Print Campus - Skip Queue');
  const [modalOpen, setModalOpen] = useState(false);
  const heroTextRef = useRef(null);

  const [state, setState] = useState({ pages: 10, color: 'bw', size: 'A4', spiral: false, express: false });
  const [bump, setBump] = useState(false);

  // ── Hero scroll blur/fade ──
  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY;
      const vh = window.innerHeight;
      const blurPower = Math.min((scrolled / vh) * 20, 20);
      document.documentElement.style.setProperty('--hero-blur', `${blurPower}px`);
      if (heroTextRef.current && scrolled < vh) {
        const opacity = Math.max(0, 1 - scrolled / (vh * 0.6));
        const scale = 1 - scrolled / (vh * 5);
        heroTextRef.current.style.opacity = opacity;
        heroTextRef.current.style.transform = `scale(${scale})`;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Reveal-on-scroll + GPU hints + pause orbit when tab hidden + section spy ──
  useEffect(() => {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('reveal-show'); });
    }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    document.querySelectorAll('.trusted-card').forEach((card) => { card.style.willChange = 'transform'; });
    const heroContainer = document.querySelector('.hero-container');
    if (heroContainer) heroContainer.style.willChange = 'filter';

    function onVisibility() {
      const orbit = document.querySelector('.trusted-orbit');
      if (!orbit) return;
      orbit.style.animationPlayState = document.hidden ? 'paused' : 'running';
    }
    document.addEventListener('visibilitychange', onVisibility);

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.top-nav a[href^="#"]');
    let sectionSpy = null;
    if (sections.length && navLinks.length) {
      const linkById = new Map();
      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) linkById.set(href.slice(1), link);
      });
      sectionSpy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const activeLink = linkById.get(entry.target.id);
          if (!activeLink) return;
          navLinks.forEach((link) => link.classList.remove('nav-link--active'));
          activeLink.classList.add('nav-link--active');
        });
      }, { threshold: 0.45, rootMargin: '-10% 0px -55% 0px' });
      sections.forEach((section) => sectionSpy.observe(section));
    }

    return () => {
      revealObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (sectionSpy) sectionSpy.disconnect();
    };
  }, []);

  async function handleUploadClick(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      const data = await res.json();
      if (data.isLoggedIn) window.location.href = '/new-order';
      else { setAuthRedirect('/new-order'); setModalOpen(true); }
    } catch {
      setModalOpen(true);
    }
  }

  function scrollToId(id) {
    smoothScrollToElement(document.getElementById(id));
  }

  const perPage = PRICES[state.color];
  const base = state.pages * perPage;
  const a3Add = state.size === 'A3' ? PRICES.a3 : 0;
  const spiralAdd = state.spiral ? PRICES.spiral : 0;
  const expressAdd = state.express ? PRICES.express : 0;
  const total = base + a3Add + spiralAdd + expressAdd;
  const sliderPct = ((state.pages - 1) / (200 - 1)) * 100;

  useEffect(() => {
    setBump(true);
    const t = setTimeout(() => setBump(false), 300);
    return () => clearTimeout(t);
  }, [total]);

  async function handleOrderClick() {
    try {
      localStorage.setItem('cp_pending_order', JSON.stringify({
        color: state.color, size: state.size, spiral: state.spiral, express: state.express,
      }));
    } catch {
      // localStorage unavailable — New Order just falls back to its own defaults
    }
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      const data = await res.json();
      if (data.isLoggedIn) window.location.href = '/new-order';
      else { setAuthRedirect('/new-order'); setModalOpen(true); }
    } catch {
      setAuthRedirect('/new-order');
      setModalOpen(true);
    }
  }

  return (
    <>
      <PageBackground />
      <div className="page-content">

        {/* ── STICKY HERO ── */}
        <div className="hero-container" id="hero">
          <header className="top-nav">
            <nav>
              <a href="/about" className="nav-link">About Us</a>
              <a href="#location-section" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToId('location-section'); }}>Location</a>
            </nav>
          </header>

          <div className="hero-content" id="heroText" ref={heroTextRef}>
            <h1 className="hero-title">CAMPUS PRINTS</h1>
            <p className="hero-subtitle">Your ideas, printed fast &amp; affordably</p>

            <div className="cta-buttons">
              <button className="btn btn-primary" id="uploadBtn" onClick={handleUploadClick}>
                Upload Your Project
                <span className="arrow-icon">→</span>
              </button>
              <button className="btn btn-secondary" id="seePricingBtn" type="button" onClick={(e) => { e.preventDefault(); scrollToId('pricing-section'); }}>
                See Services &amp; Pricing
              </button>
            </div>
          </div>

          <div className="scroll-arrow" id="scrollArrow" onClick={() => scrollToId('main-content')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </div>
        </div>

        {/* ── SLIDING CONTENT ── */}
        <main className="reveal-wrapper" id="main-content">

          {/* SECTION 1: Location */}
          <section className="location-section reveal" id="location-section">
            <div className="location-inner">
              <div className="location-text">
                <span className="location-tag">📍 Find Us</span>
                <h2 className="location-title">Your Prints.<br /> At Our Campus.</h2>
                <p className="location-subtitle">
                  No need to leave campus for your prints. We handle the printing and deliver your order right to you inside the college.
                </p>
                <div className="location-details">
                  <div className="location-detail-item">
                    <span className="detail-icon">🏛️</span>
                    <div>
                      <strong>Delivey Points</strong>
                      <p>1.Main Gate<br />2.Academic Block<br />3.Hostel Gate</p>
                    </div>
                  </div>
                  <div className="location-detail-item">
                    <span className="detail-icon">🕐</span>
                    <div>
                      <strong>Hours</strong>
                      <p>Mon –Fri: 9:00 AM – 4:00 PM<br />Sunday &amp; Saturday: Closed(Online Services)</p>
                    </div>
                  </div>
                  <div className="location-detail-item">
                    <span className="detail-icon">📞</span>
                    <div>
                      <strong>Contact</strong>
                      <p>+91 9457311377<br />printcampus@college.edu</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="location-map-card">
                <div className="map-placeholder">
                  <div className="map-pin-anim">
                    <div className="map-pin">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z" />
                        <circle cx="12" cy="9" r="2.5" fill="#3b82f6" stroke="none" />
                      </svg>
                    </div>
                    <div className="pin-pulse"></div>
                  </div>
                  <p className="map-label">Print Campus<br /><span>Main Academic Block</span></p>
                  <a href="https://maps.app.goo.gl/CV2jsxgn5Jkpvqkk7" target="_blank" rel="noreferrer" className="btn btn-primary map-btn">
                    Open in Maps →
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Trusted by Students */}
          <section className="trusted-section reveal">
            <div className="trusted-inner">
              <h2 className="trusted-title">Trusted by Students</h2>
              <p className="trusted-subtitle">
                Join hundreds of students who rely on Print Campus for fast, reliable prints.
              </p>

              <div className="trusted-wrapper">
                <div className="trusted-orbit" style={{ '--quantity': 6 }}>
                  {STUDENTS.map((s, i) => (
                    <div key={s.name} className="trusted-card" style={{ '--index': i, '--color-card': s.color }}>
                      <div className="trusted-card-bg"></div>
                      <div className="trusted-card-content">
                        <h3 className="student-name">{s.name}</h3>
                        <p className="student-branch">{s.branch}</p>
                        <p className="student-rating">⭐⭐⭐⭐⭐</p>
                        <p className="student-review">{s.review}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: Pricing */}
          <section className="pricing-section reveal" id="pricing-section">
            <div className="pricing-orb pricing-orb-1"></div>
            <div className="pricing-orb pricing-orb-2"></div>

            <div className="pricing-inner">
              <div className="pricing-header">
                <span className="pricing-tag">💰 Transparent Pricing</span>
                <h2 className="pricing-title">Simple &amp; Affordable</h2>
                <p className="pricing-subtitle">
                  No hidden charges. Slide through the options below and see your estimated cost instantly.
                </p>
              </div>

              <div className="pricing-cards-row">
                <div className="pricing-card" id="pcColorCard">
                  <div className="pc-icon">🖨️</div>
                  <h3 className="pc-title">Color Mode</h3>
                  <div className="pc-toggle-group" id="pcColorGroup">
                    <button className={`pc-chip${state.color === 'bw' ? ' active' : ''}`} onClick={() => setState((s) => ({ ...s, color: 'bw' }))}>
                      B&amp;W
                      <span className="pc-chip-price">₹2 / page</span>
                    </button>
                    <button className={`pc-chip${state.color === 'color' ? ' active' : ''}`} onClick={() => setState((s) => ({ ...s, color: 'color' }))}>
                      Color
                      <span className="pc-chip-price">₹5 / page</span>
                    </button>
                  </div>
                </div>

                <div className="pricing-card" id="pcSizeCard">
                  <div className="pc-icon">📄</div>
                  <h3 className="pc-title">Paper Size</h3>
                  <div className="pc-toggle-group" id="pcSizeGroup">
                    <button className={`pc-chip${state.size === 'A4' ? ' active' : ''}`} onClick={() => setState((s) => ({ ...s, size: 'A4' }))}>
                      A4
                      <span className="pc-chip-price">Standard</span>
                    </button>
                    <button className={`pc-chip${state.size === 'A3' ? ' active' : ''}`} onClick={() => setState((s) => ({ ...s, size: 'A3' }))}>
                      A3
                      <span className="pc-chip-price">+₹10</span>
                    </button>
                  </div>
                </div>

                <div className="pricing-card pc-addon-card" id="pcAddonCard">
                  <div className="pc-icon">✨</div>
                  <h3 className="pc-title">Add-ons</h3>
                  <div className="pc-addons">
                    <label className="pc-addon-row" id="pcAddonSpiral">
                      <input
                        type="checkbox"
                        className="pc-addon-check"
                        checked={state.spiral}
                        onChange={(e) => setState((s) => ({ ...s, spiral: e.target.checked }))}
                      />
                      <span className="pc-addon-box"></span>
                      <span className="pc-addon-text">Spiral Binding</span>
                      <span className="pc-addon-badge">+₹20</span>
                    </label>
                    <label className="pc-addon-row" id="pcAddonExpress">
                      <input
                        type="checkbox"
                        className="pc-addon-check"
                        checked={state.express}
                        onChange={(e) => setState((s) => ({ ...s, express: e.target.checked }))}
                      />
                      <span className="pc-addon-box"></span>
                      <span className="pc-addon-text">Express Delivery</span>
                      <span className="pc-addon-badge">+₹15</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pricing-slider-wrap">
                <div className="slider-label-row">
                  <span className="slider-label-text">Number of Pages</span>
                  <span className="slider-value-badge" id="pcPagesDisplay">{state.pages === 1 ? '1 page' : `${state.pages} pages`}</span>
                </div>
                <div className="slider-track-wrap">
                  <input
                    type="range"
                    className="pricing-range"
                    id="pcPagesSlider"
                    min="1"
                    max="200"
                    step="1"
                    value={state.pages}
                    onChange={(e) => setState((s) => ({ ...s, pages: parseInt(e.target.value, 10) }))}
                    style={{ '--slider-pct': `${sliderPct.toFixed(1)}%` }}
                    aria-label="Number of pages"
                  />
                  <div className="slider-fill" id="pcSliderFill"></div>
                </div>
                <div className="slider-ends">
                  <span>1 page</span>
                  <span>200 pages</span>
                </div>
              </div>

              <div className="pricing-total-wrap">
                <div className="pricing-total-card">
                  <div className="ptc-breakdown" id="pcBreakdown">
                    <span className="ptc-line"><span className="ptc-line-label" id="ptcBaseLabel">{state.pages} page{state.pages > 1 ? 's' : ''} × ₹{perPage} ({state.color === 'bw' ? 'B&W' : 'Color'})</span><span className="ptc-line-val" id="ptcBaseVal">₹{base}</span></span>
                    <span className={`ptc-line${state.size !== 'A3' ? ' ptc-line-hidden' : ''}`} id="ptcSizeLine"><span className="ptc-line-label">A3 Upcharge</span><span className="ptc-line-val" id="ptcSizeVal">₹{a3Add}</span></span>
                    <span className={`ptc-line${!state.spiral ? ' ptc-line-hidden' : ''}`} id="ptcSpiralLine"><span className="ptc-line-label">Spiral Binding</span><span className="ptc-line-val">₹{PRICES.spiral}</span></span>
                    <span className={`ptc-line${!state.express ? ' ptc-line-hidden' : ''}`} id="ptcExpressLine"><span className="ptc-line-label">Express Delivery</span><span className="ptc-line-val">₹{PRICES.express}</span></span>
                  </div>
                  <div className="ptc-divider"></div>
                  <div className="ptc-total-row">
                    <span className="ptc-total-label">Estimated Total</span>
                    <span className={`ptc-total-amount${bump ? ' bump' : ''}`} id="pcTotalAmount">₹{total}</span>
                  </div>
                  <p className="ptc-note">Final price calculated per page after upload. Copies can be set in the order form.</p>
                  <button className="btn btn-primary ptc-order-btn" id="ptcOrderBtn" onClick={handleOrderClick}>
                    Start Your Order <span className="arrow-icon">→</span>
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* FOOTER */}
          <footer className="site-footer reveal">
            <div className="footer-watermark">PRINT CAMPUS</div>
            <div className="footer-inner">
              <div className="footer-brand">
                <span className="footer-logo">PRINT CAMPUS</span>
                <p className="footer-tagline">Skip the queue. Print smarter.</p>
              </div>
              <button className="pc-footer-cta" onClick={(e) => { e.preventDefault(); scrollToId('pricing-section'); }}>Print</button>

              <div className="footer-links">
                <div className="footer-col">
                  <h4>Navigate</h4>
                  <a href="/about">About Us</a>
                  <a href="#location-section" onClick={(e) => { e.preventDefault(); scrollToId('location-section'); }}>Location</a>
                  <a href="#" id="footerUploadBtn" onClick={handleUploadClick}>Upload &amp; Print</a>
                </div>
                <div className="footer-col">
                  <h4>Connect</h4>
                  <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
                  <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
                  <a href="mailto:printcampus@college.edu">Email Us</a>
                </div>
              </div>
            </div>
          </footer>

        </main>
      </div>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
