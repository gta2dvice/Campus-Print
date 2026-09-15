import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import useToast from '../lib/useToast';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import '../styles/style.css';
import '../styles/dashboard.css';

const ALLOWED_TYPES = [
  'application/pdf',
];
<<<<<<< HEAD
const LOCATIONS = [
  { id: 'main-gate', name: 'Main Gate', sub: 'Campus Gate 1 pickup', icon: <path d="M3 21V3h18v18M3 12h18M12 3v18" /> },
  { id: 'red-canteen', name: 'Red Canteen', sub: 'Red Canteen pickup', icon: <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" /> },
  {
    id: 'hostel-gate', name: 'Hostel Gate', sub: 'Hostel entrance pickup', icon: (
      <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>
    )
  },
];
const OFFERED_BY_TIME = {
  '9:25 AM': ['red-canteen'],
  '11:15 AM': ['red-canteen'],
  '1:15 PM': ['red-canteen', 'hostel-gate'],
  '2:05 PM': ['main-gate', 'red-canteen', 'hostel-gate'],
  '4:00 PM': ['main-gate', 'red-canteen', 'hostel-gate'],
};
const TIME_SLOTS = ['9:25 AM', '11:15 AM', '1:15 PM', '2:05 PM', '4:00 PM'];
const SLOT_CUTOFF_MINUTES = 5;
const LIVE_SLOT_AVAILABILITY = false;
=======
>>>>>>> 32df33e (upload sys)

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

function isSlotPast(time) {
  if (!LIVE_SLOT_AVAILABILITY) return false;
  return nowMinutesIST() >= slotMinutes(time) - SLOT_CUTOFF_MINUTES;
}

function isLocationOffered(locationId, time) {
  return (OFFERED_BY_TIME[time] || []).includes(locationId);
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
  const [config, setConfig] = useState(null);

  // ── Order configuration state ──
  const [files, setFiles] = useState([]); // [{ key, file, pages, estimated, copies }]
  const [colorOption, setColorOption] = useState('bw');
  const [paperSize, setPaperSize] = useState('A4');
  const [printingSide, setPrintingSide] = useState('single'); // 'single' | 'double' — mandatory
  const [spiralBinding, setSpiralBinding] = useState(false);
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── Booking modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState('slot'); // 'slot' | 'location' | 'review'
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [selectedLocationName, setSelectedLocationName] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [locationStatuses, setLocationStatuses] = useState([]);
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

        const configRes = await fetch('/api/orders/config', { credentials: 'include' });
        if (configRes.ok) setConfig(await configRes.json());
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
    newFiles.forEach((file) => {
      if (files.length + accepted.length >= 10) {
        showToast('Max 10 files allowed.', 'error');
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        showToast(`${file.name}: unsupported type.`, 'error');
        return;
      }
      accepted.push({ key: ++fileKeySeq, file, pages: null, estimated: false, copies: 1 });
    });
    if (accepted.length === 0) return;
    setFiles((prev) => [...prev, ...accepted]);
    detectPagesFor(accepted);
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
      const results = data.files;
      const resultsComplete = Array.isArray(results)
        && results.length === newlyAdded.length
        && results.every((result) => result && typeof result.pages === 'number' && result.pages >= 1);
      if (!resultsComplete) throw new Error('incomplete detect-pages results');
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
      showToast('Could not auto-detect page count for one or more files — using an estimate.', 'error');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function removeFile(key) {
    setFiles((prev) => prev.filter((f) => f.key !== key));
  }

  function updateFileCopies(key, delta) {
    setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, copies: Math.max(1, f.copies + delta) } : f)));
  }

  function clearAllFiles() {
    setFiles([]);
  }

  const totalPagesCount = files.reduce((sum, f) => sum + ((f.pages || 1) * f.copies), 0);
  const pagesStillDetecting = files.some((f) => f.pages === null);

  function calcPrice() {
    if (!config) return { pages: 0, base: 0, a3Extra: 0, serviceCharge: 0, deliveryCharge: 0, total: 0 };
    const pages = totalPagesCount;
    const basePerPage = config.pricing[colorOption];
    const base = pages * basePerPage;
    const a3Extra = paperSize === 'A3' ? pages * config.pricing.a3Extra : 0;
    const serviceCharge = config.pricing.serviceCharge;
    const deliveryCharge = config.pricing.deliveryCharge;
    return { pages, base, a3Extra, serviceCharge, deliveryCharge, total: base + a3Extra + serviceCharge + deliveryCharge };
  }

  const p = calcPrice();
  const hasFiles = files.length > 0;

  function openBookingModal() {
    if (!hasFiles) { showToast('Please upload at least one file to continue.', 'error'); return; }
    if (pagesStillDetecting) { showToast('Still detecting page count — please wait a moment.', 'error'); return; }
    setModalOpen(true);
    goToStep('slot');
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
    if (nextStep === 'slot') loadTimeSlots();
    if (nextStep === 'location') loadLocationOptions();
  }

  function selectTimeSlot(time) {
    setSelectedTimeSlot(time);
    if (selectedLocationId && !isLocationOffered(selectedLocationId, time)) {
      setSelectedLocationId(null);
      setSelectedLocationName(null);
    }
  }

  async function loadTimeSlots() {
    setSlotsLoading(true);
    try {
      const res = await fetch('/api/orders/slots', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      } else {
        showToast('Could not load available slots.', 'error');
        setSlots([]);
      }
    } catch {
<<<<<<< HEAD
      // fall through to local cutoff
    }
    if (!slotsData.length) {
      slotsData = TIME_SLOTS.map((time) => ({
        time,
        status: isSlotPast(time) ? 'past' : 'available',
      }));
    }
    setSlots(slotsData);
=======
      showToast('Connection error while loading slots.', 'error');
      setSlots([]);
    }
>>>>>>> 32df33e (upload sys)
    setSlotsLoading(false);
  }

  async function loadLocationOptions() {
    if (!selectedTimeSlot) {
      setLocationStatuses(LOCATIONS.map((loc) => ({ id: loc.id, status: 'unavailable' })));
      return;
    }
    setSlotsLoading(true);
    let locationsData = [];
    try {
      const res = await fetch(`/api/orders/slots?time=${encodeURIComponent(selectedTimeSlot)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        locationsData = data.locations || [];
      }
    } catch {
      // fall through
    }
    if (!locationsData.length) {
      const past = isSlotPast(selectedTimeSlot);
      locationsData = LOCATIONS.map((loc) => {
        const offered = isLocationOffered(loc.id, selectedTimeSlot);
        if (!offered) return { id: loc.id, status: 'unavailable' };
        if (past) return { id: loc.id, status: 'past' };
        return { id: loc.id, status: 'available' };
      });
    }
    setLocationStatuses(locationsData);
    setSlotsLoading(false);
  }

  function buildOrderFormData() {
    const formData = new FormData();
    formData.append('colorOption', colorOption);
    formData.append('paperSize', paperSize);
    formData.append('printingSide', printingSide);
    formData.append('totalPages', p.pages);
    const totalCopies = files.reduce((sum, f) => sum + f.copies, 0);
    formData.append('copies', totalCopies);
    formData.append('spiralBinding', 'false');
    formData.append('expressDelivery', 'false');
    formData.append('totalPrice', p.total);
    formData.append('collectionLocationId', selectedLocationId);
    formData.append('collectionLocation', selectedLocationName);
    formData.append('collectionTime', selectedTimeSlot);
    files.forEach((f) => formData.append('files', f.file));
    return formData;
  }

  // If Cashfree is not configured, /payment/create returns 503 and we fall back to /payment/simulate.
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

  async function confirmPaidOrder(cashfreeOrderId) {
    const formData = buildOrderFormData();
    formData.append('cashfree_order_id', cashfreeOrderId);
    const verifyRes = await fetch('/api/orders/payment/verify', { method: 'POST', credentials: 'include', body: formData });
    const verifyData = await verifyRes.json();
    if (verifyRes.ok) {
      closeBookingModal();
      navigate(`/ticket?id=${verifyData.id}`);
      return;
    }
    showToast(verifyData.message || 'Payment could not be confirmed. If money was deducted, contact support.', 'error');
    setPaying(false);
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

      const started = Date.now();
      while (typeof window.Cashfree !== 'function' && Date.now() - started < 8000) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      if (typeof window.Cashfree !== 'function') {
        showToast('Payment gateway failed to load. Check your connection and retry.', 'error');
        setPaying(false);
        return;
      }

      const cashfreeCheckout = window.Cashfree({
        mode: createData.mode === 'production' ? 'production' : 'sandbox',
      });

      await cashfreeCheckout.checkout({
        paymentSessionId: createData.paymentSessionId,
        redirectTarget: '_modal',
      });

      await confirmPaidOrder(createData.cashfreeOrderId);
    } catch {
      showToast('Connection error. Please try again.', 'error');
      setPaying(false);
    }
  }

  useEffect(() => {
    if (document.getElementById('cashfree-checkout-js')) return;
    const script = document.createElement('script');
    script.id = 'cashfree-checkout-js';
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
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
                  {files.length === 0 ? (
                    <div className="empty-files-state" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      <p>No files uploaded yet</p>
                      <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Upload your PDF files to start your print order.</p>
                      <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        + Upload PDFs
                      </button>
                    </div>
                  ) : (
                    <>
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
                          <div className="file-item" key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid #eee', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                              <div className="file-icon" style={{ fontSize: '1.5rem' }}>📄</div>
                              <div className="file-item-info">
                                <div className="file-item-name" style={{ fontWeight: '600' }}>{f.file.name}</div>
                                <div className="file-item-size" style={{ fontSize: '0.8rem', color: '#666' }}>{formatSize(f.file.size)} · {pagesText}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div className="counter" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button className="counter-btn" onClick={() => updateFileCopies(f.key, -1)}>−</button>
                                <span className="counter-value" style={{ minWidth: '1.5rem', textAlign: 'center' }}>{f.copies}</span>
                                <button className="counter-btn" onClick={() => updateFileCopies(f.key, 1)}>+</button>
                              </div>
                              <button className="file-remove" title="Remove" onClick={() => removeFile(f.key)}>✕</button>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                        <button className="btn btn-link" onClick={clearAllFiles} style={{ fontSize: '0.85rem', color: '#ef4444', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Clear All Files
                        </button>
                      </div>
                    </>
                  )}
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
                      <button className={toggleClass(printingSide === 'single')} onClick={() => setPrintingSide('single')}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>Single-Sided</span>
                          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Print on one side</span>
                        </div>
                      </button>
                      <button className={toggleClass(printingSide === 'double')} onClick={() => setPrintingSide('double')}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>Double-Sided</span>
                          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Print on both sides</span>
                        </div>
                      </button>
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
                  <span className="summary-line-label">Printing Charges ({p.pages} pages)</span>
                  <span className="summary-line-value">₹{p.base + p.a3Extra}</span>
                </div>
                <div className="summary-line">
                  <span className="summary-line-label">Service Charge</span>
                  <span className="summary-line-value">₹{p.serviceCharge}</span>
                </div>
                <div className="summary-line">
                  <span className="summary-line-label">Delivery Charge</span>
                  <span className="summary-line-value">₹{p.deliveryCharge}</span>
                </div>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-total">
                <span className="summary-total-label">Total</span>
                <span className="summary-total-amount">₹{p.total}</span>
              </div>

              <button className="confirm-btn" disabled={!hasFiles || pagesStillDetecting} onClick={openBookingModal}>
                Start Order
              </button>
              <p className="summary-note">{summaryNote}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Booking flow: Time → Location → Review */}
      <div className="booking-overlay" hidden={!modalOpen} onClick={(e) => { if (e.target === e.currentTarget) closeBookingModal(); }}>
        <div className="booking-panel booking-container" role="dialog" aria-modal="true" style={{ maxWidth: 920, padding: '2.5rem 2rem' }}>
          <button className="booking-close" type="button" aria-label="Close booking" onClick={closeBookingModal}>×</button>

          <div className="cp-nav-steps" role="navigation" aria-label="Booking steps">
            <button type="button" className={`cp-nav-step${step === 'slot' ? ' is-active' : ''}${step === 'location' || step === 'review' ? ' is-done' : ''}`} onClick={() => goToStep('slot')}>
              <span className="step-num">01</span><span className="step-title">Time Slot</span>
            </button>
            <span className="step-arrow">→</span>
            <button
              type="button"
              className={`cp-nav-step${step === 'location' ? ' is-active' : ''}${step === 'review' ? ' is-done' : ''}`}
              onClick={() => selectedTimeSlot && goToStep('location')}
            >
              <span className="step-num">02</span><span className="step-title">Location</span>
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

<<<<<<< HEAD
          {/* Step 1: Time slots */}
=======
          {/* Step 1: Location */}
          <section className="cp-step-view" hidden={step !== 'location'}>
            <div className="cp-view-header">
              <span className="location-tag">📍 Collection Point</span>
              <h2 className="location-title" style={{ marginTop: '0.5rem' }}>Where should we deliver your prints?</h2>
              <p className="location-subtitle">Choose your preferred collection point on campus.</p>
            </div>
            <div className="cp-cards-grid">
              {config?.locations?.map((loc) => {
                const icons = {
                  'main-gate': <path d="M3 21V3h18v18M3 12h18M12 3v18" />,
                  'academic-block': <path d="M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 3L2 9h20L12 3z" />,
                  'hostel-gate': (
                    <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>
                  ),
                };
                return (
                  <button
                    key={loc.id}
                    type="button"
                    className={`cp-loc-card${loc.id === selectedLocationId ? ' is-selected' : ''}`}
                    onClick={() => { setSelectedLocationId(loc.id); setSelectedLocationName(loc.name); }}
                  >
                    <div className="cp-card-icon">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[loc.id] || <circle cx="12" cy="12" r="10" />}</svg>
                    </div>
                    <h3 className="cp-card-title">{loc.name}</h3>
                    <p className="cp-card-sub">{loc.hint}</p>
                  </button>
                );
              }) || <p style={{ textAlign: 'center', width: '100%' }}>Loading locations...</p>}
            </div>
            <div className="cp-step-footer">
              <button type="button" className="btn btn-primary" disabled={!selectedLocationId} onClick={() => goToStep('slot')}>
                Continue to Time Slot <span className="arrow-icon">→</span>
              </button>
            </div>
          </section>

          {/* Step 2: Time slots */}
>>>>>>> 32df33e (upload sys)
          <section className="cp-step-view" hidden={step !== 'slot'}>
            <div className="cp-view-header">
              <span className="location-tag">🕒 Pickup Schedule</span>
              <h2 className="location-title" style={{ marginTop: '0.5rem' }}>Choose your collection time</h2>
              <p className="location-subtitle">Select a time first. Pickup points for that slot are shown next.</p>
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
                  <button key={s.time} type="button" className={classes} disabled={isDisabled} onClick={() => selectTimeSlot(s.time)}>
                    <span className="cp-slot-time-text">{s.time}</span>
                    <span className="cp-slot-tag">{statusLabel}</span>
                  </button>
                );
              })}
            </div>
            <div className="cp-step-footer">
              <button type="button" className="btn btn-primary" disabled={!selectedTimeSlot} onClick={() => goToStep('location')}>
                Continue to Location <span className="arrow-icon">→</span>
              </button>
            </div>
          </section>

          {/* Step 2: Location */}
          <section className="cp-step-view" hidden={step !== 'location'}>
            <div className="cp-view-header">
              <span className="location-tag">📍 Collection Point</span>
              <h2 className="location-title" style={{ marginTop: '0.5rem' }}>Where should we deliver your prints?</h2>
              <p className="location-subtitle">Pickup at <strong style={{ color: 'var(--primary-blue-hover, #2563eb)' }}>{selectedTimeSlot || '—'}</strong>. Points not served at this time are unavailable.</p>
            </div>
            <div className="cp-cards-grid">
              {slotsLoading ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                  <span className="loading-spinner" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: 'var(--primary)' }}></span>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Loading collection points...</p>
                </div>
              ) : LOCATIONS.map((loc) => {
                const locStatus = locationStatuses.find((l) => l.id === loc.id);
                const status = locStatus?.status || 'unavailable';
                const isUnavailable = status === 'unavailable' || status === 'past';
                const isFull = status === 'full';
                const isLimited = status === 'limited';
                const isDisabled = isUnavailable || isFull;
                let statusLabel = 'Available';
                if (isUnavailable) statusLabel = 'Unavailable';
                else if (isFull) statusLabel = 'Fully Booked';
                else if (isLimited) statusLabel = 'Limited';
                let classes = 'cp-loc-card';
                if (loc.id === selectedLocationId && !isDisabled) classes += ' is-selected';
                if (isDisabled) classes += ' is-unavailable';
                return (
                  <button
                    key={loc.id}
                    type="button"
                    className={classes}
                    disabled={isDisabled}
                    onClick={() => { setSelectedLocationId(loc.id); setSelectedLocationName(loc.name); }}
                  >
                    <div className="cp-card-icon">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{loc.icon}</svg>
                    </div>
                    <h3 className="cp-card-title">{loc.name}</h3>
                    <p className="cp-card-sub">{loc.sub}</p>
                    <span className="cp-loc-status-tag">{statusLabel}</span>
                  </button>
                );
              })}
            </div>
            <div className="cp-step-footer space-between">
              <button type="button" className="btn btn-secondary" onClick={() => goToStep('slot')}>← Back to Time Slot</button>
              <button type="button" className="btn btn-primary" disabled={!selectedLocationId} onClick={() => goToStep('review')}>
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
                    <span>Documents ({files.length} file{files.length > 1 ? 's' : ''} · {p.pages} total pages)</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {files.map(f => (
                        <span key={f.key} style={{ fontSize: '0.8rem' }}>{f.file.name}: {f.copies}x</span>
                      ))}
                    </div>
                  </div>
                  <div className="cp-review-line">
                    <span>Print Mode</span>
                    <strong>{colorOption === 'bw' ? `B&W (₹${config?.pricing?.bw}/pg)` : `Color (₹${config?.pricing?.color}/pg)`}</strong>
                  </div>
                  <div className="cp-review-line">
                    <span>Paper &amp; Side</span>
                    <strong>{paperSize === 'A3' ? `A3 (+₹${config?.pricing?.a3Extra})` : 'A4'} · {printingSide === 'double' ? 'Double-Sided' : 'Single-Sided'}</strong>
                  </div>
                </div>
                <div className="cp-review-total">
                  <span>Total Amount</span>
                  <strong>₹{p.total}</strong>
                </div>
              </div>
            </div>

            <div className="cp-step-footer space-between" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => goToStep('location')}>← Back to Location</button>
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
