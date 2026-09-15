import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Toast from '../components/Toast';
import useToast from '../lib/useToast';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import LogoLink from '../components/LogoLink';
import '../styles/style.css';

export default function EditProfile() {
    const navigate = useNavigate();
    const { toast } = useToast();
    useBodyClass('auth-page');
    useDocumentTitle('Edit Profile – Print Campus');

    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        class_room_number: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch('/api/auth/profile');
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        full_name: data.full_name,
                        phone_number: data.phone_number,
                        class_room_number: data.class_room_number,
                    });
                } else {
                    toast.error('Could not load profile');
                    navigate('/dashboard');
                }
            } catch (err) {
                toast.error('An unexpected error occurred');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [navigate, toast]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                toast.success('Profile updated successfully!');
                navigate('/dashboard');
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to update profile');
            }
        } catch (err) {
            toast.error('An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <div className="auth-container" style={{ position: 'relative' }}>
            <LogoLink />
            <div className="auth-card">
                <div className="auth-header">
                    <h1 style={{ fontSize: '1.5rem' }}>Edit Profile</h1>
                    <p>Keep your contact and location details updated.</p>
                </div>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="full_name">Full Name</label>
                        <input
                            type="text"
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="auth-submit" style={{ backgroundColor: '#ccc', color: '#333' }} onClick={() => navigate('/dashboard')}>
                            Cancel
                        </button>
                        <button type="submit" className="auth-submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
            <Toast toast={toast} />
        </div>
    );
}
