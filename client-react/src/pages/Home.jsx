import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import '../styles/effects.css';

const STUDENTS = [
  { name: 'Divye', branch: 'CSE Core', color: '59, 130, 246', review: 'Very fast printing and affordable pricing. Saved my semester submissions!' },
  { name: 'Kartike', branch: 'CSE AI-ML', color: '249, 115, 22', review: 'Upload system is smooth and no more long queues.' },
  { name: 'Ananya', branch: 'ECE', color: '20, 184, 166', review: 'Clean prints and very quick service inside campus.' },
  { name: 'Bhargavii', branch: 'BCA', color: '239, 68, 68', review: 'Very fast printing and affordable pricing. Saved my semester submissions!' },
  { name: 'Kush', branch: 'CSE Core', color: '139, 92, 246', review: 'Upload system is smooth and no more long queues.' },
  { name: 'Yashavii', branch: 'CSE AI-ML', color: '56, 189, 248', review: 'Upload system is smooth and no more long queues.' },
];

const PRICES = { bw: 2, color: 5, a3: 10, spiral: 20, express: 15 };

function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setShown(true)),
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, shown];
}

function smoothScrollTo(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  window.scrollTo({ top: rect.top + scrollTop - 40, behavior: 'smooth' });
}

export default function Home() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const heroTextRef = useRef(null);
  const pricingRef = useRef(null);

  const [locRef, locShown] = useReveal();
  const [trustRef, trustShown] = useReveal();
  const [priceRef, priceShown] = useReveal();
  const [footRef, footShown] = useReveal();

  const [state, setState] = useState({ pages: 10, color: 'bw', size: 'A4', spiral: false, express: false });
  const [bump, setBump] = useState(false);

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

  useEffect(() => {
    function onVisibility() {
      const orbit = document.querySelector('.trusted-orbit');
      if (orbit) orbit.style.animationPlayState = document.hidden ? 'paused' : 'running';
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  async function handleUploadClick(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      const data = await res.json();
      if (data.isLoggedIn) navigate('/dashboard');
      else setModalOpen(true);
    } catch {
      setModalOpen(true);
    }
  }

  async function handleOrderClick() {
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      const data = await res.json();
      if (data.isLoggedIn) navigate('/new-order');
      else setModalOpen(true);
    } catch {
      setModalOpen(true);
    }
  }

  function scrollToId(id) {
    smoothScrollTo(document.getElementById(id));
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

  return (
    <>
      {/* STICKY HERO */}
      <div className="hero-container sticky top-0 z-[1] flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        <header className="absolute inset-x-0 top-0 z-10 flex justify-center py-8">
          <nav className="flex gap-8">
            <a href="/about" className="nav-link font-medium text-gray-600 hover:text-gray-900">About Us</a>
            <a href="#location-section" onClick={(e) => { e.preventDefault(); scrollToId('location-section'); }} className="nav-link font-medium text-gray-600 hover:text-gray-900">Location</a>
          </nav>
        </header>

        <div ref={heroTextRef} className="relative z-10 max-w-[600px] pb-[22vh] text-center transition-[opacity,transform] duration-100 ease-linear">
          <h1 className="mb-4 text-[3.5rem] font-bold tracking-tight text-gray-900 max-md:text-4xl">PRINT CAMPUS</h1>
          <p className="mb-10 text-xl font-normal text-gray-600 max-md:text-lg">Your ideas, printed fast &amp; affordably</p>

          <div className="flex justify-center gap-4 max-md:flex-col max-md:items-center">
            <button
              onClick={handleUploadClick}
              className="inline-flex items-center rounded-full bg-blue-500 py-3.5 pl-6 pr-4 font-medium text-white shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3),0_2px_4px_-1px_rgba(59,130,246,0.2)] transition hover:-translate-y-px hover:bg-blue-600 hover:shadow-[0_6px_8px_-1px_rgba(59,130,246,0.4),0_4px_6px_-1px_rgba(59,130,246,0.2)] max-md:w-full max-md:max-w-[300px] max-md:justify-center"
            >
              Upload Your Project
              <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-bold text-blue-500">→</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToId('pricing-section')}
              className="inline-flex items-center rounded-full border border-gray-300 px-6 py-3.5 font-medium text-gray-900 transition hover:border-gray-500 hover:bg-white/50 max-md:w-full max-md:max-w-[300px] max-md:justify-center"
            >
              See Services &amp; Pricing
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 z-[1] flex w-full justify-center">
          <img src="/assets/bg1.png" alt="Print Campus Storefronts" className="h-auto w-full max-w-[1800px] min-w-[1200px] object-contain object-bottom max-md:w-[120%] max-md:opacity-15" />
        </div>

        <div
          onClick={() => scrollToId('main-content')}
          className="animate-arrow-bounce absolute bottom-9 left-1/2 z-20 flex -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/20 p-3.5 text-gray-900 backdrop-blur-md transition hover:bg-white/35"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </div>

      {/* SLIDING CONTENT */}
      <main id="main-content" className="relative z-[2] mx-auto w-[92vw] overflow-hidden rounded-t-[40px] bg-[#f3f7fb] shadow-[0_-30px_80px_rgba(0,0,0,0.22)]">

        {/* LOCATION */}
        <section
          ref={locRef}
          id="location-section"
          className={`reveal relative flex min-h-screen items-center justify-center overflow-hidden px-16 py-24 max-md:px-6 max-md:py-16 ${locShown ? 'reveal-show' : ''}`}
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.07)_0%,transparent_70%)]" />

          <div className="relative z-[2] grid w-full max-w-[1100px] grid-cols-2 items-center gap-16 max-lg:grid-cols-1 max-lg:gap-12">
            <div className="text-gray-900">
              <span className="mb-6 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-blue-500">📍 Find Us</span>
              <h2 className="mb-4 text-[3.5rem] font-bold leading-tight tracking-tight text-gray-900 max-lg:text-[2.8rem] max-md:text-[2.2rem]">We're Right<br />On Campus</h2>
              <p className="mb-10 max-w-[460px] text-[1.05rem] text-gray-600">
                No need to leave campus for your prints. We're located right at the heart of the college, just steps away from the main block.
              </p>
              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex-shrink-0 text-2xl">🏛️</span>
                  <div>
                    <strong className="mb-1 block text-sm font-semibold uppercase tracking-wider text-blue-500">Address</strong>
                    <p className="text-[0.95rem] leading-relaxed text-gray-600">Ground Floor, Main Academic Block<br />Near Green Canteen, Campus Gate 1</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex-shrink-0 text-2xl">🕐</span>
                  <div>
                    <strong className="mb-1 block text-sm font-semibold uppercase tracking-wider text-blue-500">Hours</strong>
                    <p className="text-[0.95rem] leading-relaxed text-gray-600">Mon –Fri: 9:00 AM – 4:00 PM<br />Sunday &amp; Saturday: Closed</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex-shrink-0 text-2xl">📞</span>
                  <div>
                    <strong className="mb-1 block text-sm font-semibold uppercase tracking-wider text-blue-500">Contact</strong>
                    <p className="text-[0.95rem] leading-relaxed text-gray-600">+91 98765 43210<br />printcampus@college.edu</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex w-full max-w-[360px] flex-col items-center gap-5 rounded-[28px] border border-blue-500/15 bg-white/80 p-12 text-center shadow-[0_20px_60px_rgba(59,130,246,0.1),0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition hover:-translate-y-1.5 hover:shadow-[0_26px_70px_rgba(59,130,246,0.18),0_10px_30px_rgba(15,23,42,0.16)]">
                <div className="relative mb-2 flex h-20 w-20 items-center justify-center">
                  <div className="relative z-[2] flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-500/28 bg-blue-500/15">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z" />
                      <circle cx="12" cy="9" r="2.5" fill="#3b82f6" stroke="none" />
                    </svg>
                  </div>
                  <div className="animate-pulse-ring absolute -inset-2 rounded-full border-2 border-blue-500/22" />
                </div>
                <p className="text-[1.1rem] font-semibold leading-snug text-gray-900">Print Campus<br /><span className="text-[0.85rem] font-normal text-gray-600">Main Academic Block</span></p>
                <a
                  href="https://maps.app.goo.gl/XY3vxUKK42mQsFqz9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center rounded-full bg-blue-500 px-6 py-2.5 text-sm font-medium text-white shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3)] transition hover:-translate-y-px hover:bg-blue-600"
                >
                  Open in Maps →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* TRUSTED */}
        <section
          ref={trustRef}
          className={`reveal relative z-10 mx-auto flex min-h-screen w-[95%] items-center justify-center overflow-hidden rounded-[60px] bg-[linear-gradient(135deg,#e8f1ff,#3b82f6)] py-[120px] ${trustShown ? 'reveal-show' : ''}`}
        >
          <div className="flex w-full flex-col items-center justify-center gap-2">
            <h2 className="mb-2 text-[4.5rem] font-bold text-gray-900 max-md:text-4xl">Trusted by Students</h2>
            <p className="mx-auto mb-2 max-w-[587px] text-center text-base text-gray-600">
              Join hundreds of students who rely on Print Campus for fast, reliable prints.
            </p>

            <div className="relative flex w-full items-center justify-center py-24">
              <div className="trusted-orbit" style={{ '--quantity': 6 }}>
                {STUDENTS.map((s, i) => (
                  <div key={s.name} className="trusted-card rounded-[22px] shadow-[0_18px_40px_rgba(15,23,42,0.18),0_0_0_1px_rgba(255,255,255,0.5)] backdrop-blur-xl" style={{ '--index': i, '--color-card': s.color }}>
                    <div className="trusted-card-bg" />
                    <div className="absolute inset-0 flex flex-col justify-between p-5 text-gray-50">
                      <div>
                        <h3 className="mb-0.5 text-base font-bold">{s.name}</h3>
                        <p className="text-sm font-medium opacity-90">{s.branch}</p>
                      </div>
                      <div>
                        <p className="mt-1 text-sm">⭐⭐⭐⭐⭐</p>
                        <p className="mt-1 text-sm leading-snug opacity-95">{s.review}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section
          ref={(el) => { priceRef.current = el; pricingRef.current = el; }}
          id="pricing-section"
          className={`reveal relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(155deg,#edf3ff_0%,#f3f7fb_45%,#e8ecff_100%)] px-16 py-24 max-md:px-6 max-md:py-16 ${priceShown ? 'reveal-show' : ''}`}
        >
          <div className="animate-orb-drift pointer-events-none absolute -right-24 -top-24 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.22),transparent_70%)] opacity-45 blur-[60px]" />
          <div className="animate-orb-drift-reverse pointer-events-none absolute -bottom-20 -left-20 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.18),transparent_70%)] opacity-45 blur-[60px]" />

          <div className="relative z-[2] flex w-full max-w-[900px] flex-col items-center gap-12">
            <div className="text-center">
              <span className="mb-5 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5 text-[0.82rem] font-semibold uppercase tracking-wider text-blue-500">💰 Transparent Pricing</span>
              <h2 className="mb-3 text-5xl font-bold tracking-tight text-gray-900 max-md:text-3xl">Simple &amp; Affordable</h2>
              <p className="mx-auto max-w-[520px] text-[1.05rem] leading-relaxed text-gray-600">
                No hidden charges. Slide through the options below and see your estimated cost instantly.
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
              {/* Color Mode */}
              <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/70 p-7 shadow-[0_8px_32px_rgba(59,130,246,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:-translate-y-1.5">
                <div className="text-3xl leading-none">🖨️</div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Color Mode</h3>
                <div className="mt-auto flex flex-col gap-2.5">
                  {[['bw', 'B&W', '₹2 / page'], ['color', 'Color', '₹5 / page']].map(([val, label, price]) => (
                    <button
                      key={val}
                      onClick={() => setState((s) => ({ ...s, color: val }))}
                      className={`flex items-center justify-between rounded-xl border-[1.5px] px-4 py-2.5 text-sm font-medium transition ${
                        state.color === val
                          ? 'border-blue-500 bg-blue-500 text-white shadow-[0_4px_14px_rgba(59,130,246,0.38)]'
                          : 'border-blue-500/20 bg-blue-500/5 text-gray-600 hover:bg-blue-500/10'
                      }`}
                    >
                      {label}
                      <span className={`text-xs font-semibold ${state.color === val ? 'opacity-90' : 'opacity-75'}`}>{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Size */}
              <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/70 p-7 shadow-[0_8px_32px_rgba(59,130,246,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:-translate-y-1.5">
                <div className="text-3xl leading-none">📄</div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Paper Size</h3>
                <div className="mt-auto flex flex-col gap-2.5">
                  {[['A4', 'A4', 'Standard'], ['A3', 'A3', '+₹10']].map(([val, label, price]) => (
                    <button
                      key={val}
                      onClick={() => setState((s) => ({ ...s, size: val }))}
                      className={`flex items-center justify-between rounded-xl border-[1.5px] px-4 py-2.5 text-sm font-medium transition ${
                        state.size === val
                          ? 'border-blue-500 bg-blue-500 text-white shadow-[0_4px_14px_rgba(59,130,246,0.38)]'
                          : 'border-blue-500/20 bg-blue-500/5 text-gray-600 hover:bg-blue-500/10'
                      }`}
                    >
                      {label}
                      <span className={`text-xs font-semibold ${state.size === val ? 'opacity-90' : 'opacity-75'}`}>{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/70 p-7 shadow-[0_8px_32px_rgba(59,130,246,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:-translate-y-1.5 max-lg:col-span-2 max-md:col-span-1">
                <div className="text-3xl leading-none">✨</div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Add-ons</h3>
                <div className="mt-auto flex flex-col gap-2.5">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-blue-500/15 bg-blue-500/[0.03] px-3.5 py-2.5 transition hover:border-blue-500/35 hover:bg-blue-500/[0.07]">
                    <input
                      type="checkbox"
                      className="pc-addon-check"
                      checked={state.spiral}
                      onChange={(e) => setState((s) => ({ ...s, spiral: e.target.checked }))}
                    />
                    <span className="pc-addon-box relative h-[18px] w-[18px] flex-shrink-0 rounded-md border-2 border-blue-500/35 transition" />
                    <span className={`flex-1 text-[0.92rem] transition ${state.spiral ? 'font-medium text-gray-900' : 'text-gray-600'}`}>Spiral Binding</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${state.spiral ? 'bg-blue-500/12 text-blue-500' : 'bg-black/5 text-gray-600'}`}>+₹20</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-blue-500/15 bg-blue-500/[0.03] px-3.5 py-2.5 transition hover:border-blue-500/35 hover:bg-blue-500/[0.07]">
                    <input
                      type="checkbox"
                      className="pc-addon-check"
                      checked={state.express}
                      onChange={(e) => setState((s) => ({ ...s, express: e.target.checked }))}
                    />
                    <span className="pc-addon-box relative h-[18px] w-[18px] flex-shrink-0 rounded-md border-2 border-blue-500/35 transition" />
                    <span className={`flex-1 text-[0.92rem] transition ${state.express ? 'font-medium text-gray-900' : 'text-gray-600'}`}>Express Delivery</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${state.express ? 'bg-blue-500/12 text-blue-500' : 'bg-black/5 text-gray-600'}`}>+₹15</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Slider */}
            <div className="w-full rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_8px_32px_rgba(59,130,246,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl max-md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[0.95rem] font-semibold tracking-wide text-gray-900">Number of Pages</span>
                <span className="min-w-[90px] rounded-full border border-blue-500/22 bg-blue-500/10 px-3.5 py-1.5 text-center text-sm font-bold text-blue-500">
                  {state.pages === 1 ? '1 page' : `${state.pages} pages`}
                </span>
              </div>
              <div className="relative mb-3 h-1.5">
                <input
                  type="range"
                  min="1"
                  max="200"
                  step="1"
                  value={state.pages}
                  onChange={(e) => setState((s) => ({ ...s, pages: parseInt(e.target.value, 10) }))}
                  className="pricing-range h-1.5 w-full cursor-pointer rounded-full"
                  style={{ '--slider-pct': `${sliderPct.toFixed(1)}%` }}
                  aria-label="Number of pages"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs font-medium text-gray-600">
                <span>1 page</span>
                <span>200 pages</span>
              </div>
            </div>

            {/* Total */}
            <div className="w-full">
              <div className="flex w-full flex-col gap-4 rounded-3xl border border-white/65 bg-white/80 p-8 shadow-[0_12px_48px_rgba(59,130,246,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl max-md:p-6">
                <div className="flex flex-col gap-2">
                  <span className="flex items-center justify-between text-[0.95rem] text-gray-600">
                    <span>{state.pages} page{state.pages > 1 ? 's' : ''} × ₹{perPage} ({state.color === 'bw' ? 'B&W' : 'Color'})</span>
                    <span className="font-semibold text-gray-900">₹{base}</span>
                  </span>
                  {state.size === 'A3' && (
                    <span className="flex items-center justify-between text-[0.95rem] text-gray-600">
                      <span>A3 Upcharge</span>
                      <span className="font-semibold text-gray-900">₹{a3Add}</span>
                    </span>
                  )}
                  {state.spiral && (
                    <span className="flex items-center justify-between text-[0.95rem] text-gray-600">
                      <span>Spiral Binding</span>
                      <span className="font-semibold text-gray-900">₹{PRICES.spiral}</span>
                    </span>
                  )}
                  {state.express && (
                    <span className="flex items-center justify-between text-[0.95rem] text-gray-600">
                      <span>Express Delivery</span>
                      <span className="font-semibold text-gray-900">₹{PRICES.express}</span>
                    </span>
                  )}
                </div>
                <div className="h-px bg-[linear-gradient(to_right,transparent,rgba(59,130,246,0.25)_35%,rgba(59,130,246,0.25)_65%,transparent)]" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-900">Estimated Total</span>
                  <span className={`ptc-total-amount text-3xl font-bold tracking-tight text-blue-500 ${bump ? 'bump' : ''}`}>₹{total}</span>
                </div>
                <p className="text-[0.82rem] leading-relaxed text-gray-600">Final price calculated per page after upload. Copies can be set in the order form.</p>
                <button
                  onClick={handleOrderClick}
                  className="mt-1 inline-flex w-fit items-center rounded-full bg-blue-500 py-3.5 pl-6 pr-4 font-medium text-white shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3)] transition hover:-translate-y-px hover:bg-blue-600 max-md:w-full max-md:justify-center"
                >
                  Start Your Order <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-bold text-blue-500">→</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer ref={footRef} className={`reveal relative z-10 min-h-[380px] overflow-hidden bg-[#f3f7fb] pt-16 before:absolute before:inset-x-[6%] before:top-0 before:h-px before:bg-[linear-gradient(to_right,transparent,rgba(59,130,246,0.35)_35%,rgba(59,130,246,0.35)_65%,transparent)] ${footShown ? 'reveal-show' : ''}`}>
          <div className="footer-watermark pointer-events-none absolute bottom-8 left-1/2 z-0 -translate-x-1/2 whitespace-nowrap font-extrabold tracking-[0.12em] text-slate-900 opacity-[0.04]">PRINT CAMPUS</div>
          <div className="relative z-[1] mx-auto flex max-w-[1100px] flex-wrap items-start justify-between gap-12 px-12 pb-12 max-md:flex-col max-md:px-6 max-md:pb-8">
            <div className="max-w-[280px]">
              <span className="mb-2.5 block text-4xl font-black tracking-wider text-gray-900">PRINT CAMPUS</span>
              <p className="text-[0.95rem] leading-relaxed text-gray-600">Skip the queue. Print smarter.</p>
            </div>
            <button
              onClick={() => scrollToId('pricing-section')}
              className="m-12 rounded-full bg-[linear-gradient(135deg,#2563eb,#3b82f6)] px-10 py-3.5 font-semibold text-gray-50 shadow-[0_18px_30px_rgba(37,99,235,0.35)] transition hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_22px_40px_rgba(37,99,235,0.4)] hover:brightness-105 max-md:m-0"
            >
              Print
            </button>
            <div className="flex gap-16 max-md:gap-8">
              <div className="flex flex-col gap-3">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-600">Navigate</h4>
                <a href="/about" className="text-[0.95rem] text-gray-600 no-underline transition hover:-translate-y-0.5 hover:text-gray-900">About Us</a>
                <a href="#location-section" onClick={(e) => { e.preventDefault(); scrollToId('location-section'); }} className="text-[0.95rem] text-gray-600 no-underline transition hover:-translate-y-0.5 hover:text-gray-900">Location</a>
                <a href="#" onClick={handleUploadClick} className="text-[0.95rem] text-gray-600 no-underline transition hover:-translate-y-0.5 hover:text-gray-900">Upload &amp; Print</a>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-600">Connect</h4>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-[0.95rem] text-gray-600 no-underline transition hover:-translate-y-0.5 hover:text-gray-900">Instagram</a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-[0.95rem] text-gray-600 no-underline transition hover:-translate-y-0.5 hover:text-gray-900">LinkedIn</a>
                <a href="mailto:printcampus@college.edu" className="text-[0.95rem] text-gray-600 no-underline transition hover:-translate-y-0.5 hover:text-gray-900">Email Us</a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
