import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import useToast from '../lib/useToast';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import LogoLink from '../components/LogoLink';
import PageBackground from '../components/PageBackground';
import '../styles/style.css';

export default function CompleteProfile() {
    const navigate = useNavigate();
    const { toast } = useToast();
    useBodyClass('auth-page');
    useDocumentTitle('Complete Profile – Print Campus');

    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        class_room_number: '',
    });
    const [loading, setLoading] = useState(false);

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/dashboard');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Profile completed successfully!');
                navigate('/dashboard');
            } else {
                toast.error(data.message || 'Failed to save profile');
            }
        } catch (err) {
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <PageBackground />
            
            <div style={{ width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                <button
                    type="button"
                    onClick={handleBack}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: '#93c5fd',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back
                </button>
                <LogoLink />
            </div>

            <div className="auth-card">
                <div className="auth-header">
                    <h1>Complete Your Profile</h1>
                    <p>Please provide your details to start placing orders.</p>
                </div>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="full_name">Full Name</label>
                        <input
                            type="text"
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="e.g. Rahul Kumar"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone_number">Phone Number</label>
                        <input
                            type="tel"
                            id="phone_number"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            placeholder="e.g. 9876543210"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="class_room_number">Class / Room Number</label>
                        <input
                            type="text"
                            id="class_room_number"
                            value={formData.class_room_number}
                            onChange={(e) => setFormData({ ...formData, class_room_number: e.target.value })}
                            placeholder="e.g. B-204"
                            required
                        />
                    </div>
                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Complete Profile'}
                    </button>
                </form>
            </div>
            <Toast toast={toast} />
        </div>
    );
}
