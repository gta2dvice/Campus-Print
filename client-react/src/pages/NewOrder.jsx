import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import Toast from '../components/Toast';
import '../styles/dashboard-effects.css';

const PRICE = { bw: 2, color: 5, a3Extra: 10, spiral: 20, express: 15 };
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
];

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function NewOrder() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [colorOption, setColorOption] = useState('bw');
  const [paperSize, setPaperSize] = useState('A4');
  const [copies, setCopies] = useState(1);
  const [spiralBinding, setSpiralBinding] = useState(false);
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/auth/status', { credentials: 'include' });
        const data = await res.json();
        if (!data.isLoggedIn) { navigate('/'); return; }
        if (cancelled) return;
        const name = (data.email || '').split('@')[0];
        setDisplayName(name.charAt(0).toUpperCase() + name.slice(1));
      } catch {
        navigate('/');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [navigate]);

  function showToast(message, type = 'success') {
    clearTimeout(toastTimer.current);
    setToast({ message, type, show: true });
    toastTimer.current = setTimeout(() => setToast((t) => t && { ...t, show: false }), 3500);
  }

  function addFiles(newFiles) {
    setFiles((prev) => {
      const next = [...prev];
      newFiles.forEach((f) => {
        if (next.length >= 10) { showToast('Max 10 files allowed.', 'error'); return; }
        if (!ALLOWED_TYPES.includes(f.type)) { showToast(`${f.name}: unsupported type.`, 'error'); return; }
        next.push(f);
      });
      return next;
    });
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const basePerCopy = PRICE[colorOption];
  const base = basePerCopy * copies;
  const a3Extra = paperSize === 'A3' ? PRICE.a3Extra * copies : 0;
  const spiral = spiralBinding ? PRICE.spiral : 0;
  const express = expressDelivery ? PRICE.express : 0;
  const total = base + a3Extra + spiral + express;
  const hasFiles = files.length > 0;

  async function handleConfirm() {
    if (!hasFiles) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append('colorOption', colorOption);
    formData.append('paperSize', paperSize);
    formData.append('copies', copies);
    formData.append('spiralBinding', spiralBinding);
    formData.append('expressDelivery', expressDelivery);
    formData.append('totalPrice', total);
    files.forEach((f) => formData.append('files', f));

    try {
      const res = await fetch('/api/orders', { method: 'POST', credentials: 'include', body: formData });
      if (res.ok) {
        showToast('Order placed successfully! 🎉', 'success');
        setTimeout(() => navigate('/dashboard'), 1800);
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to place order.', 'error');
        setSubmitting(false);
      }
    } catch {
      showToast('Connection error. Please try again.', 'error');
      setSubmitting(false);
    }
  }

  if (loading) return null;

  const toggleClass = (active) =>
    `flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[0.82rem] font-medium transition ${
      active ? 'bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)]' : 'bg-transparent text-gray-600'
    }`;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f3f7fb_0%,#eaf1f7_100%)]">
      <div className="flex min-h-screen">
        <DashboardSidebar userName={displayName} />

        <main className="ml-[240px] h-screen flex-1 overflow-y-auto p-10 max-md:ml-0 max-md:p-6">
          <a href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 no-underline transition hover:text-blue-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Back to Dashboard
          </a>

          <div className="mb-6">
            <h1 className="mb-1 text-[1.875rem] font-bold tracking-tight text-gray-900">Create Order</h1>
            <p className="text-[0.925rem] text-gray-600">Configure your print settings and upload documents.</p>
          </div>

          <div className="grid grid-cols-[1fr_300px] items-start gap-6 max-lg:grid-cols-1">
            <div className="order-steps flex max-h-[calc(100vh-220px)] flex-col gap-5 overflow-y-auto pr-2">

              {/* Step 1: Upload */}
              <div className="rounded-2xl border border-gray-300/50 bg-white/85 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] backdrop-blur-md">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-xs font-bold text-white shadow-[0_2px_6px_rgba(59,130,246,0.3)]">1</div>
                  <span className="text-base font-semibold text-gray-900">Upload Documents</span>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles([...e.dataTransfer.files]); }}
                  className={`flex h-[300px] cursor-pointer flex-col justify-between rounded-[14px] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition ${dragOver ? '-translate-y-0.5 bg-blue-500/[0.08]' : 'bg-blue-500/[0.04] hover:bg-blue-500/[0.08]'}`}
                >
                  <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-500">
                    <svg viewBox="0 0 24 24" fill="none" width="80" height="80">
                      <path d="M7 10V9C7 6.23 9.23 4 12 4C14.76 4 17 6.23 17 9V10M12 12V21M12 12L15 15M12 12L9 15" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3 className="mt-2.5 text-base font-semibold">Browse File to upload!</h3>
                  </div>
                  <p className="text-center text-[0.8rem] text-gray-400">
                    {files.length === 0 ? 'Not selected file' : `${files.length} file${files.length > 1 ? 's' : ''} selected`}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                    onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }}
                  />
                </div>

                {files.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2">
                    {files.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="animate-slide-in flex items-center justify-between rounded-[10px] bg-white px-4 py-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.06)]">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">{f.name}</span>
                          <span className="text-xs text-gray-400">{formatSize(f.size)}</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-base text-gray-500 transition hover:text-red-500" title="Remove">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Print Settings */}
              <div className="rounded-2xl border border-gray-300/50 bg-white/85 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] backdrop-blur-md">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-xs font-bold text-white shadow-[0_2px_6px_rgba(59,130,246,0.3)]">2</div>
                  <span className="text-base font-semibold text-gray-900">Print Settings</span>
                </div>

                <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[0.85rem] font-semibold text-gray-600">Color Option</span>
                    <div className="flex gap-0.5 rounded-full border border-gray-200 bg-white/70 p-[3px]">
                      <button className={toggleClass(colorOption === 'bw')} onClick={() => setColorOption('bw')}>B&amp;W (₹2/pg)</button>
                      <button className={toggleClass(colorOption === 'color')} onClick={() => setColorOption('color')}>Color (₹5/pg)</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[0.85rem] font-semibold text-gray-600">Paper Size</span>
                    <div className="flex gap-0.5 rounded-full border border-gray-200 bg-white/70 p-[3px]">
                      <button className={toggleClass(paperSize === 'A4')} onClick={() => setPaperSize('A4')}>A4</button>
                      <button className={toggleClass(paperSize === 'A3')} onClick={() => setPaperSize('A3')}>A3 (+₹10)</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[0.85rem] font-semibold text-gray-600">Number of Copies</span>
                    <div className="inline-flex w-fit items-center overflow-hidden rounded-full border border-gray-200 bg-white/70">
                      <button
                        onClick={() => setCopies((c) => Math.max(1, c - 1))}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-lg font-semibold text-blue-500 transition hover:bg-blue-500/[0.08]"
                      >−</button>
                      <span className="min-w-[40px] text-center text-sm font-semibold text-gray-900">{copies}</span>
                      <button
                        onClick={() => setCopies((c) => Math.min(99, c + 1))}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-lg font-semibold text-blue-500 transition hover:bg-blue-500/[0.08]"
                      >+</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[0.85rem] font-semibold text-gray-600">Add-ons</span>
                    <div className="flex flex-col gap-2.5">
                      <div
                        onClick={() => setSpiralBinding((v) => !v)}
                        className={`flex cursor-pointer select-none items-center justify-between rounded-[10px] border px-4 py-2.5 transition ${spiralBinding ? 'border-blue-500 bg-blue-500/[0.08]' : 'border-gray-200 bg-white/70 hover:border-blue-500'}`}
                      >
                        <span className="text-sm font-medium text-gray-900">Spiral Binding (+₹20)</span>
                        <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] border-2 transition ${spiralBinding ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200'}`}>
                          {spiralBinding && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"></polyline></svg>
                          )}
                        </div>
                      </div>
                      <div
                        onClick={() => setExpressDelivery((v) => !v)}
                        className={`flex cursor-pointer select-none items-center justify-between rounded-[10px] border px-4 py-2.5 transition ${expressDelivery ? 'border-blue-500 bg-blue-500/[0.08]' : 'border-gray-200 bg-white/70 hover:border-blue-500'}`}
                      >
                        <span className="text-sm font-medium text-gray-900">Express Delivery (+₹15)</span>
                        <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] border-2 transition ${expressDelivery ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200'}`}>
                          {expressDelivery && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"></polyline></svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="sticky top-6 rounded-2xl border border-gray-300/50 bg-white/85 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] backdrop-blur-md max-lg:static">
              <h2 className="mb-5 border-b border-gray-200 pb-3.5 text-base font-semibold text-gray-900">Order Summary</h2>

              <div className="flex flex-col">
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-gray-600">Base Price ({copies}x · {colorOption === 'bw' ? 'B&W' : 'Color'})</span>
                  <span className="font-medium text-gray-900">₹{base}</span>
                </div>
                {paperSize === 'A3' && (
                  <div className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-gray-600">A3 Upcharge</span>
                    <span className="font-medium text-gray-900">₹{a3Extra}</span>
                  </div>
                )}
                {spiralBinding && (
                  <div className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-gray-600">Spiral Binding</span>
                    <span className="font-medium text-gray-900">₹20</span>
                  </div>
                )}
                {expressDelivery && (
                  <div className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-gray-600">Express Delivery</span>
                    <span className="font-medium text-gray-900">₹15</span>
                  </div>
                )}
              </div>

              <div className="my-3 h-px bg-gray-200" />

              <div className="flex items-center justify-between py-2">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-[1.6rem] font-bold tracking-tight text-blue-500">₹{total}</span>
              </div>

              <button
                onClick={handleConfirm}
                disabled={!hasFiles || submitting}
                className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-blue-500 px-6 py-3.5 text-[0.95rem] font-semibold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition hover:enabled:-translate-y-px hover:enabled:bg-blue-600 hover:enabled:shadow-[0_6px_16px_rgba(59,130,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Placing Order…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    Confirm &amp; Pay
                  </>
                )}
              </button>
              <p className="mt-2.5 min-h-[1rem] text-center text-xs text-red-500">
                {hasFiles ? '' : 'Please upload at least one file to continue.'}
              </p>
            </div>
          </div>
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
