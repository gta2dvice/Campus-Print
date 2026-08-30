import { useState } from 'react';
import PageBackground from '../components/PageBackground';
import Toast from '../components/Toast';
import useToast from '../lib/useToast';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import '../styles/style.css';
import '../styles/dashboard.css';

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

const ORDER_SUMMARY = [
  { label: 'Uploaded Documents', value: 'Assignment_Final.pdf, Lab_Report.docx' },
  { label: 'Print Option', value: 'B&W (₹2 / page)' },
  { label: 'Paper & Copies', value: 'A4 · 1 Copy (10 pages)' },
];

export default function SelectLocation() {
  useBodyClass('booking-flow-body');
  useDocumentTitle('Select Location & Time Slot – Print Campus');
  const { toast, showToast } = useToast();

  const [step, setStep] = useState('location');
  const [locationId, setLocationId] = useState(null);
  const [locationName, setLocationName] = useState(null);
  const [timeSlot, setTimeSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  async function goToStep(nextStep) {
    setStep(nextStep);
    if (nextStep === 'slot') {
      setSlotsLoading(true);
      let slotsData = [];
      try {
        const res = await fetch(`/api/orders/slots?location=${encodeURIComponent(locationId)}`);
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
          const booked = SEED_BOOKED[`${locationId}|${time}`] || 0;
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
  }

  function handlePay() {
    setPaying(true);
    setTimeout(() => {
      showToast('Order confirmed! Booking simulation successful. 🎉', 'success');
      setPaying(false);
    }, 1200);
  }

  return (
    <div className="page-content">
      <PageBackground />
      <main className="booking-container reveal-wrapper" style={{ maxWidth: 1000, margin: '3rem auto', minHeight: 'calc(100vh - 6rem)' }}>
        <div className="booking-orb booking-orb-1"></div>
        <div className="booking-orb booking-orb-2"></div>

        <div className="booking-inner-content">

          <div className="cp-nav-steps" role="navigation" aria-label="Booking steps">
            <button type="button" className={`cp-nav-step${step === 'location' ? ' is-active' : ''}`} onClick={() => goToStep('location')}>
              <span className="step-num">01</span><span className="step-title">Location</span>
            </button>
            <span className="step-arrow">→</span>
            <button
              type="button"
              className={`cp-nav-step${step === 'slot' ? ' is-active' : ''}${step === 'review' ? ' is-done' : ''}`}
              onClick={() => locationId && goToStep('slot')}
            >
              <span className="step-num">02</span><span className="step-title">Time Slot</span>
            </button>
            <span className="step-arrow">→</span>
            <button
              type="button"
              className={`cp-nav-step${step === 'review' ? ' is-active' : ''}`}
              onClick={() => locationId && timeSlot && goToStep('review')}
            >
              <span className="step-num">03</span><span className="step-title">Review</span>
            </button>
          </div>

          {step === 'location' && (
            <section className="cp-step-view">
              <div className="cp-view-header">
                <span className="location-tag">📍 Collection Point</span>
                <h1 className="location-title" style={{ marginTop: '0.5rem' }}>Where should we deliver your prints?</h1>
                <p className="location-subtitle">Choose your preferred collection point on campus.</p>
              </div>

              <div className="cp-cards-grid">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    className={`cp-loc-card${loc.id === locationId ? ' is-selected' : ''}`}
                    onClick={() => { setLocationId(loc.id); setLocationName(loc.name); }}
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
                <button type="button" className="btn btn-primary" disabled={!locationId} onClick={() => goToStep('slot')}>
                  Continue to Time Slot <span className="arrow-icon">→</span>
                </button>
              </div>
            </section>
          )}

          {step === 'slot' && (
            <section className="cp-step-view">
              <div className="cp-view-header">
                <span className="location-tag">🕒 Pickup Schedule</span>
                <h1 className="location-title" style={{ marginTop: '0.5rem' }}>Choose your collection time</h1>
                <p className="location-subtitle">
                  Select a convenient time to collect your prints at <strong style={{ color: 'var(--primary-blue-hover, #2563eb)' }}>{locationName || '—'}</strong>.
                </p>
              </div>

              {slotsLoading ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading slots…</p>
              ) : (
                <div className="cp-slots-grid">
                  {slots.map((s) => {
                    const isPast = s.status === 'past';
                    const isFull = s.status === 'full';
                    const isLimited = s.status === 'limited';
                    const isDisabled = isPast || isFull;
                    const isSelected = timeSlot === s.time;
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
                      <button key={s.time} type="button" className={classes} disabled={isDisabled} onClick={() => setTimeSlot(s.time)}>
                        <span className="cp-slot-time-text">{s.time}</span>
                        <span className="cp-slot-tag">{statusLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="cp-step-footer space-between">
                <button type="button" className="btn btn-secondary" onClick={() => goToStep('location')}>← Back to Location</button>
                <button type="button" className="btn btn-primary" disabled={!timeSlot} onClick={() => goToStep('review')}>
                  Continue to Review <span className="arrow-icon">→</span>
                </button>
              </div>
            </section>
          )}

          {step === 'review' && (
            <section className="cp-step-view">
              <div className="cp-view-header">
                <span className="location-tag">✨ Confirm Details</span>
                <h1 className="location-title" style={{ marginTop: '0.5rem' }}>Review your booking</h1>
                <p className="location-subtitle">Confirm pickup details before proceeding to payment.</p>
              </div>

              <div className="cp-review-container">
                <div className="cp-review-box">
                  <h3 className="cp-review-heading">Collection Details</h3>
                  <div className="cp-review-row">
                    <div>
                      <span className="cp-review-label">Collection Location</span>
                      <strong className="cp-review-val">{locationName || '—'}</strong>
                    </div>
                    <button type="button" className="cp-inline-edit" onClick={() => goToStep('location')}>Edit Location</button>
                  </div>
                  <div className="cp-review-row">
                    <div>
                      <span className="cp-review-label">Collection Time</span>
                      <strong className="cp-review-val">{timeSlot || '—'}</strong>
                    </div>
                    <button type="button" className="cp-inline-edit" onClick={() => goToStep('slot')}>Edit Time</button>
                  </div>
                </div>

                <div className="cp-review-box">
                  <h3 className="cp-review-heading">Order Summary</h3>
                  <div className="cp-review-details-list">
                    {ORDER_SUMMARY.map((line) => (
                      <div className="cp-review-line" key={line.label}><span>{line.label}</span><strong>{line.value}</strong></div>
                    ))}
                  </div>
                  <div className="cp-review-total">
                    <span>Total Amount</span>
                    <strong>₹40</strong>
                  </div>
                </div>
              </div>

              <div className="cp-step-footer space-between" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => goToStep('slot')}>← Back to Time Slot</button>
                <button type="button" className="btn btn-primary" disabled={paying} onClick={handlePay}>
                  {paying ? (
                    <><span className="loading-spinner"></span>&nbsp; Processing Payment…</>
                  ) : (
                    <>Proceed to Payment <span className="arrow-icon">→</span></>
                  )}
                </button>
              </div>
            </section>
          )}

        </div>
      </main>

      <Toast toast={toast} />
    </div>
  );
}
