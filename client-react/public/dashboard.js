document.addEventListener('DOMContentLoaded', async () => {
    // ── Auth guard ──────────────────────────────
    let currentUser = null;
    try {
        const res = await fetch('/api/auth/status', { credentials: 'include' });
        const data = await res.json();
        if (!data.isLoggedIn) {
            window.location.href = '/';
            return;
        }
        currentUser = data;
    } catch {
        window.location.href = '/';
        return;
    }

    // ── Populate sidebar user info ───────────────
    const name = (currentUser.email || '').split('@')[0];
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);

    document.getElementById('greetingTitle').textContent = `Hello, ${displayName} 👋`;
    document.getElementById('userName').textContent = displayName;
    document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();

    // ── Load stats ───────────────────────────────
    try {
        const res = await fetch('/api/orders/stats', { credentials: 'include' });
        if (res.ok) {
            const stats = await res.json();
            document.getElementById('totalOrders').textContent = stats.total || 0;
            document.getElementById('inProgress').textContent = stats.in_progress || 0;
            document.getElementById('readyCount').textContent = stats.ready || 0;
        }
    } catch {
        // stats failed — just show zeros
    }

    // ── Load orders ──────────────────────────────
    try {
        const res = await fetch('/api/orders', { credentials: 'include' });
        if (res.ok) {
            const orders = await res.json();
            renderOrders(orders);
        }
    } catch {
        // orders failed — show empty state
    }

    // ── Logout ───────────────────────────────────
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } finally {
            window.location.href = '/';
        }
    });

    // ── Render orders table ──────────────────────
    function renderOrders(orders) {
        const container = document.getElementById('ordersContainer');
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                    </div>
                    <h3>No orders yet</h3>
                    <p>You haven't printed anything yet.</p>
                    <a href="/new-order" class="new-order-link" style="font-size:0.875rem;padding:0.6rem 1.25rem;">
                        Start your first order
                    </a>
                </div>`;
            return;
        }

        const rows = orders.map(o => {
            const date = new Date(o.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const color = o.color_option === 'bw' ? 'B&W' : 'Color';
            const status = o.status || 'pending';
            const statusLabel = {
                pending: 'Pending',
                in_progress: 'In Progress',
                ready: 'Ready',
                completed: 'Completed'
            }[status] || status;

            return `
                <tr>
                    <td>#${String(o.id).padStart(4, '0')}</td>
                    <td>${date}</td>
                    <td>${color} · ${o.paper_size} · ${o.copies}x</td>
                    <td><span class="status-badge status-${status}">${statusLabel}</span></td>
                    <td><strong>₹${parseFloat(o.total_price).toFixed(0)}</strong></td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="orders-table-wrap">
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Details</th>
                            <th>Status</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // ── Toast helper ─────────────────────────────
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
});
