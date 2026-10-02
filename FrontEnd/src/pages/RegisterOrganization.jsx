// src/pages/RegisterOrganization.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const RegisterOrganization = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = org info, 2 = admin info, 3 = success
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [registeredOrgId, setRegisteredOrgId] = useState('');
    const [formData, setFormData] = useState({
        orgName: '',
        orgEmail: '',
        orgPhone: '',
        orgAddress: '',
        adminEmail: '',
        adminPassword: '',
        adminPasswordConfirm: '',
    });

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleStep1 = (e) => {
        e.preventDefault();
        if (!formData.orgName.trim() || !formData.orgEmail.trim()) {
            setError('Organization name and email are required');
            return;
        }
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.adminEmail.trim() || !formData.adminPassword.trim()) {
            setError('Admin email and password are required');
            return;
        }
        if (formData.adminPassword !== formData.adminPasswordConfirm) {
            setError('Passwords do not match');
            return;
        }
        if (formData.adminPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post('/api/v1/organizations/register', {
                orgName: formData.orgName,
                orgEmail: formData.orgEmail,
                orgPhone: formData.orgPhone,
                orgAddress: formData.orgAddress,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword,
            });
            setRegisteredOrgId(res.data.data.organization.organizationId);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

                * { box-sizing: border-box; }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-12px); }
                }

                .reg-card {
                    background: rgba(255,255,255,0.05);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 24px;
                    padding: 48px;
                    width: 100%;
                    max-width: 560px;
                    animation: fadeInUp 0.6s ease;
                    box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
                }

                .reg-input {
                    width: 100%;
                    padding: 14px 18px;
                    background: rgba(255,255,255,0.07);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 12px;
                    color: #fff;
                    font-size: 15px;
                    font-family: 'Inter', sans-serif;
                    outline: none;
                    transition: all 0.3s ease;
                    margin-bottom: 16px;
                }
                .reg-input::placeholder { color: rgba(255,255,255,0.35); }
                .reg-input:focus {
                    border-color: #6c63ff;
                    background: rgba(108,99,255,0.1);
                    box-shadow: 0 0 0 3px rgba(108,99,255,0.2);
                }

                .reg-label {
                    display: block;
                    color: rgba(255,255,255,0.7);
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 6px;
                    letter-spacing: 0.5px;
                }

                .reg-btn-primary {
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #6c63ff, #a855f7);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    font-family: 'Inter', sans-serif;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-top: 8px;
                }
                .reg-btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 30px rgba(108,99,255,0.4);
                }
                .reg-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

                .reg-btn-secondary {
                    width: 100%;
                    padding: 14px;
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 12px;
                    color: rgba(255,255,255,0.7);
                    font-size: 15px;
                    font-family: 'Inter', sans-serif;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-top: 10px;
                }
                .reg-btn-secondary:hover {
                    border-color: rgba(255,255,255,0.4);
                    color: white;
                    background: rgba(255,255,255,0.05);
                }

                .step-indicator {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                    margin-bottom: 32px;
                }
                .step-dot {
                    width: 40px;
                    height: 4px;
                    border-radius: 2px;
                    background: rgba(255,255,255,0.15);
                    transition: all 0.4s ease;
                }
                .step-dot.active {
                    background: linear-gradient(90deg, #6c63ff, #a855f7);
                }

                .error-box {
                    background: rgba(239,68,68,0.15);
                    border: 1px solid rgba(239,68,68,0.3);
                    border-radius: 10px;
                    padding: 12px 16px;
                    color: #fca5a5;
                    font-size: 14px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .success-icon {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #10b981, #059669);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 36px;
                    animation: pulse 2s ease-in-out infinite;
                    box-shadow: 0 0 40px rgba(16,185,129,0.4);
                }

                .org-id-badge {
                    background: linear-gradient(135deg, rgba(108,99,255,0.2), rgba(168,85,247,0.2));
                    border: 1px solid rgba(108,99,255,0.4);
                    border-radius: 12px;
                    padding: 16px 24px;
                    text-align: center;
                    margin: 20px 0;
                }

                .org-id-value {
                    font-size: 22px;
                    font-weight: 700;
                    color: #a5b4fc;
                    letter-spacing: 2px;
                    font-family: 'Courier New', monospace;
                }

                .floating-orb {
                    position: fixed;
                    border-radius: 50%;
                    filter: blur(80px);
                    pointer-events: none;
                    animation: float 6s ease-in-out infinite;
                }

                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    display: inline-block;
                    margin-right: 8px;
                    vertical-align: middle;
                }
            `}</style>

            {/* Background orbs */}
            <div className="floating-orb" style={{ width: 400, height: 400, background: 'rgba(108,99,255,0.15)', top: '-10%', left: '-10%' }} />
            <div className="floating-orb" style={{ width: 300, height: 300, background: 'rgba(168,85,247,0.1)', bottom: '-5%', right: '-5%', animationDelay: '3s' }} />
            <div className="floating-orb" style={{ width: 200, height: 200, background: 'rgba(6,182,212,0.08)', top: '50%', right: '20%', animationDelay: '1.5s' }} />

            <div className="reg-card">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: 28,
                        boxShadow: '0 8px 32px rgba(108,99,255,0.4)',
                    }}>🏫</div>
                    <h1 style={{ color: 'white', fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
                        Register Organization
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>
                        Create your school's account on EduAutomation
                    </p>
                </div>

                {/* Step indicators */}
                {step < 3 && (
                    <div className="step-indicator">
                        <div className={`step-dot ${step >= 1 ? 'active' : ''}`} />
                        <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
                    </div>
                )}

                {error && (
                    <div className="error-box">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* ── Step 1: Organization Info ── */}
                {step === 1 && (
                    <form onSubmit={handleStep1}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
                            Step 1 of 2 · Organization Details
                        </p>

                        <label className="reg-label">Organization Name *</label>
                        <input
                            className="reg-input"
                            name="orgName"
                            value={formData.orgName}
                            onChange={handleChange}
                            placeholder="e.g. Greenwood Academy"
                            required
                        />

                        <label className="reg-label">Official Email *</label>
                        <input
                            className="reg-input"
                            name="orgEmail"
                            type="email"
                            value={formData.orgEmail}
                            onChange={handleChange}
                            placeholder="contact@greenwoodacademy.edu"
                            required
                        />

                        <label className="reg-label">Phone (optional)</label>
                        <input
                            className="reg-input"
                            name="orgPhone"
                            value={formData.orgPhone}
                            onChange={handleChange}
                            placeholder="+92 300 0000000"
                        />

                        <label className="reg-label">Address (optional)</label>
                        <input
                            className="reg-input"
                            name="orgAddress"
                            value={formData.orgAddress}
                            onChange={handleChange}
                            placeholder="123 School Road, City"
                        />

                        <button type="submit" className="reg-btn-primary">
                            Continue →
                        </button>
                    </form>
                )}

                {/* ── Step 2: Admin Account ── */}
                {step === 2 && (
                    <form onSubmit={handleSubmit}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
                            Step 2 of 2 · Create Admin Account
                        </p>

                        <div style={{
                            background: 'rgba(108,99,255,0.1)',
                            border: '1px solid rgba(108,99,255,0.3)',
                            borderRadius: 10,
                            padding: '10px 14px',
                            marginBottom: 20,
                            fontSize: 13,
                            color: '#a5b4fc',
                        }}>
                            🏫 <strong>{formData.orgName}</strong>
                        </div>

                        <label className="reg-label">Admin Email *</label>
                        <input
                            className="reg-input"
                            name="adminEmail"
                            type="email"
                            value={formData.adminEmail}
                            onChange={handleChange}
                            placeholder="admin@greenwoodacademy.edu"
                            required
                        />

                        <label className="reg-label">Password *</label>
                        <input
                            className="reg-input"
                            name="adminPassword"
                            type="password"
                            value={formData.adminPassword}
                            onChange={handleChange}
                            placeholder="Min. 6 characters"
                            required
                        />

                        <label className="reg-label">Confirm Password *</label>
                        <input
                            className="reg-input"
                            name="adminPasswordConfirm"
                            type="password"
                            value={formData.adminPasswordConfirm}
                            onChange={handleChange}
                            placeholder="Re-enter password"
                            required
                        />

                        <button type="submit" className="reg-btn-primary" disabled={loading}>
                            {loading ? <><span className="spinner" />Registering...</> : '🚀 Register Organization'}
                        </button>
                        <button type="button" className="reg-btn-secondary" onClick={() => setStep(1)}>
                            ← Back
                        </button>
                    </form>
                )}

                {/* ── Step 3: Success ── */}
                {step === 3 && (
                    <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease' }}>
                        <div className="success-icon">✅</div>
                        <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                            Organization Registered!
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6 }}>
                            Your organization has been created successfully. Save your <strong style={{ color: '#a5b4fc' }}>Organization ID</strong> — you'll need it to log in.
                        </p>

                        <div className="org-id-badge">
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Your Organization ID
                            </p>
                            <div className="org-id-value">{registeredOrgId}</div>
                        </div>

                        <div style={{
                            background: 'rgba(251,191,36,0.1)',
                            border: '1px solid rgba(251,191,36,0.3)',
                            borderRadius: 10,
                            padding: '12px 16px',
                            fontSize: 13,
                            color: '#fde68a',
                            marginBottom: 24,
                            textAlign: 'left',
                        }}>
                            ⚠️ <strong>Important:</strong> Save this Organization ID. Share it with all users who need to log into your organization's system.
                        </div>

                        <button
                            className="reg-btn-primary"
                            onClick={() => navigate('/login')}
                        >
                            Go to Login →
                        </button>
                    </div>
                )}

                {/* Footer link */}
                {step < 3 && (
                    <p style={{ textAlign: 'center', marginTop: 24, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>
                            Sign In
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
};

export default RegisterOrganization;
