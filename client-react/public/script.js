/* ── Hero Scroll Effect ── */

// Smooth scroll to trusted section on arrow click
function scrollToContent() {
    const target = document.getElementById('main-content');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Blur hero background + fade/scale hero text as user scrolls
const heroText = document.getElementById('heroText');

window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const vh = window.innerHeight;

    // Blur: 0px at top → 20px after 1 full viewport scrolled
    const blurPower = Math.min((scrolled / vh) * 20, 20);
    document.documentElement.style.setProperty('--hero-blur', `${blurPower}px`);

    // Text: fade out and scale down slightly while within the first viewport
    if (heroText && scrolled < vh) {
        const opacity = Math.max(0, 1 - scrolled / (vh * 0.6));
        const scale = 1 - scrolled / (vh * 5);
        heroText.style.opacity = opacity;
        heroText.style.transform = `scale(${scale})`;
    }
}, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('uploadBtn');
    const authModal = document.getElementById('authModal');
    const closeModal = document.getElementById('closeModal');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showSignupBtn = document.getElementById('showSignupBtn');
    const authForm = document.getElementById('authForm');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authError = document.getElementById('authError');

    let isLoginMode = true;

    // Open upload/modal block
    uploadBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            // Check auth status
            const res = await fetch('/api/auth/status', { credentials: 'include' });
            const data = await res.json();

            if (data.isLoggedIn) {
                // If logged in, redirect to upload page
                window.location.href = '/upload';
            } else {
                // Not logged in, show modal
                openModal();
            }
        } catch (error) {
            console.error('Error checking auth state', error);
            openModal(); // fallback
        }
    });

    // Close Modal
    closeModal.addEventListener('click', () => {
        closeAuthModal();
    });

    // Close on click outside
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            closeAuthModal();
        }
    });

    function openModal() {
        authModal.classList.add('active');
        document.body.classList.add('modal-open');
        clearErrors();
    }

    function closeAuthModal() {
        authModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        authForm.reset();
        clearErrors();
    }

    function clearErrors() {
        authError.textContent = '';
    }

    // Toggle Login/Signup
    showLoginBtn.addEventListener('click', () => {
        isLoginMode = true;
        showLoginBtn.classList.add('active');
        showSignupBtn.classList.remove('active');
        confirmPasswordGroup.style.display = 'none';
        confirmPasswordInput.removeAttribute('required');
        authSubmitBtn.textContent = 'Login';
        clearErrors();
    });

    showSignupBtn.addEventListener('click', () => {
        isLoginMode = false;
        showSignupBtn.classList.add('active');
        showLoginBtn.classList.remove('active');
        confirmPasswordGroup.style.display = 'flex';
        confirmPasswordInput.setAttribute('required', 'true');
        authSubmitBtn.textContent = 'Sign Up';
        clearErrors();
    });

    // Submit Auth Form
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!isLoginMode) {
            const confirmPassword = confirmPasswordInput.value;
            if (password !== confirmPassword) {
                authError.textContent = 'Passwords do not match.';
                return;
            }
        }

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';

        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Please wait...';

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                // Success
                closeAuthModal();
                // Redirect to dashboard
                window.location.href = '/dashboard';
            } else {
                authError.textContent = data.message || 'Authentication failed.';
            }
        } catch (error) {
            console.error('Auth error:', error);
            authError.textContent = 'An error occurred. Please try again.';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
        }
    });
});
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal-show');
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -80px 0px'
});

document.querySelectorAll('.reveal').forEach((el) => {
    revealObserver.observe(el);
});

/* ─────────────────────────────────
   GPU ACCELERATION FOR SMOOTHNESS
───────────────────────────────── */
document.querySelectorAll('.trusted-card').forEach(card => {
    card.style.willChange = 'transform';
});

const heroContainer = document.querySelector('.hero-container');
if (heroContainer) {
    heroContainer.style.willChange = 'filter';
}

/* ─────────────────────────────────
   PAUSE CARD ROTATION WHEN TAB HIDDEN
   (performance improvement)
───────────────────────────────── */
document.addEventListener('visibilitychange', () => {
    const orbit = document.querySelector('.trusted-orbit');
    if (!orbit) return;

    if (document.hidden) {
        orbit.style.animationPlayState = 'paused';
    } else {
        orbit.style.animationPlayState = 'running';
    }
});

/* ── Pricing Section Calculator ── */
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('pcPagesSlider');
    const pagesDisplay = document.getElementById('pcPagesDisplay');
    const totalEl = document.getElementById('pcTotalAmount');
    const baseLabel = document.getElementById('ptcBaseLabel');
    const baseVal = document.getElementById('ptcBaseVal');
    const sizeLine = document.getElementById('ptcSizeLine');
    const spiralLine = document.getElementById('ptcSpiralLine');
    const expressLine = document.getElementById('ptcExpressLine');
    const ptcOrderBtn = document.getElementById('ptcOrderBtn');

    if (!slider) return; // guard: pricing section must exist

    let state = {
        pages: 10,
        color: 'bw',
        size: 'A4',
        spiral: false,
        express: false
    };

    const PRICES = { bw: 2, color: 5, a3: 10, spiral: 20, express: 15 };

    /* ─ Slider fill gradient ─ */
    function updateSliderFill() {
        const pct = ((state.pages - 1) / (200 - 1)) * 100;
        slider.style.setProperty('--slider-pct', pct.toFixed(1) + '%');
    }

    slider.addEventListener('input', () => {
        state.pages = parseInt(slider.value, 10);
        pagesDisplay.textContent = state.pages === 1 ? '1 page' : state.pages + ' pages';
        updateSliderFill();
        recalculate();
    });

    /* ─ Color chips ─ */
    document.getElementById('pcColorGroup').addEventListener('click', (e) => {
        const chip = e.target.closest('[data-pc-color]');
        if (!chip) return;
        state.color = chip.dataset.pcColor;
        document.querySelectorAll('[data-pc-color]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        recalculate();
    });

    /* ─ Size chips ─ */
    document.getElementById('pcSizeGroup').addEventListener('click', (e) => {
        const chip = e.target.closest('[data-pc-size]');
        if (!chip) return;
        state.size = chip.dataset.pcSize;
        document.querySelectorAll('[data-pc-size]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        recalculate();
    });

    /* ─ Add-on checkboxes ─ */
    document.getElementById('pcCheckSpiral').addEventListener('change', (e) => {
        state.spiral = e.target.checked;
        recalculate();
    });
    document.getElementById('pcCheckExpress').addEventListener('change', (e) => {
        state.express = e.target.checked;
        recalculate();
    });

    /* ─ Recalculate & animate total ─ */
    function recalculate() {
        const perPage = PRICES[state.color];
        const base = state.pages * perPage;
        const a3Add = state.size === 'A3' ? PRICES.a3 : 0;
        const spiralAdd = state.spiral ? PRICES.spiral : 0;
        const expressAdd = state.express ? PRICES.express : 0;
        const total = base + a3Add + spiralAdd + expressAdd;

        const colorLabel = state.color === 'bw' ? 'B&W' : 'Color';
        baseLabel.innerHTML = state.pages + ' page' + (state.pages > 1 ? 's' : '') + ' \u00d7 \u20b9' + perPage + ' (' + colorLabel + ')';
        baseVal.textContent = '\u20b9' + base;

        sizeLine.classList.toggle('ptc-line-hidden', state.size !== 'A3');
        spiralLine.classList.toggle('ptc-line-hidden', !state.spiral);
        expressLine.classList.toggle('ptc-line-hidden', !state.express);

        totalEl.textContent = '\u20b9' + total;
        totalEl.classList.remove('bump');
        void totalEl.offsetWidth;
        totalEl.classList.add('bump');
        setTimeout(() => totalEl.classList.remove('bump'), 300);
    }

    /* ─ Order button – hooks into existing auth flow ─ */
    if (ptcOrderBtn) {
        ptcOrderBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/auth/status', { credentials: 'include' });
                const data = await res.json();
                if (data.isLoggedIn) {
                    window.location.href = '/new-order';
                } else {
                    document.getElementById('authModal').classList.add('active');
                    document.body.classList.add('modal-open');
                }
            } catch (_) {
                document.getElementById('authModal').classList.add('active');
                document.body.classList.add('modal-open');
            }
        });
    }

    /* Init */
    updateSliderFill();
    recalculate();
});

/* ── Smooth section navigation + shared scroll helpers ── */
function smoothScrollToElement(target) {
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const absoluteTop = rect.top + scrollTop;

    window.scrollTo({
        top: absoluteTop - 40, // small offset so section titles breathe
        behavior: 'smooth'
    });
}

function setupSmoothSectionNavigation() {
    // Any in-page anchor link (e.g. Location)
    const inPageLinks = document.querySelectorAll('a[href^="#"]');

    inPageLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;

            const id = href.substring(1);
            const target = document.getElementById(id);
            if (!target) return;

            e.preventDefault();
            smoothScrollToElement(target);
        });
    });

    // Hero secondary CTA → pricing section
    const pricingBtn = document.getElementById('seePricingBtn');
    if (pricingBtn) {
        pricingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const pricingSection = document.getElementById('pricing-section');
            smoothScrollToElement(pricingSection);
        });
    }

    // Footer "Print" CTA → pricing section
    const footerCta = document.querySelector('.pc-footer-cta');
    if (footerCta) {
        footerCta.addEventListener('click', (e) => {
            e.preventDefault();
            const pricingSection = document.getElementById('pricing-section');
            smoothScrollToElement(pricingSection);
        });
    }
}

function setupFooterUploadShortcut() {
    const footerUploadBtn = document.getElementById('footerUploadBtn');
    const uploadBtn = document.getElementById('uploadBtn');

    if (!footerUploadBtn || !uploadBtn) return;

    footerUploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Reuse existing auth+redirect logic wired to the main upload button
        uploadBtn.click();
    });
}

function setupSectionSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.top-nav a[href^="#"]');

    if (!sections.length || !navLinks.length) return;

    const linkById = new Map();
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        const id = href.slice(1);
        linkById.set(id, link);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            const activeLink = linkById.get(id);
            if (!activeLink) return;

            navLinks.forEach(link => link.classList.remove('nav-link--active'));
            activeLink.classList.add('nav-link--active');
        });
    }, {
        threshold: 0.45,
        rootMargin: '-10% 0px -55% 0px'
    });

    sections.forEach(section => observer.observe(section));
}

document.addEventListener('DOMContentLoaded', () => {
    setupSmoothSectionNavigation();
    setupFooterUploadShortcut();
    setupSectionSpy();
});
