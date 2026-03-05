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
