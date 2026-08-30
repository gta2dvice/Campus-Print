document.addEventListener('DOMContentLoaded', async () => {

    // ── Auth guard ──────────────────────────────
    let currentUser = null;
    try {
        const res = await fetch('/api/auth/status', { credentials: 'include' });
        const data = await res.json();
        if (!data.isLoggedIn) { window.location.href = '/'; return; }
        currentUser = data;
    } catch {
        window.location.href = '/';
        return;
    }

    // ── Sidebar user info ────────────────────────
    const name = (currentUser.email || '').split('@')[0];
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    document.getElementById('userName').textContent = displayName;
    document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();

    // ── Logout ───────────────────────────────────
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); }
        finally { window.location.href = '/'; }
    });

    // ── Order Configuration State ────────────────
    let files = [];
    let colorOption = 'bw';   // 'bw' | 'color'
    let paperSize = 'A4';   // 'A4' | 'A3'
    let copies = 1;
    let spiralBinding = false;
    let expressDelivery = false;

    const PRICE = { bw: 2, color: 5, a3Extra: 10, spiral: 20, express: 15 };

    // ── Booking Flow State ───────────────────────
    let selectedLocationId = null;
    let selectedLocationName = null;
    let selectedTimeSlot = null;
    let currentStep = 'location'; // 'location' | 'slot' | 'review'

    // ── File Upload ──────────────────────────────
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const filesList = document.getElementById('filesList');

    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        addFiles([...e.dataTransfer.files]);
    });

    fileInput.addEventListener('change', () => {
        addFiles([...fileInput.files]);
        fileInput.value = '';
    });

    function addFiles(newFiles) {
        const allowed = ['application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword', 'image/png', 'image/jpeg'];
        newFiles.forEach(f => {
            if (files.length >= 10) { showToast('Max 10 files allowed.', 'error'); return; }
            if (!allowed.includes(f.type)) { showToast(`${f.name}: unsupported type.`, 'error'); return; }
            files.push(f);
        });
        renderFiles();
        updateSummary();
    }

    function renderFiles() {
        filesList.innerHTML = files.map((f, i) => `
            <div class="file-item" id="file-${i}">
                <div class="file-item-info">
                    <span class="file-item-name">${f.name}</span>
                    <span class="file-item-size">${formatSize(f.size)}</span>
                </div>
                <button class="file-remove" data-idx="${i}" title="Remove">✕</button>
            </div>`).join('');

        filesList.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                files.splice(parseInt(btn.dataset.idx), 1);
                renderFiles();
                updateSummary();
            });
        });
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ── Color Option Toggle ──────────────────────
    document.getElementById('colorGroup').querySelectorAll('.toggle-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('colorGroup').querySelectorAll('.toggle-option')
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            colorOption = btn.dataset.value;
            updateSummary();
        });
    });

    // ── Paper Size Toggle ────────────────────────
    document.getElementById('sizeGroup').querySelectorAll('.toggle-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('sizeGroup').querySelectorAll('.toggle-option')
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            paperSize = btn.dataset.value;
            updateSummary();
        });
    });

    // ── Copies Counter ───────────────────────────
    document.getElementById('decrementBtn').addEventListener('click', () => {
        if (copies > 1) { copies--; updateCounter(); updateSummary(); }
    });
    document.getElementById('incrementBtn').addEventListener('click', () => {
        if (copies < 99) { copies++; updateCounter(); updateSummary(); }
    });
    function updateCounter() {
        document.getElementById('copiesValue').textContent = copies;
    }

    // ── Add-on Toggles ───────────────────────────
    document.getElementById('addonSpiral').addEventListener('click', () => {
        spiralBinding = !spiralBinding;
        document.getElementById('addonSpiral').classList.toggle('selected', spiralBinding);
        updateSummary();
    });
    document.getElementById('addonExpress').addEventListener('click', () => {
        expressDelivery = !expressDelivery;
        document.getElementById('addonExpress').classList.toggle('selected', expressDelivery);
        updateSummary();
    });

    // ── Price Calculation ────────────────────────
    function calcPrice() {
        const basePerCopy = PRICE[colorOption];
        const a3Extra = paperSize === 'A3' ? PRICE.a3Extra * copies : 0;
        const base = basePerCopy * copies;
        const spiral = spiralBinding ? PRICE.spiral : 0;
        const express = expressDelivery ? PRICE.express : 0;
        return { base, a3Extra, spiral, express, total: base + a3Extra + spiral + express };
    }

    function updateSummary() {
        const p = calcPrice();

        // Base price label
        document.getElementById('basePriceLabel').textContent =
            `Base Price (${copies}x · ${colorOption === 'bw' ? 'B&W' : 'Color'})`;
        document.getElementById('basePriceValue').textContent = `₹${p.base}`;

        // A3 line
        const a3Wrap = document.getElementById('a3LineWrap');
        a3Wrap.style.display = paperSize === 'A3' ? '' : 'none';
        document.getElementById('a3LineValue').textContent = `₹${p.a3Extra}`;

        // Add-on lines
        document.getElementById('spiralLineWrap').style.display = spiralBinding ? '' : 'none';
        document.getElementById('expressLineWrap').style.display = expressDelivery ? '' : 'none';

        // Total
        document.getElementById('totalAmount').textContent = `₹${p.total}`;

        // Confirm button state
        const hasFiles = files.length > 0;
        const confirmBtn = document.getElementById('confirmBtn');
        confirmBtn.disabled = !hasFiles;
        document.getElementById('summaryNote').textContent =
            hasFiles ? '' : 'Please upload at least one file to continue.';
    }

    // Initial summary render
    updateSummary();

    // ── Booking Flow Modal Elements ──────────────
    const bookingOverlay = document.getElementById('bookingOverlay');
    const bookingClose = document.getElementById('bookingClose');

    const stepLocationSec = document.getElementById('bookingStepLocation');
    const stepSlotSec = document.getElementById('bookingStepSlot');
    const stepReviewSec = document.getElementById('bookingStepReview');

    const locationGrid = document.getElementById('locationGrid');
    const locationContinue = document.getElementById('locationContinue');

    const slotLocationLabel = document.getElementById('slotLocationLabel');
    const slotGrid = document.getElementById('slotGrid');
    const slotBack = document.getElementById('slotBack');
    const slotContinue = document.getElementById('slotContinue');

    const reviewLocation = document.getElementById('reviewLocation');
    const reviewTime = document.getElementById('reviewTime');
    const reviewOrderLines = document.getElementById('reviewOrderLines');
    const reviewTotal = document.getElementById('reviewTotal');
    const reviewBack = document.getElementById('reviewBack');
    const proceedPayBtn = document.getElementById('proceedPayBtn');

    const progressSteps = bookingOverlay ? bookingOverlay.querySelectorAll('.cp-nav-step') : [];

    function updateProgressUI(activeStep) {
        currentStep = activeStep;
        progressSteps.forEach(step => {
            const stepName = step.dataset.step;
            step.classList.remove('is-active', 'is-done');
            if (stepName === activeStep) {
                step.classList.add('is-active');
            } else if (
                (activeStep === 'slot' && stepName === 'location') ||
                (activeStep === 'review' && (stepName === 'location' || stepName === 'slot'))
            ) {
                step.classList.add('is-done');
            }
        });
    }

    progressSteps.forEach(step => {
        step.addEventListener('click', () => {
            const targetStep = step.dataset.step;
            if (targetStep === 'location') {
                goToStep('location');
            } else if (targetStep === 'slot' && selectedLocationId) {
                goToStep('slot');
            } else if (targetStep === 'review' && selectedLocationId && selectedTimeSlot) {
                goToStep('review');
            }
        });
    });

    function openBookingModal() {
        if (files.length === 0) {
            showToast('Please upload at least one file to continue.', 'error');
            return;
        }
        bookingOverlay.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';
        goToStep('location');
    }

    function closeBookingModal() {
        bookingOverlay.setAttribute('hidden', '');
        document.body.style.overflow = '';
    }

    if (bookingClose) bookingClose.addEventListener('click', closeBookingModal);

    if (bookingOverlay) {
        bookingOverlay.addEventListener('click', (e) => {
            if (e.target === bookingOverlay) closeBookingModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && bookingOverlay && !bookingOverlay.hasAttribute('hidden')) {
            closeBookingModal();
        }
    });

    function goToStep(step) {
        stepLocationSec.setAttribute('hidden', '');
        stepSlotSec.setAttribute('hidden', '');
        stepReviewSec.setAttribute('hidden', '');

        if (step === 'location') {
            stepLocationSec.removeAttribute('hidden');
            updateProgressUI('location');
            renderLocationStep();
        } else if (step === 'slot') {
            stepSlotSec.removeAttribute('hidden');
            updateProgressUI('slot');
            renderSlotStep();
        } else if (step === 'review') {
            stepReviewSec.removeAttribute('hidden');
            updateProgressUI('review');
            renderReviewStep();
        }
    }

    // ── Step 1: Select Location ──
    function renderLocationStep() {
        const locationCards = locationGrid.querySelectorAll('.cp-loc-card');
        locationCards.forEach(card => {
            const locId = card.dataset.locationId;
            const isSelected = locId === selectedLocationId;
            card.classList.toggle('is-selected', isSelected);

            card.onclick = () => {
                locationCards.forEach(c => c.classList.remove('is-selected'));
                card.classList.add('is-selected');
                selectedLocationId = card.dataset.locationId;
                selectedLocationName = card.dataset.locationName;
                locationContinue.disabled = false;
            };
        });

        locationContinue.disabled = !selectedLocationId;
    }

    locationContinue.addEventListener('click', () => {
        if (!selectedLocationId) return;
        goToStep('slot');
    });

    // ── Step 2: Select Time Slot ──
    async function renderSlotStep() {
        slotLocationLabel.textContent = selectedLocationName || '—';
        slotContinue.disabled = !selectedTimeSlot;

        slotGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 1.5rem 0; color: var(--text-muted);">
                <span class="loading-spinner" style="border-color: rgba(59,130,246,0.3); border-top-color: var(--primary);"></span>
                <p style="margin-top: 0.5rem; font-size: 0.85rem;">Loading available time slots...</p>
            </div>
        `;

        let slotsData = [];
        try {
            const res = await fetch(`/api/orders/slots?location=${encodeURIComponent(selectedLocationId)}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                slotsData = data.slots || [];
            }
        } catch (e) {
            console.warn('Could not fetch slots via API:', e);
        }

        // Fallback calculation matching backend seed if API fails
        if (!slotsData || slotsData.length === 0) {
            const SEED = {
                'main-gate|9:25 AM': 1, 'main-gate|11:05 AM': 2, 'main-gate|1:15 PM': 5, 'main-gate|2:05 PM': 0, 'main-gate|4:00 PM': 6,
                'academic-block|9:25 AM': 6, 'academic-block|11:05 AM': 1, 'academic-block|1:15 PM': 2, 'academic-block|2:05 PM': 5, 'academic-block|4:00 PM': 0,
                'hostel-gate|9:25 AM': 2, 'hostel-gate|11:05 AM': 6, 'hostel-gate|1:15 PM': 0, 'hostel-gate|2:05 PM': 1, 'hostel-gate|4:00 PM': 5
            };
            const TIMES = ['9:25 AM', '11:05 AM', '1:15 PM', '2:05 PM', '4:00 PM'];
            slotsData = TIMES.map(time => {
                const booked = SEED[`${selectedLocationId}|${time}`] || 0;
                let status = 'available';
                if (booked >= 6) status = 'full';
                else if (booked >= 5) status = 'limited';
                return { time, status, booked, capacity: 6 };
            });
        }

        slotGrid.innerHTML = slotsData.map(s => {
            const isFull = s.status === 'full';
            const isLimited = s.status === 'limited';
            const isSelected = selectedTimeSlot === s.time;

            let statusLabel = 'Available';
            if (isFull) statusLabel = 'Fully Booked';
            else if (isLimited) statusLabel = 'Limited';

            let classes = 'cp-slot-pill';
            if (isFull) classes += ' is-full';
            else if (isLimited) classes += ' is-limited';
            else classes += ' is-available';

            if (isSelected) classes += ' is-selected';

            return `
                <button type="button" class="${classes}" data-slot="${s.time}" ${isFull ? 'disabled' : ''}>
                    <span class="cp-slot-time-text">${s.time}</span>
                    <span class="cp-slot-tag">${statusLabel}</span>
                </button>
            `;
        }).join('');

        slotGrid.querySelectorAll('.cp-slot-pill:not(:disabled)').forEach(chip => {
            chip.addEventListener('click', () => {
                slotGrid.querySelectorAll('.cp-slot-pill').forEach(c => c.classList.remove('is-selected'));
                chip.classList.add('is-selected');
                selectedTimeSlot = chip.dataset.slot;
                slotContinue.disabled = false;
            });
        });
    }

    slotBack.addEventListener('click', () => goToStep('location'));
    slotContinue.addEventListener('click', () => {
        if (!selectedTimeSlot) return;
        goToStep('review');
    });

    // ── Step 3: Review Booking ──
    function renderReviewStep() {
        reviewLocation.textContent = selectedLocationName || '—';
        reviewTime.textContent = selectedTimeSlot || '—';

        const p = calcPrice();
        const colorText = colorOption === 'bw' ? 'B&W (₹2/pg)' : 'Color (₹5/pg)';
        const sizeText = paperSize === 'A3' ? 'A3 (+₹10)' : 'A4';
        const fileNames = files.map(f => f.name).join(', ');

        const lines = [
            `<div class="cp-review-line"><span>Documents (${files.length} file${files.length > 1 ? 's' : ''})</span><strong>${fileNames}</strong></div>`,
            `<div class="cp-review-line"><span>Print Mode</span><strong>${colorText}</strong></div>`,
            `<div class="cp-review-line"><span>Paper &amp; Copies</span><strong>${sizeText} · ${copies} Copy${copies > 1 ? 'ies' : ''}</strong></div>`
        ];

        if (spiralBinding) {
            lines.push(`<div class="cp-review-line"><span>Add-on</span><strong>Spiral Binding (+₹20)</strong></div>`);
        }
        if (expressDelivery) {
            lines.push(`<div class="cp-review-line"><span>Add-on</span><strong>Express Delivery (+₹15)</strong></div>`);
        }

        reviewOrderLines.innerHTML = lines.join('');
        reviewTotal.textContent = `₹${p.total}`;
    }

    reviewBack.addEventListener('click', () => goToStep('slot'));

    // Handle Edit buttons on review step
    stepReviewSec.querySelectorAll('.cp-inline-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const editTarget = btn.dataset.edit;
            if (editTarget === 'location') goToStep('location');
            else if (editTarget === 'slot') goToStep('slot');
        });
    });

    // ── "Start Order" Button Event ──
    document.getElementById('confirmBtn').addEventListener('click', () => {
        openBookingModal();
    });

    // ── "Proceed to Payment" Button Event ──
    proceedPayBtn.addEventListener('click', async () => {
        if (!selectedLocationId || !selectedTimeSlot) {
            showToast('Please select a collection location and time slot.', 'error');
            return;
        }

        proceedPayBtn.disabled = true;
        proceedPayBtn.innerHTML = '<span class="loading-spinner"></span>&nbsp; Processing Payment…';

        const p = calcPrice();
        const payload = {
            colorOption,
            paperSize,
            copies,
            spiralBinding,
            expressDelivery,
            totalPrice: p.total,
            fileCount: files.length,
            collectionLocationId: selectedLocationId,
            collectionLocation: selectedLocationName,
            collectionTime: selectedTimeSlot
        };

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                closeBookingModal();
                showToast('Order placed successfully! 🎉', 'success');
                setTimeout(() => window.location.href = '/dashboard', 1800);
            } else {
                const data = await res.json();
                showToast(data.message || 'Failed to place order.', 'error');
                proceedPayBtn.disabled = false;
                proceedPayBtn.textContent = 'Proceed to Payment';
            }
        } catch {
            showToast('Connection error. Please try again.', 'error');
            proceedPayBtn.disabled = false;
            proceedPayBtn.textContent = 'Proceed to Payment';
        }
    });

    // ── Toast Notification ───────────────────────
    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.className = `toast ${type}`;
        document.getElementById('toastIcon').textContent = type === 'success' ? '✓' : '✕';
        document.getElementById('toastMsg').textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }
});
