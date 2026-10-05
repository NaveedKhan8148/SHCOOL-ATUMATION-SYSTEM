// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Spin, ConfigProvider } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone, RocketOutlined, BookOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const homePath = (role) => {
    switch (role?.toUpperCase()) {
        case 'ADMIN':   return '/dashboard';
        case 'TEACHER': return '/teacher/classes';
        case 'PARENT':  return '/parent/overview';
        case 'STUDENT': return '/student/profile';
        default:        return '/login';
    }
};

const Login = () => {
    const { login, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [redirected, setRedirected] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [bounceCharacter, setBounceCharacter] = useState(false);
    const [showPasswordTip, setShowPasswordTip] = useState(false);
    const [currentCharacter, setCurrentCharacter] = useState(0);

    const characters = ['🧑‍🎓', '👨‍🏫', '📚', '🎓', '✏️', '📖'];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentCharacter((prev) => (prev + 1) % characters.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setBounceCharacter(true);
            setTimeout(() => setBounceCharacter(false), 500);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!authLoading && user && !redirected) {
            const from = location.state?.from?.pathname;
            const dest = from && from !== '/login' ? from : homePath(user.role);
            setRedirected(true);
            navigate(dest, { replace: true });
        }
    }, [user, authLoading, location, navigate, redirected]);

    if (authLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100dvh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <Spin size="large" tip="Loading..." />
            </div>
        );
    }

    if (user) return null;

    const onFinish = async (values) => {
        if (loading) return;
        setLoading(true);
        const result = await login(values.email, values.password, values.organizationId);
        if (result.ok) {
            message.success({ content: '🎉 Login successful! Redirecting...', duration: 2 });
        } else {
            message.error({ content: '😅 ' + (result.message || 'Invalid credentials'), duration: 3 });
            setLoading(false);
        }
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#667eea',
                    borderRadius: 10,
                    controlHeight: 40,
                    fontSize: 13,
                },
            }}
        >
            {/* ── Full-viewport wrapper — NO scroll ─────────────────── */}
            <div style={{
                height: '100dvh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}>

                <style>{`
                    @keyframes bounce {
                        0%, 100% { transform: translateY(0) rotate(0deg); }
                        50% { transform: translateY(-20px) rotate(10deg); }
                    }
                    @keyframes wiggle {
                        0%, 100% { transform: rotate(0deg); }
                        25% { transform: rotate(10deg); }
                        75% { transform: rotate(-10deg); }
                    }
                    @keyframes float {
                        0%, 100% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-14px) rotate(5deg); }
                    }
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateY(30px) scale(0.9); }
                        to   { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes pop {
                        0%   { transform: scale(1); }
                        50%  { transform: scale(1.15); }
                        100% { transform: scale(1); }
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to   { transform: rotate(360deg); }
                    }
                    @keyframes walking {
                        0%   { transform: translateX(-120px); }
                        100% { transform: translateX(calc(100vw + 120px)); }
                    }
                    @keyframes flying {
                        0%   { transform: translateX(-80px) translateY(0); }
                        50%  { transform: translateX(50vw) translateY(-20px); }
                        100% { transform: translateX(calc(100vw + 80px)) translateY(0); }
                    }
                    @keyframes floatAround {
                        0%, 100% { transform: translate(0, 0); }
                        25%  { transform: translate(8px, -12px); }
                        50%  { transform: translate(-4px, -20px); }
                        75%  { transform: translate(12px, -8px); }
                    }
                    @keyframes speechBubblePop {
                        0%   { transform: scale(0); opacity: 0; }
                        80%  { transform: scale(1.1); }
                        100% { transform: scale(1); opacity: 1; }
                    }

                    /* ── Card ──────────────────────────────────────────── */
                    .cartoon-card {
                        background: rgba(255,255,255,0.97) !important;
                        border-radius: 32px !important;
                        box-shadow: 0 16px 48px rgba(0,0,0,0.22),
                                    0 0 0 6px rgba(255,255,255,0.28),
                                    0 0 0 10px rgba(102,126,234,0.18) !important;
                        border: none !important;
                        transition: all 0.3s cubic-bezier(0.68,-0.55,0.265,1.55);
                        animation: slideIn 0.55s cubic-bezier(0.68,-0.55,0.265,1.55);
                        position: relative;
                        z-index: 2;
                    }
                    .cartoon-card:hover { transform: scale(1.01) rotate(0.5deg); }

                    /* ── Inputs ────────────────────────────────────────── */
                    .cartoon-input {
                        border-radius: 50px !important;
                        border: 2px solid #e0e0e0 !important;
                        transition: all 0.25s ease;
                    }
                    .cartoon-input:hover  { border-color: #667eea !important; }
                    .cartoon-input:focus  {
                        border-color: #667eea !important;
                        box-shadow: 0 0 0 4px rgba(102,126,234,0.18) !important;
                    }

                    /* ── Button ────────────────────────────────────────── */
                    .cartoon-button {
                        border-radius: 50px !important;
                        transition: all 0.3s cubic-bezier(0.68,-0.55,0.265,1.55);
                    }
                    .cartoon-button:hover  { transform: scale(1.04) translateY(-2px); }
                    .cartoon-button:active { transform: scale(0.96); }

                    /* ── Decorative elements — pointer-events:none always ─ */
                    .floating-emoji {
                        position: fixed;
                        pointer-events: none;
                        animation: float 3s ease-in-out infinite;
                        z-index: 0;
                    }
                    .walking-animal {
                        position: fixed;
                        bottom: 12px;
                        pointer-events: none;
                        z-index: 1;
                        animation: walking 14s linear infinite;
                        font-size: 28px;
                    }
                    .flying-bird {
                        position: fixed;
                        pointer-events: none;
                        z-index: 1;
                        animation: flying 10s ease-in-out infinite;
                        font-size: 24px;
                    }
                    .character-container {
                        position: fixed;
                        z-index: 3;
                        pointer-events: none;
                    }
                    .speech-bubble {
                        position: absolute;
                        background: white;
                        border-radius: 20px;
                        padding: 7px 14px;
                        white-space: nowrap;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        animation: speechBubblePop 0.3s ease-out;
                        font-weight: 700;
                        font-size: 12px;
                        color: #667eea;
                    }
                    .speech-bubble::after {
                        content: '';
                        position: absolute;
                        bottom: -8px;
                        left: 24px;
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-top: 8px solid white;
                    }
                    .bounce { animation: bounce 0.5s ease-in-out; }

                    /* ── Hide side characters on short screens ─────────── */
                    @media (max-height: 700px) {
                        .character-container { display: none; }
                        .walking-animal      { display: none; }
                        .flying-bird         { display: none; }
                        .floating-emoji      { display: none; }
                    }
                    /* ── Slightly smaller card on very short screens ────── */
                    @media (max-height: 650px) {
                        .cartoon-card .ant-card-body { padding: 16px 20px !important; }
                    }
                `}</style>

                {/* ── Walking animals ── */}
                <div className="walking-animal" style={{ animationDelay:  '0s' }}>🐶</div>
                <div className="walking-animal" style={{ animationDelay: '-5s',  animationDuration: '16s' }}>🐱</div>
                <div className="walking-animal" style={{ animationDelay: '-10s', animationDuration: '18s' }}>🐰</div>

                {/* ── Flying birds ── */}
                <div className="flying-bird" style={{ animationDelay: '0s',  top: '12%' }}>🐦</div>
                <div className="flying-bird" style={{ animationDelay: '-4s', animationDuration: '13s', top: '22%' }}>🕊️</div>

                {/* ── Floating emojis (corners only) ── */}
                <div className="floating-emoji" style={{ top: '6%',  left: '3%',  fontSize: 28, animationDelay: '0s'   }}>🌟</div>
                <div className="floating-emoji" style={{ top: '12%', right: '4%', fontSize: 24, animationDelay: '1s'   }}>⭐</div>
                <div className="floating-emoji" style={{ bottom: '18%', left: '2%',  fontSize: 30, animationDelay: '2s' }}>🎈</div>
                <div className="floating-emoji" style={{ bottom: '24%', right: '3%', fontSize: 26, animationDelay: '0.5s' }}>🎉</div>

                {/* ── Left character ── */}
                <div className="character-container" style={{ left: '4%', top: '50%', transform: 'translateY(-50%)' }}>
                    <div className={bounceCharacter ? 'bounce' : ''} style={{ position: 'relative', textAlign: 'center' }}>
                        <div style={{
                            fontSize: 80,
                            filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.2))',
                            transition: 'all 0.3s ease',
                            animation: 'floatAround 4s ease-in-out infinite',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {characters[currentCharacter]}
                        </div>
                        <div className="speech-bubble" style={{ bottom: 74, left: 14 }}>
                            {currentCharacter === 0 && '📚 Ready to learn?'}
                            {currentCharacter === 1 && '👋 Welcome student!'}
                            {currentCharacter === 2 && "📖 Let's study!"}
                            {currentCharacter === 3 && '🎓 Your future starts here!'}
                            {currentCharacter === 4 && '✏️ Write your success story!'}
                            {currentCharacter === 5 && '📚 Knowledge is power!'}
                        </div>
                    </div>
                </div>

                {/* ── Right character ── */}
                <div className="character-container" style={{ right: '4%', top: '50%', transform: 'translateY(-50%)' }}>
                    <div style={{ position: 'relative', textAlign: 'center', animation: 'floatAround 5s ease-in-out infinite reverse' }}>
                        <div style={{
                            fontSize: 68,
                            filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.2))',
                            cursor: 'default',
                        }}>
                            🤖
                        </div>
                        <div className="speech-bubble" style={{ bottom: 62, left: -6 }}>
                            🤖 Log in to start!
                        </div>
                    </div>
                </div>

                {/* ── Main Card ─────────────────────────────────────── */}
                <Card
                    className="cartoon-card"
                    style={{
                        width: 400,
                        maxWidth: '92vw',
                        border: 'none',
                    }}
                    bodyStyle={{ padding: 'clamp(18px, 3vh, 30px) clamp(20px, 3vw, 32px)' }}
                >
                    {/* Brand */}
                    <div style={{ textAlign: 'center', marginBottom: 'clamp(12px, 2vh, 22px)' }}>
                        <div style={{
                            width:  'clamp(48px, 7vh, 64px)',
                            height: 'clamp(48px, 7vh, 64px)',
                            margin: '0 auto clamp(8px, 1.2vh, 14px)',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 24px -4px rgba(102,126,234,0.45)',
                            animation: 'pop 0.5s ease-out, spin 10s linear infinite',
                            cursor: 'pointer',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.animation = 'wiggle 0.3s ease-in-out'}
                            onMouseLeave={(e) => e.currentTarget.style.animation = 'pop 0.5s ease-out, spin 10s linear infinite'}
                        >
                            <BookOutlined style={{ fontSize: 'clamp(22px, 3.5vh, 30px)', color: 'white' }} />
                        </div>

                        <Title style={{
                            margin: 0,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 800,
                            letterSpacing: '-0.4px',
                            fontSize: 'clamp(1.1rem, 2.8vh, 1.5rem)',
                            lineHeight: 1.25,
                        }}>
                            Education Automation System
                        </Title>

                        <Text style={{
                            display: 'block',
                            marginTop: 'clamp(4px, 0.8vh, 8px)',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 500,
                            fontSize: 'clamp(11px, 1.6vh, 13px)',
                        }}>
                            ⚡ Let's start learning! ⚡
                        </Text>
                    </div>

                    {/* Form */}
                    <Form
                        name="login"
                        onFinish={onFinish}
                        size="middle"
                        initialValues={{ email: 'admin@school.edu', organizationId: '' }}
                        style={{ marginBottom: 0 }}
                    >
                        <Form.Item
                            name="organizationId"
                            style={{ marginBottom: 'clamp(8px, 1.4vh, 14px)' }}
                            rules={[{ required: true, message: 'Please enter your Organization ID 🏫' }]}
                        >
                            <Input
                                prefix={<BankOutlined style={{ color: '#667eea', fontSize: 13 }} />}
                                placeholder="Organization ID 🏫"
                                className="cartoon-input"
                                style={{ height: 'clamp(36px, 5.5vh, 44px)', fontSize: 13 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            style={{ marginBottom: 'clamp(8px, 1.4vh, 14px)' }}
                            rules={[
                                { required: true, message: 'Please enter your email 📧' },
                                { type: 'email', message: 'Please enter a valid email 📧' },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#667eea', fontSize: 13 }} />}
                                placeholder="Email address 📧"
                                className="cartoon-input"
                                style={{ height: 'clamp(36px, 5.5vh, 44px)', fontSize: 13 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            style={{ marginBottom: showPasswordTip ? 'clamp(4px, 1vh, 8px)' : 'clamp(8px, 1.4vh, 14px)' }}
                            rules={[{ required: true, message: 'Please enter your password 🔒' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#667eea', fontSize: 13 }} />}
                                placeholder="Password 🔒"
                                className="cartoon-input"
                                style={{ height: 'clamp(36px, 5.5vh, 44px)', fontSize: 13 }}
                                onFocus={() => setShowPasswordTip(true)}
                                onBlur={() => setShowPasswordTip(false)}
                                iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                            />
                        </Form.Item>

                        {showPasswordTip && (
                            <div style={{
                                textAlign: 'center',
                                marginBottom: 'clamp(6px, 1vh, 10px)',
                                animation: 'pop 0.3s ease-out',
                            }}>
                                <Text style={{ fontSize: 11, color: '#667eea' }}>
                                    🤫 Don't worry, your password is safe with us!
                                </Text>
                            </div>
                        )}

                        {/* Forgot password link */}
                        <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 'clamp(8px,1.2vh,12px)' }}>
                            <Link to="/forgot-password" style={{ color: '#667eea', fontSize: 12, fontWeight: 500 }}>
                                Forgot password?
                            </Link>
                        </div>

                        <Form.Item style={{ marginBottom: 'clamp(6px, 1vh, 10px)' }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                loading={loading}
                                className="cartoon-button"
                                style={{
                                    height: 'clamp(36px, 5.5vh, 44px)',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                }}
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                                icon={!loading && <RocketOutlined />}
                            >
                                {!loading ? "Let's Go! 🚀" : 'Logging in...'}
                            </Button>
                        </Form.Item>

                        <div style={{ textAlign: 'center' }}>
                            <span style={{ color: '#999', fontSize: 12 }}>New school? </span>
                            <Link to="/register-organization" style={{ color: '#667eea', fontWeight: 600, fontSize: 12 }}>
                                Register your organization →
                            </Link>
                        </div>
                    </Form>
                </Card>
            </div>
        </ConfigProvider>
    );
};

export default Login;