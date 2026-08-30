document.addEventListener('DOMContentLoaded', () => {

    // ── Booking State ────────────────────────────
    let selectedLocationId = null;
    let selectedLocationName = null;
    let selectedTimeSlot = null;

    // Mock Slot Occupancy Seeds (matching server/slots.js)
    const SEED_BOOKED = {
        'main-gate|9:25 AM': 1, 'main-gate|11:05 AM': 2, 'main-gate|1:15 PM': 5, 'main-gate|2:05 PM': 0, 'main-gate|4:00 PM': 6,
        'academic-block|9:25 AM': 6, 'academic-block|11:05 AM': 1, 'academic-block|1:15 PM': 2, 'academic-block|2:05 PM': 5, 'academic-block|4:00 PM': 0,
        'hostel-gate|9:25 AM': 2, 'hostel-gate|11:05 AM': 6, 'hostel-gate|1:15 PM': 0, 'hostel-gate|2:05 PM': 1, 'hostel-gate|4:00 PM': 5
    };

    const TIME_SLOTS = ['9:25 AM', '11:05 AM', '1:15 PM', '2:05 PM', '4:00 PM'];

    // ── DOM Elements ─────────────────────────────
    const stepLocationSec = document.getElementById('stepLocationSection');
    const stepSlotSec = document.getElementById('stepSlotSection');
    const stepReviewSec = document.getElementById('stepReviewSection');

    const locationGrid = document.getElementById('locationGrid');
    const locationNextBtn = document.getElementById('locationNextBtn');

    const slotLocationDisplay = document.getElementById('slotLocationDisplay');
    const slotGrid = document.getElementById('slotGrid');
    const slotBackBtn = document.getElementById('slotBackBtn');
    const slotNextBtn = document.getElementById('slotNextBtn');

    const reviewLocVal = document.getElementById('reviewLocVal');
    const reviewTimeVal = document.getElementById('reviewTimeVal');
    const editLocationBtn = document.getElementById('editLocationBtn');
    const editSlotBtn = document.getElementById('editSlotBtn');
    const reviewBackBtn = document.getElementById('reviewBackBtn');
    const payBtn = document.getElementById('payBtn');

    const progressSteps = document.querySelectorAll('.cp-nav-step');

    // ── Step Navigation UI ───────────────────────
    function updateProgressUI(activeStep) {
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

    // ── Step 1: Location Selection ───────────────
    function renderLocationStep() {
        const locationCards = locationGrid.querySelectorAll('.cp-loc-card');
        locationCards.forEach(card => {
            const locId = card.dataset.locationId;
            card.classList.toggle('is-selected', locId === selectedLocationId);

            card.onclick = () => {
                locationCards.forEach(c => c.classList.remove('is-selected'));
                card.classList.add('is-selected');
                selectedLocationId = card.dataset.locationId;
                selectedLocationName = card.dataset.locationName;
                locationNextBtn.disabled = false;
            };
        });

        locationNextBtn.disabled = !selectedLocationId;
    }

    locationNextBtn.addEventListener('click', () => {
        if (!selectedLocationId) return;
        goToStep('slot');
    });

    // ── Step 2: Time Slot Selection ──────────────
    async function renderSlotStep() {
        slotLocationDisplay.textContent = selectedLocationName || '—';
        slotNextBtn.disabled = !selectedTimeSlot;

        let slotsData = [];
        try {
            const res = await fetch(`/api/orders/slots?location=${encodeURIComponent(selectedLocationId)}`);
            if (res.ok) {
                const data = await res.json();
                slotsData = data.slots || [];
            }
        } catch (_) {}

        if (!slotsData || slotsData.length === 0) {
            slotsData = TIME_SLOTS.map(time => {
                const booked = SEED_BOOKED[`${selectedLocationId}|${time}`] || 0;
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
                slotNextBtn.disabled = false;
            });
        });
    }

    slotBackBtn.addEventListener('click', () => goToStep('location'));
    slotNextBtn.addEventListener('click', () => {
        if (!selectedTimeSlot) return;
        goToStep('review');
    });

    // ── Step 3: Review Booking ───────────────────
    function renderReviewStep() {
        reviewLocVal.textContent = selectedLocationName || '—';
        reviewTimeVal.textContent = selectedTimeSlot || '—';
    }

    reviewBackBtn.addEventListener('click', () => goToStep('slot'));

    if (editLocationBtn) {
        editLocationBtn.addEventListener('click', () => goToStep('location'));
    }
    if (editSlotBtn) {
        editSlotBtn.addEventListener('click', () => goToStep('slot'));
    }

    // Payment simulation
    payBtn.addEventListener('click', () => {
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="loading-spinner"></span>&nbsp; Processing Payment…';

        setTimeout(() => {
            showToast('Order confirmed! Booking simulation successful. 🎉', 'success');
            payBtn.disabled = false;
            payBtn.innerHTML = 'Proceed to Payment <span class="arrow-icon">→</span>';
        }, 1200);
    });

    // Toast helper
    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toastIcon');
        const msgEl = document.getElementById('toastMsg');
        toast.className = `toast ${type}`;
        icon.textContent = type === 'success' ? '✓' : '✕';
        msgEl.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }

    // Initialize at Step 1
    goToStep('location');
});
