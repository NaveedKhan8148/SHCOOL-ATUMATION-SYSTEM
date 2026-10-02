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
        /* ── Full-viewport wrapper — never scrolls ─────────────────── */
        <div style={{
            height: '100dvh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.05); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-10px); }
                }

                /* ── Card ─────────────────────────────────────────── */
                .reg-card {
                    background: rgba(255,255,255,0.05);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 20px;
                    padding: clamp(18px, 3vh, 28px) clamp(20px, 3vw, 30px);
                    width: 100%;
                    max-width: 460px;
                    animation: fadeInUp 0.55s ease;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.45),
                                inset 0 1px 0 rgba(255,255,255,0.1);
                    /* card may scroll internally on very small heights */
                    max-height: calc(100dvh - 24px);
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                /* ── Inputs ───────────────────────────────────────── */
                .reg-input {
                    width: 100%;
                    padding: clamp(7px, 1.3vh, 11px) 14px;
                    background: rgba(255,255,255,0.07);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 10px;
                    color: #fff;
                    font-size: clamp(12px, 1.7vh, 14px);
                    font-family: 'Inter', sans-serif;
                    outline: none;
                    transition: all 0.25s ease;
                    margin-bottom: clamp(8px, 1.3vh, 13px);
                    box-sizing: border-box;
                }
                .reg-input::placeholder { color: rgba(255,255,255,0.35); }
                .reg-input:focus {
                    border-color: #6c63ff;
                    background: rgba(108,99,255,0.1);
                    box-shadow: 0 0 0 3px rgba(108,99,255,0.2);
                }

                /* ── Labels ───────────────────────────────────────── */
                .reg-label {
                    display: block;
                    color: rgba(255,255,255,0.7);
                    font-size: clamp(11px, 1.5vh, 13px);
                    font-weight: 500;
                    margin-bottom: clamp(3px, 0.5vh, 5px);
                    letter-spacing: 0.3px;
                }

                /* ── Primary button ───────────────────────────────── */
                .reg-btn-primary {
                    width: 100%;
                    padding: clamp(8px, 1.4vh, 12px);
                    background: linear-gradient(135deg, #6c63ff, #a855f7);
                    border: none;
                    border-radius: 10px;
                    color: white;
                    font-size: clamp(12px, 1.7vh, 14px);
                    font-weight: 600;
                    font-family: 'Inter', sans-serif;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    margin-top: 4px;
                    box-sizing: border-box;
                }
                .reg-btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 22px rgba(108,99,255,0.4);
                }
                .reg-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

                /* ── Secondary button ─────────────────────────────── */
                .reg-btn-secondary {
                    width: 100%;
                    padding: clamp(7px, 1.2vh, 10px);
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 10px;
                    color: rgba(255,255,255,0.7);
                    font-size: clamp(12px, 1.7vh, 13px);
                    font-family: 'Inter', sans-serif;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    margin-top: 6px;
                    box-sizing: border-box;
                }
                .reg-btn-secondary:hover {
                    border-color: rgba(255,255,255,0.4);
                    color: white;
                    background: rgba(255,255,255,0.05);
                }

                /* ── Step indicators ──────────────────────────────── */
                .step-indicator {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                    margin-bottom: clamp(10px, 1.8vh, 18px);
                }
                .step-dot {
                    width: 36px;
                    height: 3px;
                    border-radius: 2px;
                    background: rgba(255,255,255,0.15);
                    transition: all 0.4s ease;
                }
                .step-dot.active {
                    background: linear-gradient(90deg, #6c63ff, #a855f7);
                }

                /* ── Error box ────────────────────────────────────── */
                .error-box {
                    background: rgba(239,68,68,0.15);
                    border: 1px solid rgba(239,68,68,0.3);
                    border-radius: 8px;
                    padding: 9px 13px;
                    color: #fca5a5;
                    font-size: 12px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                }

                /* ── Success icon ─────────────────────────────────── */
                .success-icon {
                    width: clamp(48px, 7vh, 60px);
                    height: clamp(48px, 7vh, 60px);
                    background: linear-gradient(135deg, #10b981, #059669);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto clamp(10px, 1.6vh, 16px);
                    font-size: clamp(20px, 3.5vh, 28px);
                    animation: pulse 2s ease-in-out infinite;
                    box-shadow: 0 0 24px rgba(16,185,129,0.4);
                }

                /* ── Org ID badge ─────────────────────────────────── */
                .org-id-badge {
                    background: linear-gradient(135deg,rgba(108,99,255,0.18),rgba(168,85,247,0.18));
                    border: 1px solid rgba(108,99,255,0.4);
                    border-radius: 10px;
                    padding: clamp(10px, 1.5vh, 14px) 18px;
                    text-align: center;
                    margin: clamp(10px, 1.5vh, 16px) 0;
                }
                .org-id-value {
                    font-size: clamp(16px, 2.5vh, 20px);
                    font-weight: 700;
                    color: #a5b4fc;
                    letter-spacing: 2px;
                    font-family: 'Courier New', monospace;
                }

                /* ── Background orbs ──────────────────────────────── */
                .floating-orb {
                    position: fixed;
                    border-radius: 50%;
                    filter: blur(70px);
                    pointer-events: none;
                    animation: float 7s ease-in-out infinite;
                }

                /* ── Spinner ──────────────────────────────────────── */
                .spinner {
                    width: 16px; height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    display: inline-block;
                    margin-right: 7px;
                    vertical-align: middle;
                }

                /* ── Hide decorative orbs on short screens ────────── */
                @media (max-height: 680px) {
                    .floating-orb { display: none; }
                }
            `}</style>

            {/* ── Background orbs (fixed, no scroll effect) ── */}
            <div className="floating-orb" style={{ width: 320, height: 320, background: 'rgba(108,99,255,0.14)', top: '-8%',  left: '-8%'  }} />
            <div className="floating-orb" style={{ width: 240, height: 240, background: 'rgba(168,85,247,0.09)', bottom: '-4%', right: '-4%', animationDelay: '3s' }} />
            <div className="floating-orb" style={{ width: 160, height: 160, background: 'rgba(6,182,212,0.07)',   top: '45%',  right: '18%', animationDelay: '1.5s' }} />

            {/* ── Card ── */}
            <div className="reg-card">

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 'clamp(10px, 1.8vh, 18px)' }}>
                    <div style={{
                        width:  'clamp(40px, 5.5vh, 50px)',
                        height: 'clamp(40px, 5.5vh, 50px)',
                        background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto clamp(8px, 1.2vh, 12px)',
                        fontSize: 'clamp(18px, 2.8vh, 22px)',
                        boxShadow: '0 6px 18px rgba(108,99,255,0.4)',
                    }}>🏫</div>

                    <h1 style={{
                        color: 'white',
                        fontSize: 'clamp(15px, 2.5vh, 19px)',
                        fontWeight: 700,
                        margin: 0,
                        letterSpacing: '-0.3px',
                    }}>
                        Register Organization
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 'clamp(11px, 1.5vh, 13px)',
                        marginTop: 4,
                        marginBottom: 0,
                    }}>
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

                {/* Error */}
                {error && (
                    <div className="error-box">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* ── Step 1: Organization Info ── */}
                {step === 1 && (
                    <form onSubmit={handleStep1}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 14, textAlign: 'center', marginTop: 0 }}>
                            Step 1 of 2 · Organization Details
                        </p>

                        <label className="reg-label">Organization Name *</label>
                        <input className="reg-input" name="orgName" value={formData.orgName} onChange={handleChange}
                            placeholder="e.g. Greenwood Academy" required />

                        <label className="reg-label">Official Email *</label>
                        <input className="reg-input" name="orgEmail" type="email" value={formData.orgEmail} onChange={handleChange}
                            placeholder="contact@greenwoodacademy.edu" required />

                        <label className="reg-label">Phone (optional)</label>
                        <input className="reg-input" name="orgPhone" value={formData.orgPhone} onChange={handleChange}
                            placeholder="+92 300 0000000" />

                        <label className="reg-label">Address (optional)</label>
                        <input className="reg-input" name="orgAddress" value={formData.orgAddress} onChange={handleChange}
                            placeholder="123 School Road, City" />

                        <button type="submit" className="reg-btn-primary">Continue →</button>
                    </form>
                )}

                {/* ── Step 2: Admin Account ── */}
                {step === 2 && (
                    <form onSubmit={handleSubmit}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12, textAlign: 'center', marginTop: 0 }}>
                            Step 2 of 2 · Create Admin Account
                        </p>

                        <div style={{
                            background: 'rgba(108,99,255,0.1)',
                            border: '1px solid rgba(108,99,255,0.3)',
                            borderRadius: 8,
                            padding: '8px 12px',
                            marginBottom: 12,
                            fontSize: 12,
                            color: '#a5b4fc',
                        }}>
                            🏫 <strong>{formData.orgName}</strong>
                        </div>

                        <label className="reg-label">Admin Email *</label>
                        <input className="reg-input" name="adminEmail" type="email" value={formData.adminEmail} onChange={handleChange}
                            placeholder="admin@greenwoodacademy.edu" required />

                        <label className="reg-label">Password *</label>
                        <input className="reg-input" name="adminPassword" type="password" value={formData.adminPassword} onChange={handleChange}
                            placeholder="Min. 6 characters" required />

                        <label className="reg-label">Confirm Password *</label>
                        <input className="reg-input" name="adminPasswordConfirm" type="password" value={formData.adminPasswordConfirm} onChange={handleChange}
                            placeholder="Re-enter password" required />

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
                        <h2 style={{ color: 'white', fontSize: 'clamp(15px, 2.5vh, 18px)', fontWeight: 700, marginBottom: 6, marginTop: 0 }}>
                            Organization Registered!
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.55, marginTop: 0 }}>
                            Your organization has been created. Save your{' '}
                            <strong style={{ color: '#a5b4fc' }}>Organization ID</strong> — you'll need it to log in.
                        </p>

                        <div className="org-id-badge">
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 5, marginTop: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Your Organization ID
                            </p>
                            <div className="org-id-value">{registeredOrgId}</div>
                        </div>

                        <div style={{
                            background: 'rgba(251,191,36,0.1)',
                            border: '1px solid rgba(251,191,36,0.3)',
                            borderRadius: 8,
                            padding: '10px 13px',
                            fontSize: 11,
                            color: '#fde68a',
                            marginBottom: 16,
                            textAlign: 'left',
                        }}>
                            ⚠️ <strong>Important:</strong> Save this Organization ID. Share it with all users who need to log in.
                        </div>

                        <button className="reg-btn-primary" onClick={() => navigate('/login')}>
                            Go to Login →
                        </button>
                    </div>
                )}

                {/* Footer */}
                {step < 3 && (
                    <p style={{ textAlign: 'center', marginTop: 12, marginBottom: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
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
