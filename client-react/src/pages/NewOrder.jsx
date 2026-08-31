import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import Toast from '../components/Toast';
import useToast from '../lib/useToast';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import '../styles/style.css';
import '../styles/dashboard.css';

const PRICE = { bw: 2, color: 5, a3Extra: 10, spiral: 20, express: 15 };
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
];
const LOCATIONS = [
  { id: 'main-gate', name: 'Main Gate', sub: 'Campus Gate 1 pickup', icon: <path d="M3 21V3h18v18M3 12h18M12 3v18" /> },
  { id: 'academic-block', name: 'Academic Block', sub: 'Main Academic Block', icon: <path d="M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 3L2 9h20L12 3z" /> },
  {
    id: 'hostel-gate', name: 'Hostel Gate', sub: 'Hostel entrance pickup', icon: (
      <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>
    )
  },
];
const SEED_BOOKED = {
  'main-gate|9:25 AM': 1, 'main-gate|11:05 AM': 2, 'main-gate|1:15 PM': 5, 'main-gate|2:05 PM': 0, 'main-gate|4:00 PM': 6,
  'academic-block|9:25 AM': 6, 'academic-block|11:05 AM': 1, 'academic-block|1:15 PM': 2, 'academic-block|2:05 PM': 5, 'academic-block|4:00 PM': 0,
  'hostel-gate|9:25 AM': 2, 'hostel-gate|11:05 AM': 6, 'hostel-gate|1:15 PM': 0, 'hostel-gate|2:05 PM': 1, 'hostel-gate|4:00 PM': 5,
};
const TIME_SLOTS = ['9:25 AM', '11:05 AM', '1:15 PM', '2:05 PM', '4:00 PM'];

// Campus Print only operates in India, so slot cutoffs always use IST — regardless of the
// student's device timezone. Comparing minutes-since-midnight avoids local-Date pitfalls.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function nowMinutesIST() {
  return Math.floor(((Date.now() + IST_OFFSET_MS) % 86400000) / 60000);
}
function slotMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return 0;
  let [, hourStr, minStr, meridiem] = match;
  let hour = parseInt(hourStr, 10) % 12;
  if (meridiem.toUpperCase() === 'PM') hour += 12;
  return hour * 60 + parseInt(minStr, 10);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

let fileKeySeq = 0;

export default function NewOrder() {
  const navigate = useNavigate();
  useBodyClass('app-body');
  useDocumentTitle('New Order – Print Campus');
  const { toast, showToast } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Order configuration state ──
  const [files, setFiles] = useState([]); // [{ key, file, pages, estimated }]
  const [colorOption, setColorOption] = useState('bw');
  const [paperSize, setPaperSize] = useState('A4');
  const [printingSide, setPrintingSide] = useState(null); // 'single' | 'double' — mandatory
  const [copies, setCopies] = useState(1);
  const [spiralBinding, setSpiralBinding] = useState(false);
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── Booking modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState('location'); // 'location' | 'slot' | 'review'
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [selectedLocationName, setSelectedLocationName] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/auth/status', { credentials: 'include' });
        const data = await res.json();
        if (!data.isLoggedIn) { navigate('/'); return; }
        if (cancelled) return;
        setCurrentUser(data);
        const name = (data.email || '').split('@')[0];
        setDisplayName(name.charAt(0).toUpperCase() + name.slice(1));
      } catch {
        navigate('/');
        return;
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [navigate]);

  // ── Prefill from home-page customizer (carried through login) ──
  useEffect(() => {
    try {
      const pending = JSON.parse(localStorage.getItem('cp_pending_order') || 'null');
      if (pending) {
        if (pending.color === 'bw' || pending.color === 'color') setColorOption(pending.color);
        if (pending.size === 'A4' || pending.size === 'A3') setPaperSize(pending.size);
        setSpiralBinding(!!pending.spiral);
        setExpressDelivery(!!pending.express);
        localStorage.removeItem('cp_pending_order');
      }
    } catch {
      // ignore malformed/unavailable localStorage data
    }
  }, []);

  function addFiles(newFiles) {
    const accepted = [];
    setFiles((prev) => {
      const next = [...prev];
      newFiles.forEach((file) => {
        if (next.length >= 10) { showToast('Max 10 files allowed.', 'error'); return; }
        if (!ALLOWED_TYPES.includes(file.type)) { showToast(`${file.name}: unsupported type.`, 'error'); return; }
        const entry = { key: ++fileKeySeq, file, pages: null, estimated: false };
        next.push(entry);
        accepted.push(entry);
      });
      return next;
    });
    if (accepted.length > 0) detectPagesFor(accepted);
  }

  async function detectPagesFor(newlyAdded) {
    const formData = new FormData();
    newlyAdded.forEach((entry) => formData.append('files', entry.file));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch('/api/orders/detect-pages', {
        method: 'POST', credentials: 'include', body: formData, signal: controller.signal
      });
      if (!res.ok) throw new Error('detect-pages failed');
      const data = await res.json();
      const results = data.files || [];
      setFiles((prev) => prev.map((entry) => {
        const idx = newlyAdded.findIndex((n) => n.key === entry.key);
        if (idx === -1) return entry;
        const result = results[idx];
        if (!result) return entry;
        return { ...entry, pages: result.pages, estimated: result.estimated };
      }));
    } catch {
      setFiles((prev) => prev.map((entry) =>
        newlyAdded.some((n) => n.key === entry.key) ? { ...entry, pages: 1, estimated: true } : entry
      ));
      showToast('Could not auto-detect page count for one or more files — using an estimate.', 'error');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function removeFile(key) {
    setFiles((prev) => prev.filter((f) => f.key !== key));
  }

  const totalPagesCount = files.reduce((sum, f) => sum + (f.pages || 1), 0);
  const pagesStillDetecting = files.some((f) => f.pages === null);

  function calcPrice() {
    const pages = totalPagesCount;
    const basePerPage = PRICE[colorOption];
    const base = pages * basePerPage * copies;
    const a3Extra = paperSize === 'A3' ? pages * copies * PRICE.a3Extra : 0;
    const spiral = spiralBinding ? PRICE.spiral : 0;
    const express = expressDelivery ? PRICE.express : 0;
    return { pages, base, a3Extra, spiral, express, total: base + a3Extra + spiral + express };
  }

  const p = calcPrice();
  const hasFiles = files.length > 0;

  function openBookingModal() {
    if (!hasFiles) { showToast('Please upload at least one file to continue.', 'error'); return; }
    if (pagesStillDetecting) { showToast('Still detecting page count — please wait a moment.', 'error'); return; }
    if (!printingSide) { showToast('Please choose single-sided or double-sided printing.', 'error'); return; }
    setModalOpen(true);
    goToStep('location');
  }

  function closeBookingModal() {
    setModalOpen(false);
  }

  useEffect(() => {
    if (!modalOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e) { if (e.key === 'Escape') closeBookingModal(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  function goToStep(nextStep) {
    setStep(nextStep);
    if (nextStep === 'slot') loadSlots();
  }

  async function loadSlots() {
    setSlotsLoading(true);
    let slotsData = [];
    try {
      const res = await fetch(`/api/orders/slots?location=${encodeURIComponent(selectedLocationId)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        slotsData = data.slots || [];
      }
    } catch {
      // fall through to mock data
    }
    if (!slotsData.length) {
      const nowMins = nowMinutesIST();
      slotsData = TIME_SLOTS.map((time) => {
        const booked = SEED_BOOKED[`${selectedLocationId}|${time}`] || 0;
        const isPast = slotMinutes(time) <= nowMins;
        let status = 'available';
        if (isPast) status = 'past';
        else if (booked >= 6) status = 'full';
        else if (booked >= 5) status = 'limited';
        return { time, status, booked, capacity: 6 };
      });
    }
    setSlots(slotsData);
    setSlotsLoading(false);
  }

  function buildOrderFormData() {
    const formData = new FormData();
    formData.append('colorOption', colorOption);
    formData.append('paperSize', paperSize);
    formData.append('printingSide', printingSide);
    formData.append('totalPages', p.pages);
    formData.append('copies', copies);
    formData.append('spiralBinding', spiralBinding);
    formData.append('expressDelivery', expressDelivery);
    formData.append('totalPrice', p.total);
    formData.append('collectionLocationId', selectedLocationId);
    formData.append('collectionLocation', selectedLocationName);
    formData.append('collectionTime', selectedTimeSlot);
    files.forEach((f) => formData.append('files', f.file));
    return formData;
  }

  // TEMP: while Razorpay isn't configured (no RAZORPAY_KEY_ID/SECRET in .env), the server's
  // /payment/create responds 503 and we fall back to /payment/simulate — same order/ticket
  // creation, just skipping the real gateway — so the order + ticket flow can be tried end to end.
  async function runSimulatedPayment() {
    try {
      const res = await fetch('/api/orders/payment/simulate', { method: 'POST', credentials: 'include', body: buildOrderFormData() });
      const data = await res.json();
      if (res.ok) {
        closeBookingModal();
        navigate(`/ticket?id=${data.id}`);
      } else {
        showToast(data.message || 'Failed to place order.', 'error');
        setPaying(false);
      }
    } catch {
      showToast('Connection error. Please try again.', 'error');
      setPaying(false);
    }
  }

  async function handlePay() {
    if (!selectedLocationId || !selectedTimeSlot) {
      showToast('Please select a collection location and time slot.', 'error');
      return;
    }
    if (!hasFiles) { showToast('Please upload at least one file to continue.', 'error'); return; }
    if (!printingSide) { showToast('Please choose single-sided or double-sided printing.', 'error'); return; }

    setPaying(true);

    try {
      const createRes = await fetch('/api/orders/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ totalPrice: p.total }),
      });

      if (createRes.status === 503) {
        await runSimulatedPayment();
        return;
      }

      const createData = await createRes.json();
      if (!createRes.ok) {
        showToast(createData.message || 'Could not start payment.', 'error');
        setPaying(false);
        return;
      }

      if (typeof window.Razorpay === 'undefined') {
        showToast('Payment gateway failed to load. Check your connection and retry.', 'error');
        setPaying(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: createData.keyId,
        amount: createData.amount,
        currency: createData.currency,
        order_id: createData.razorpayOrderId,
        name: 'Campus Print',
        description: 'Print order payment',
        prefill: { email: currentUser?.email || '' },
        theme: { color: '#3b82f6' },
        handler: async (response) => {
          const formData = buildOrderFormData();
          formData.append('razorpay_order_id', response.razorpay_order_id);
          formData.append('razorpay_payment_id', response.razorpay_payment_id);
          formData.append('razorpay_signature', response.razorpay_signature);

          try {
            const verifyRes = await fetch('/api/orders/payment/verify', { method: 'POST', credentials: 'include', body: formData });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              closeBookingModal();
              navigate(`/ticket?id=${verifyData.id}`);
            } else {
              showToast(verifyData.message || 'Payment succeeded but order creation failed. Contact support.', 'error');
              setPaying(false);
            }
          } catch {
            showToast('Connection error while confirming your order. Contact support with your payment ID.', 'error');
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });

      rzp.on('payment.failed', () => {
        showToast('Payment failed. Please try again.', 'error');
        setPaying(false);
      });

      setPaying(false);
      rzp.open();
    } catch {
      showToast('Connection error. Please try again.', 'error');
      setPaying(false);
    }
  }

  useEffect(() => {
    if (document.getElementById('razorpay-checkout-js')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
  }, []);

  if (loading) return null;

  const toggleClass = (active) => `toggle-option${active ? ' active' : ''}`;
  let summaryNote = '';
  if (!hasFiles) summaryNote = 'Please upload at least one file to continue.';
  else if (pagesStillDetecting) summaryNote = 'Detecting page count…';
  else if (!printingSide) summaryNote = 'Please choose single-sided or double-sided printing.';

  return (
    <>
      <div className="app-layout">
        <DashboardSidebar userName={displayName} />

        <main className="main-content">
          <a href="/dashboard" className="back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Back to Dashboard
          </a>

          <div className="content-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h1 className="page-title">Create Order</h1>
              <p className="page-subtitle">Configure your print settings and upload documents.</p>
            </div>
          </div>

          <div className="new-order-layout">
            <div className="order-steps">

              {/* Step 1: Upload */}
              <div className="step-card">
                <div className="step-header">
                  <div className="step-number">1</div>
                  <span className="step-title">Upload Documents</span>
                </div>

                <div
                  className={`upload-zone${dragOver ? ' dragover' : ''}`}
                  id="uploadZone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles([...e.dataTransfer.files]); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="fileInput"
                    multiple
                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                    onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }}
                  />
                  <div className="upload-zone-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16"></polyline>
                      <line x1="12" y1="12" x2="12" y2="21"></line>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                    </svg>
                  </div>
                  <h3>Drag &amp; drop files or click to browse</h3>
                  <p>Support for PDF, DOCX, PNG, JPG &nbsp;(Up to 10 files)</p>
                </div>

                <div className="files-list" id="filesList">
                  {files.map((f) => {
                    let pagesText;
                    if (f.pages === null) {
                      pagesText = (
                        <span className="file-pages-detecting">
                          <span className="loading-spinner" style={{ width: 12, height: 12, borderWidth: 2 }}></span> Detecting pages…
                        </span>
                      );
                    } else {
                      pagesText = `${f.pages} page${f.pages > 1 ? 's' : ''}${f.estimated ? ' (estimated)' : ''}`;
                    }
                    return (
                      <div className="file-item" key={f.key}>
                        <div className="file-item-info">
                          <span className="file-item-name">{f.file.name}</span>
                          <span className="file-item-size">{formatSize(f.file.size)} · {pagesText}</span>
                        </div>
                        <button className="file-remove" title="Remove" onClick={() => removeFile(f.key)}>✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Print Settings */}
              <div className="step-card">
                <div className="step-header">
                  <div className="step-number">2</div>
                  <span className="step-title">Print Settings</span>
                </div>

                <div className="settings-grid">
                  <div className="setting-group">
                    <span className="setting-label">Color Option</span>
                    <div className="toggle-group" id="colorGroup">
                      <button className={toggleClass(colorOption === 'bw')} onClick={() => setColorOption('bw')}>B&amp;W (₹2/pg)</button>
                      <button className={toggleClass(colorOption === 'color')} onClick={() => setColorOption('color')}>Color (₹5/pg)</button>
                    </div>
                  </div>

                  <div className="setting-group">
                    <span className="setting-label">Paper Size</span>
                    <div className="toggle-group" id="sizeGroup">
                      <button className={toggleClass(paperSize === 'A4')} onClick={() => setPaperSize('A4')}>A4</button>
                      <button className={toggleClass(paperSize === 'A3')} onClick={() => setPaperSize('A3')}>A3 (+₹10)</button>
                    </div>
                  </div>

                  <div className="setting-group">
                    <span className="setting-label">Printing Side <span style={{ color: '#ef4444' }}>*</span></span>
                    <div className="toggle-group" id="sideGroup">
                      <button className={toggleClass(printingSide === 'single')} onClick={() => setPrintingSide('single')}>Single-Sided</button>
                      <button className={toggleClass(printingSide === 'double')} onClick={() => setPrintingSide('double')}>Double-Sided</button>
                    </div>
                  </div>

                  <div className="setting-group">
                    <span className="setting-label">Number of Copies</span>
                    <div className="counter">
                      <button className="counter-btn" aria-label="Decrease copies" onClick={() => setCopies((c) => Math.max(1, c - 1))}>−</button>
                      <span className="counter-value">{copies}</span>
                      <button className="counter-btn" aria-label="Increase copies" onClick={() => setCopies((c) => Math.min(99, c + 1))}>+</button>
                    </div>
                  </div>

                  <div className="setting-group">
                    <span className="setting-label">Add-ons</span>
                    <div className="addons-list">
                      <div className={`addon-item${spiralBinding ? ' selected' : ''}`} onClick={() => setSpiralBinding((v) => !v)}>
                        <span className="addon-label">Spiral Binding (+₹20)</span>
                        <div className="addon-check">
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"></polyline></svg>
                        </div>
                      </div>
                      <div className={`addon-item${expressDelivery ? ' selected' : ''}`} onClick={() => setExpressDelivery((v) => !v)}>
                        <span className="addon-label">Express Delivery (+₹15)</span>
                        <div className="addon-check">
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"></polyline></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right: Order Summary */}
            <div className="order-summary">
              <h2 className="summary-title">Order Summary</h2>

              <div className="summary-lines">
                <div className="summary-line">
                  <span className="summary-line-label">Base Price ({p.pages} pg × {copies}x · {colorOption === 'bw' ? 'B&W' : 'Color'})</span>
                  <span className="summary-line-value">₹{p.base}</span>
                </div>
                <div className="summary-line" style={{ display: paperSize === 'A3' ? '' : 'none' }}>
                  <span className="summary-line-label">A3 Upcharge</span>
                  <span className="summary-line-value">₹{p.a3Extra}</span>
                </div>
                <div className="summary-line" style={{ display: spiralBinding ? '' : 'none' }}>
                  <span className="summary-line-label">Spiral Binding</span>
                  <span className="summary-line-value">₹20</span>
                </div>
                <div className="summary-line" style={{ display: expressDelivery ? '' : 'none' }}>
                  <span className="summary-line-label">Express Delivery</span>
                  <span className="summary-line-value">₹15</span>
                </div>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-total">
                <span className="summary-total-label">Total</span>
                <span className="summary-total-amount">₹{p.total}</span>
              </div>

              <button className="confirm-btn" disabled={!hasFiles || pagesStillDetecting || !printingSide} onClick={openBookingModal}>
                Start Order
              </button>
              <p className="summary-note">{summaryNote}</p>
            </div>
          </div>
        </main>
      </div>

      {/* Booking flow: Location → Time → Review */}
      <div className="booking-overlay" hidden={!modalOpen} onClick={(e) => { if (e.target === e.currentTarget) closeBookingModal(); }}>
        <div className="booking-panel booking-container" role="dialog" aria-modal="true" style={{ maxWidth: 920, padding: '2.5rem 2rem' }}>
          <button className="booking-close" type="button" aria-label="Close booking" onClick={closeBookingModal}>×</button>

          <div className="cp-nav-steps" role="navigation" aria-label="Booking steps">
            <button type="button" className={`cp-nav-step${step === 'location' ? ' is-active' : ''}`} onClick={() => goToStep('location')}>
              <span className="step-num">01</span><span className="step-title">Location</span>
            </button>
            <span className="step-arrow">→</span>
            <button
              type="button"
              className={`cp-nav-step${step === 'slot' ? ' is-active' : ''}${step === 'review' ? ' is-done' : ''}`}
              onClick={() => selectedLocationId && goToStep('slot')}
            >
              <span className="step-num">02</span><span className="step-title">Time Slot</span>
            </button>
            <span className="step-arrow">→</span>
            <button
              type="button"
              className={`cp-nav-step${step === 'review' ? ' is-active' : ''}`}
              onClick={() => selectedLocationId && selectedTimeSlot && goToStep('review')}
            >
              <span className="step-num">03</span><span className="step-title">Review</span>
            </button>
          </div>

          {/* Step 1: Location */}
          <section className="cp-step-view" hidden={step !== 'location'}>
            <div className="cp-view-header">
              <span className="location-tag">📍 Collection Point</span>
              <h2 className="location-title" style={{ marginTop: '0.5rem' }}>Where should we deliver your prints?</h2>
              <p className="location-subtitle">Choose your preferred collection point on campus.</p>
            </div>
            <div className="cp-cards-grid">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  className={`cp-loc-card${loc.id === selectedLocationId ? ' is-selected' : ''}`}
                  onClick={() => { setSelectedLocationId(loc.id); setSelectedLocationName(loc.name); }}
                >
                  <div className="cp-card-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{loc.icon}</svg>
                  </div>
                  <h3 className="cp-card-title">{loc.name}</h3>
                  <p className="cp-card-sub">{loc.sub}</p>
                </button>
              ))}
            </div>
            <div className="cp-step-footer">
              <button type="button" className="btn btn-primary" disabled={!selectedLocationId} onClick={() => goToStep('slot')}>
                Continue to Time Slot <span className="arrow-icon">→</span>
              </button>
            </div>
          </section>

          {/* Step 2: Time slots */}
          <section className="cp-step-view" hidden={step !== 'slot'}>
            <div className="cp-view-header">
              <span className="location-tag">🕒 Pickup Schedule</span>
              <h2 className="location-title" style={{ marginTop: '0.5rem' }}>Choose your collection time</h2>
              <p className="location-subtitle">Pickup at <strong style={{ color: 'var(--primary-blue-hover, #2563eb)' }}>{selectedLocationName || '—'}</strong>. Select a convenient slot.</p>
            </div>
            <div className="cp-slots-grid">
              {slotsLoading ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                  <span className="loading-spinner" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: 'var(--primary)' }}></span>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Loading available time slots...</p>
                </div>
              ) : slots.map((s) => {
                const isPast = s.status === 'past';
                const isFull = s.status === 'full';
                const isLimited = s.status === 'limited';
                const isDisabled = isPast || isFull;
                const isSelected = selectedTimeSlot === s.time;
                let statusLabel = 'Available';
                if (isPast) statusLabel = 'Unavailable';
                else if (isFull) statusLabel = 'Fully Booked';
                else if (isLimited) statusLabel = 'Limited';
                let classes = 'cp-slot-pill';
                if (isPast) classes += ' is-past';
                else if (isFull) classes += ' is-full';
                else if (isLimited) classes += ' is-limited';
                else classes += ' is-available';
                if (isSelected) classes += ' is-selected';
                return (
                  <button key={s.time} type="button" className={classes} disabled={isDisabled} onClick={() => setSelectedTimeSlot(s.time)}>
                    <span className="cp-slot-time-text">{s.time}</span>
                    <span className="cp-slot-tag">{statusLabel}</span>
                  </button>
                );
              })}
            </div>
            <div className="cp-step-footer space-between">
              <button type="button" className="btn btn-secondary" onClick={() => goToStep('location')}>← Back to Location</button>
              <button type="button" className="btn btn-primary" disabled={!selectedTimeSlot} onClick={() => goToStep('review')}>
                Continue to Review <span className="arrow-icon">→</span>
              </button>
            </div>
          </section>

          {/* Step 3: Review */}
          <section className="cp-step-view" hidden={step !== 'review'}>
            <div className="cp-view-header">
              <span className="location-tag">✨ Confirm Details</span>
              <h2 className="location-title" style={{ marginTop: '0.5rem' }}>Review your booking</h2>
              <p className="location-subtitle">Confirm pickup details before proceeding to payment.</p>
            </div>

            <div className="cp-review-container">
              <div className="cp-review-box">
                <h3 className="cp-review-heading">Collection Details</h3>
                <div className="cp-review-row">
                  <div>
                    <span className="cp-review-label">Collection Location</span>
                    <strong className="cp-review-val">{selectedLocationName || '—'}</strong>
                  </div>
                  <button type="button" className="cp-inline-edit" onClick={() => goToStep('location')}>Edit Location</button>
                </div>
                <div className="cp-review-row">
                  <div>
                    <span className="cp-review-label">Collection Time</span>
                    <strong className="cp-review-val">{selectedTimeSlot || '—'}</strong>
                  </div>
                  <button type="button" className="cp-inline-edit" onClick={() => goToStep('slot')}>Edit Time</button>
                </div>
              </div>

              <div className="cp-review-box">
                <h3 className="cp-review-heading">Order Summary</h3>
                <div className="cp-review-details-list">
                  <div className="cp-review-line">
                    <span>Documents ({files.length} file{files.length > 1 ? 's' : ''} · {p.pages} pg)</span>
                    <strong>{files.map((f) => f.file.name).join(', ')}</strong>
                  </div>
                  <div className="cp-review-line">
                    <span>Print Mode</span>
                    <strong>{colorOption === 'bw' ? 'B&W (₹2/pg)' : 'Color (₹5/pg)'}</strong>
                  </div>
                  <div className="cp-review-line">
                    <span>Paper &amp; Copies</span>
                    <strong>{paperSize === 'A3' ? 'A3 (+₹10)' : 'A4'} · {copies} Copy{copies > 1 ? 'ies' : ''}</strong>
                  </div>
                  <div className="cp-review-line">
                    <span>Printing Side</span>
                    <strong>{printingSide === 'double' ? 'Double-Sided' : 'Single-Sided'}</strong>
                  </div>
                  {spiralBinding && (
                    <div className="cp-review-line"><span>Add-on</span><strong>Spiral Binding (+₹20)</strong></div>
                  )}
                  {expressDelivery && (
                    <div className="cp-review-line"><span>Add-on</span><strong>Express Delivery (+₹15)</strong></div>
                  )}
                </div>
                <div className="cp-review-total">
                  <span>Total Amount</span>
                  <strong>₹{p.total}</strong>
                </div>
              </div>
            </div>

            <div className="cp-step-footer space-between" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => goToStep('slot')}>← Back to Time Slot</button>
              <button type="button" className="btn btn-primary" disabled={paying} onClick={handlePay}>
                {paying ? (
                  <><span className="loading-spinner"></span>&nbsp; Processing…</>
                ) : (
                  <>Proceed to Payment <span className="arrow-icon">→</span></>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}
