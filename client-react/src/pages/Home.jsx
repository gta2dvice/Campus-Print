import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import PageBackground from '../components/PageBackground';
import Footer from '../components/Footer';
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

const ALLOWED_TYPES = ['application/pdf'];

function smoothScrollToElement(target) {
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  window.scrollTo({ top: rect.top + scrollTop - 40, behavior: 'smooth' });
}

export default function Home() {
  useDocumentTitle('Print Campus - Skip Queue');
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const heroTextRef = useRef(null);
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]); // [{ key, file, pages, estimated, copies }]
  const [color, setColor] = useState('bw');
  const [size, setSize] = useState('A4');
  const [printingSide, setPrintingSide] = useState('single');
  const [config, setConfig] = useState(null);

  const [bump, setBump] = useState(false);

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function addFiles(newFiles) {
    const accepted = [];
    newFiles.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name}: only PDF files are allowed.`);
        return;
      }
      accepted.push({ key: Math.random(), file, pages: null, estimated: false, copies: 1 });
    });
    if (accepted.length === 0) return;
    setFiles((prev) => [...prev, ...accepted]);
    detectPagesFor(accepted);
  }

  async function detectPagesFor(newlyAdded) {
    const formData = new FormData();
    newlyAdded.forEach((entry) => formData.append('files', entry.file));
    try {
      const res = await fetch('/api/orders/detect-pages', {
        method: 'POST', credentials: 'include', body: formData
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const results = data.files;
      setFiles((prev) => prev.map((entry) => {
        const idx = newlyAdded.findIndex((n) => n.key === entry.key);
        if (idx === -1) return entry;
        const result = results[idx];
        return { ...entry, pages: result.pages, estimated: !!result.estimated };
      }));
    } catch {
      setFiles((prev) => prev.map((entry) =>
        newlyAdded.some((n) => n.key === entry.key) ? { ...entry, pages: 1, estimated: true } : entry
      ));
    }
  }

  function removeFile(key) {
    setFiles((prev) => prev.filter((f) => f.key !== key));
  }

  function clearAllFiles() {
    setFiles([]);
  }

  function updateFileCopies(key, delta) {
    setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, copies: Math.max(1, f.copies + delta) } : f)));
  }

  const totalPages = files.reduce((sum, f) => sum + ((f.pages || 1) * f.copies), 0);

  function calcPrice() {
    if (!config) return { basePrice: 0, a3Extra: 0, total: 0 };
    const basePerPage = config.pricing[color];
    const basePrice = totalPages * basePerPage;
    const a3Extra = size === 'A3' ? totalPages * config.pricing.a3Extra : 0;
    return { basePrice, a3Extra, total: basePrice + a3Extra };
  }

  const { basePrice, a3Extra, total } = calcPrice();

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/orders/config', { credentials: 'include' });
        if (res.ok) setConfig(await res.json());
      } catch (err) {
        console.error('Failed to load config', err);
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    setBump(true);
    const t = setTimeout(() => setBump(false), 300);
    return () => clearTimeout(t);
  }, [total]);

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
      if (data.isLoggedIn) navigate('/new-order');
      else { setAuthRedirect('/new-order'); setModalOpen(true); }
    } catch {
      setAuthRedirect('/new-order');
      setModalOpen(true);
    }
  }

  function scrollToId(id) {
    smoothScrollToElement(document.getElementById(id));
  }

  async function handleOrderClick() {
    try {
      localStorage.setItem('cp_pending_order', JSON.stringify({
        color, size, printingSide,
      }));
    } catch {
      // localStorage unavailable
    }
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      const data = await res.json();
      if (data.isLoggedIn) navigate('/new-order');
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
<<<<<<< HEAD
                      <strong>Delivey Points</strong>
                      <p>1.Main Gate<br />2.Red Canteen<br />3.Hostel Gate</p>
=======
                      <strong>Delivery Points</strong>
                      <p>1.Main Gate<br />2.Academic Block<br />3.Hostel Gate</p>
>>>>>>> 32df33e (upload sys)
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
                  No hidden charges. Upload your PDFs below and see your estimated cost instantly.
                </p>
              </div>

              <div className="pricing-cards-row">
                <div className="pricing-card" id="pcColorCard">
                  <div className="pc-icon">🖨️</div>
                  <h3 className="pc-title">Color Mode</h3>
                  <div className="pc-toggle-group" id="pcColorGroup">
                    <button className={`pc-chip${color === 'bw' ? ' active' : ''}`} onClick={() => setColor('bw')}>
                      B&amp;W
                      <span className="pc-chip-price">₹2 / page</span>
                    </button>
                    <button className={`pc-chip${color === 'color' ? ' active' : ''}`} onClick={() => setColor('color')}>
                      Color
                      <span className="pc-chip-price">₹5 / page</span>
                    </button>
                  </div>
                </div>

                <div className="pricing-card" id="pcSizeCard">
                  <div className="pc-icon">📄</div>
                  <h3 className="pc-title">Paper Size</h3>
                  <div className="pc-toggle-group" id="pcSizeGroup">
                    <button className={`pc-chip${size === 'A4' ? ' active' : ''}`} onClick={() => setSize('A4')}>
                      A4
                      <span className="pc-chip-price">Standard</span>
                    </button>
                    <button className={`pc-chip${size === 'A3' ? ' active' : ''}`} onClick={() => setSize('A3')}>
                      A3
                      <span className="pc-chip-price">+₹10</span>
                    </button>
                  </div>
                </div>

                <div className="pricing-card" id="pcSideCard">
                  <div className="pc-icon">↕️</div>
                  <h3 className="pc-title">Printing Side</h3>
                  <div className="pc-toggle-group" id="pcSideGroup">
                    <button className={`pc-chip${printingSide === 'single' ? ' active' : ''}`} onClick={() => setPrintingSide('single')}>
                      Single
                      <span className="pc-chip-price">One Side</span>
                    </button>
                    <button className={`pc-chip${printingSide === 'double' ? ' active' : ''}`} onClick={() => setPrintingSide('double')}>
                      Double
                      <span className="pc-chip-price">Both Sides</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="upload-interactive-section" style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <div className="upload-zone-home"
                     style={{
                       width: '100%',
                       maxWidth: '600px',
                       border: '2px dashed var(--primary-blue, #3b82f6)',
                       borderRadius: '1rem',
                       padding: '2rem',
                       textAlign: 'center',
                       cursor: 'pointer',
                       background: 'rgba(59, 130, 246, 0.05)',
                       transition: 'all 0.2s ease'
                     }}
                     onClick={() => fileInputRef.current?.click()}
                     onDragOver={(e) => { e.preventDefault(); }}
                     onDrop={(e) => { e.preventDefault(); addFiles([...e.dataTransfer.files]); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }}
                  />
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                  <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Upload Your PDFs</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>Drag &amp; drop your PDF files here or click to browse</p>
                  <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>+ Choose PDF Files</button>
                  <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>You can upload multiple PDFs</p>
                </div>

                {files.length > 0 && (
                  <div className="home-files-list" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>Uploaded Files ({files.length})</h4>
                      <button onClick={clearAllFiles} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>Clear All</button>
                    </div>
                    {files.map((f) => (
                      <div key={f.key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        background: 'white',
                        borderRadius: '0.75rem',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        border: '1px solid #eee',
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <span style={{ fontSize: '1.2rem' }}>📄</span>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{f.file.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{formatSize(f.file.size)} · {f.pages === null ? 'Detecting...' : `${f.pages} pages`}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div className="counter" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f3f4f6', padding: '0.25rem', borderRadius: '0.5rem' }}>
                            <button className="counter-btn" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }} onClick={() => updateFileCopies(f.key, -1)}>−</button>
                            <span style={{ minWidth: '1.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: '600' }}>{f.copies}</span>
                            <button className="counter-btn" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }} onClick={() => updateFileCopies(f.key, 1)}>+</button>
                          </div>
                          <button onClick={() => removeFile(f.key)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-secondary" style={{ width: 'fit-content', alignSelf: 'center', fontSize: '0.85rem' }} onClick={() => fileInputRef.current?.click()}>+ Add More PDFs</button>
                  </div>
                )}
              </div>

              <div className="pricing-total-wrap">
                <div className="pricing-total-card">
                  <div className="ptc-breakdown" id="pcBreakdown">
                    <span className="ptc-line"><span className="ptc-line-label">Total Pages</span><span className="ptc-line-val">{totalPages} pages</span></span>
                    <span className="ptc-line"><span className="ptc-line-label">Printing Charges</span><span className="ptc-line-val">₹{basePrice + a3Extra}</span></span>
                    <span className="ptc-line"><span className="ptc-line-label">Service Charge</span><span className="ptc-line-val">₹{config?.pricing?.serviceCharge || 0}</span></span>
                    <span className="ptc-line"><span className="ptc-line-label">Delivery Charge</span><span className="ptc-line-val">₹{config?.pricing?.deliveryCharge || 0}</span></span>
                  </div>
                  <div className="ptc-divider"></div>
                  <div className="ptc-total-row">
                    <span className="ptc-total-label">Estimated Total</span>
                    <span className={`ptc-total-amount${bump ? ' bump' : ''}`} id="pcTotalAmount">₹{total + (config?.pricing?.serviceCharge || 0) + (config?.pricing?.deliveryCharge || 0)}</span>
                  </div>
                  <p className="ptc-note">Final price calculated per page after upload. Copies can be set in the order form.</p>
                  <button className="btn btn-primary ptc-order-btn" id="ptcOrderBtn" disabled={files.length === 0} onClick={handleOrderClick}>
                    Start Your Order <span className="arrow-icon">→</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
          <Footer />
        </main>
      </div>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
	</>
  );
}
