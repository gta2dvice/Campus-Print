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

    // ── State ────────────────────────────────────
    let files = [];
    let colorOption = 'bw';   // 'bw' | 'color'
    let paperSize = 'A4';   // 'A4' | 'A3'
    let copies = 1;
    let spiralBinding = false;
    let expressDelivery = false;

    const PRICE = { bw: 2, color: 5, a3Extra: 10, spiral: 20, express: 15 };

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

    // ── Confirm & Pay ────────────────────────────
    document.getElementById('confirmBtn').addEventListener('click', async () => {
        if (files.length === 0) return;

        const confirmBtn = document.getElementById('confirmBtn');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="loading-spinner"></span>&nbsp; Placing Order…';

        const p = calcPrice();
        const payload = {
            colorOption,
            paperSize,
            copies,
            spiralBinding,
            expressDelivery,
            totalPrice: p.total,
            fileCount: files.length
        };

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Order placed successfully! 🎉', 'success');
                setTimeout(() => window.location.href = '/dashboard', 1800);
            } else {
                const data = await res.json();
                showToast(data.message || 'Failed to place order.', 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    Confirm &amp; Pay`;
            }
        } catch {
            showToast('Connection error. Please try again.', 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                Confirm &amp; Pay`;
        }
    });

    // ── Toast ────────────────────────────────────
    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.className = `toast ${type}`;
        document.getElementById('toastIcon').textContent = type === 'success' ? '✓' : '✕';
        document.getElementById('toastMsg').textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }
});
