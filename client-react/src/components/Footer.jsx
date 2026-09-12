import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/style.css';

export default function Footer() {
    const [isLoggedIn, setIsLoggedIn] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch('/api/auth/status', { credentials: 'include' });
                const data = await res.json();
                setIsLoggedIn(data.isLoggedIn);
            } catch {
                setIsLoggedIn(false);
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, []);

    if (loading) return null;

    return (
        <footer className="site-footer reveal">
            <div className="footer-watermark">PRINT CAMPUS</div>
            <div className="footer-inner">
                <div className="footer-brand">
                    <span className="footer-logo">PRINT CAMPUS</span>
                    <p className="footer-tagline">Skip the queue. Print smarter.</p>
                </div>

                <div className="footer-links">
                    <div className="footer-col">
                        <h4>Navigate</h4>
                        {isLoggedIn ? (
                            <>
                                <Link to="/">Home</Link>
                                <Link to="/new-order">New Order</Link>
                                <Link to="/dashboard">My Orders</Link>
                                <Link to="/dashboard">👤 My Dashboard</Link>
                                <a href="mailto:printcampus@college.edu">Contact</a>
                            </>
                        ) : (
                            <>
                                <Link to="/">Home</Link>
                                <Link to="/login">Login</Link>
                                <Link to="/register">Register</Link>
                                <a href="mailto:printcampus@college.edu">Contact</a>
                            </>
                        )}
                    </div>
                    <div className="footer-col">
                        <h4>Connect</h4>
                        <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
                        <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
                        <a href="mailto:printcampus@college.edu">Email Us</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
