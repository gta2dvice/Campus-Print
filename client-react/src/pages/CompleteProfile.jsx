import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Toast from '../components/Toast';
import useToast from '../lib/useToast';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import LogoLink from '../components/LogoLink';
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
        <div className="auth-container" style={{ position: 'relative' }}>
            <LogoLink />
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
