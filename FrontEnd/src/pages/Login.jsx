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
    
    // Change character periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentCharacter((prev) => (prev + 1) % characters.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Bounce character periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setBounceCharacter(true);
            setTimeout(() => setBounceCharacter(false), 500);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Handle redirect when user is authenticated
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
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <Spin size="large" tip="Loading..." />
            </div>
        );
    }

    if (user) {
        return null;
    }

    const onFinish = async (values) => {
        if (loading) return;
        
        setLoading(true);
        const result = await login(values.email, values.password, values.organizationId);
        
        if (result.ok) {
            message.success({
                content: '🎉 Login successful! Redirecting...',
                duration: 2,
                style: { marginTop: '20vh' }
            });
        } else {
            message.error({
                content: '😅 ' + (result.message || 'Invalid credentials'),
                duration: 3,
                style: { marginTop: '20vh' }
            });
            setLoading(false);
        }
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#667eea',
                    borderRadius: 12,
                    controlHeight: 48,
                },
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                
                <style>
                    {`
                        @keyframes bounce {
                            0%, 100% { transform: translateY(0) rotate(0deg); }
                            50% { transform: translateY(-30px) rotate(10deg); }
                        }
                        
                        @keyframes wiggle {
                            0%, 100% { transform: rotate(0deg); }
                            25% { transform: rotate(10deg); }
                            75% { transform: rotate(-10deg); }
                        }
                        
                        @keyframes float {
                            0%, 100% { transform: translateY(0px) rotate(0deg); }
                            50% { transform: translateY(-20px) rotate(5deg); }
                        }
                        
                        @keyframes slideIn {
                            from {
                                opacity: 0;
                                transform: translateY(50px) scale(0.8);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0) scale(1);
                            }
                        }
                        
                        @keyframes pop {
                            0% { transform: scale(1); }
                            50% { transform: scale(1.2); }
                            100% { transform: scale(1); }
                        }
                        
                        @keyframes shake {
                            0%, 100% { transform: translateX(0); }
                            25% { transform: translateX(-8px); }
                            75% { transform: translateX(8px); }
                        }
                        
                        @keyframes floatLeftRight {
                            0%, 100% { transform: translateX(0); }
                            50% { transform: translateX(30px); }
                        }
                        
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                        
                        @keyframes walking {
                            0% { transform: translateX(-150px) translateY(0px); }
                            100% { transform: translateX(calc(100vw + 150px)) translateY(0px); }
                        }
                        
                        @keyframes flying {
                            0% { transform: translateX(-100px) translateY(0px); }
                            50% { transform: translateY(-30px); }
                            100% { transform: translateX(calc(100vw + 100px)) translateY(0px); }
                        }
                        
                        .cartoon-card {
                            background: rgba(255, 255, 255, 0.95);
                            border-radius: 60px 60px 60px 60px;
                            box-shadow: 0 20px 40px rgba(0,0,0,0.2), 
                                        0 0 0 8px rgba(255,255,255,0.3),
                                        0 0 0 12px rgba(102,126,234,0.2);
                            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                            animation: slideIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                            position: relative;
                            z-index: 2;
                        }
                        
                        .cartoon-card:hover {
                            transform: scale(1.02) rotate(1deg);
                        }
                        
                        .cartoon-input {
                            border-radius: 50px !important;
                            transition: all 0.3s ease;
                            border: 3px solid #e0e0e0 !important;
                        }
                        
                        .cartoon-input:hover {
                            transform: scale(1.02);
                            border-color: #667eea !important;
                        }
                        
                        .cartoon-input:focus {
                            transform: scale(1.02);
                            border-color: #667eea !important;
                            box-shadow: 0 0 0 5px rgba(102,126,234,0.2) !important;
                        }
                        
                        .cartoon-button {
                            border-radius: 50px !important;
                            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                        }
                        
                        .cartoon-button:hover {
                            transform: scale(1.05) translateY(-3px);
                        }
                        
                        .cartoon-button:active {
                            transform: scale(0.95);
                        }
                        
                        .floating-emoji {
                            position: absolute;
                            animation: float 3s ease-in-out infinite;
                            pointer-events: none;
                        }
                        
                        .bounce {
                            animation: bounce 0.5s ease-in-out;
                        }
                        
                        .walking-animal {
                            position: absolute;
                            bottom: 20px;
                            animation: walking 12s linear infinite;
                            font-size: 40px;
                            pointer-events: none;
                            z-index: 1;
                        }
                        
                        .flying-bird {
                            position: absolute;
                            top: 20px;
                            animation: flying 8s ease-in-out infinite;
                            font-size: 35px;
                            pointer-events: none;
                            z-index: 1;
                        }
                        
                        .character-container {
                            position: absolute;
                            bottom: -80px;
                            left: -100px;
                            z-index: 3;
                            pointer-events: none;
                        }
                        
                        @keyframes speechBubblePop {
                            0% { transform: scale(0); opacity: 0; }
                            80% { transform: scale(1.1); }
                            100% { transform: scale(1); opacity: 1; }
                        }
                        
                        .speech-bubble {
                            position: absolute;
                            background: white;
                            border-radius: 30px;
                            padding: 10px 18px;
                            white-space: nowrap;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                            animation: speechBubblePop 0.3s ease-out;
                            font-weight: bold;
                            color: #667eea;
                        }
                        
                        .speech-bubble::after {
                            content: '';
                            position: absolute;
                            bottom: -10px;
                            left: 30px;
                            width: 0;
                            height: 0;
                            border-left: 10px solid transparent;
                            border-right: 10px solid transparent;
                            border-top: 10px solid white;
                        }
                        
                        @keyframes floatAround {
                            0%, 100% { transform: translate(0, 0); }
                            25% { transform: translate(10px, -15px); }
                            50% { transform: translate(-5px, -25px); }
                            75% { transform: translate(15px, -10px); }
                        }
                    `}
                </style>

                {/* Walking animals at the bottom */}
                <div className="walking-animal" style={{ animationDelay: '0s' }}>🐶</div>
                <div className="walking-animal" style={{ animationDelay: '-4s', animationDuration: '14s' }}>🐱</div>
                <div className="walking-animal" style={{ animationDelay: '-8s', animationDuration: '16s' }}>🐭</div>
                <div className="walking-animal" style={{ animationDelay: '-12s', animationDuration: '18s' }}>🐹</div>
                <div className="walking-animal" style={{ animationDelay: '-3s', animationDuration: '15s' }}>🐰</div>
                <div className="walking-animal" style={{ animationDelay: '-7s', animationDuration: '17s' }}>🦊</div>

                {/* Flying birds at the top */}
                <div className="flying-bird" style={{ animationDelay: '0s', top: '15%' }}>🐦</div>
                <div className="flying-bird" style={{ animationDelay: '-3s', animationDuration: '10s', top: '25%' }}>🕊️</div>
                <div className="flying-bird" style={{ animationDelay: '-6s', animationDuration: '12s', top: '10%' }}>🦜</div>
                <div className="flying-bird" style={{ animationDelay: '-2s', animationDuration: '9s', top: '30%' }}>🐧</div>

                {/* Floating emojis */}
                <div className="floating-emoji" style={{ top: '5%', left: '3%', animationDelay: '0s', fontSize: '35px' }}>🌟</div>
                <div className="floating-emoji" style={{ top: '15%', right: '5%', animationDelay: '1s', fontSize: '30px' }}>⭐</div>
                <div className="floating-emoji" style={{ bottom: '20%', left: '2%', animationDelay: '2s', fontSize: '40px' }}>🎈</div>
                <div className="floating-emoji" style={{ bottom: '30%', right: '3%', animationDelay: '0.5s', fontSize: '35px' }}>🎉</div>
                <div className="floating-emoji" style={{ top: '40%', left: '1%', animationDelay: '1.5s', fontSize: '25px' }}>✨</div>
                <div className="floating-emoji" style={{ top: '60%', right: '2%', animationDelay: '2.5s', fontSize: '38px' }}>🌸</div>
                <div className="floating-emoji" style={{ top: '75%', left: '4%', animationDelay: '3s', fontSize: '28px' }}>🌈</div>
                <div className="floating-emoji" style={{ top: '85%', right: '6%', animationDelay: '1.8s', fontSize: '32px' }}>🍎</div>

                {/* Cartoon Character OUTSIDE the form - positioned on the left side */}
                <div className="character-container" style={{ left: '5%', top: '50%', transform: 'translateY(-50%)' }}>
                    <div className={bounceCharacter ? 'bounce' : ''} style={{
                        position: 'relative',
                        textAlign: 'center',
                    }}>
                        {/* Main character */}
                        <div style={{ 
                            fontSize: '120px', 
                            filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.2))',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            animation: 'floatAround 4s ease-in-out infinite'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {characters[currentCharacter]}
                        </div>
                        
                        {/* Speech bubble */}
                        <div className="speech-bubble" style={{ bottom: '100px', left: '20px' }}>
                            {currentCharacter === 0 && "📚 Ready to learn?"}
                            {currentCharacter === 1 && "👋 Welcome student!"}
                            {currentCharacter === 2 && "📖 Let's study!"}
                            {currentCharacter === 3 && "🎓 Your future starts here!"}
                            {currentCharacter === 4 && "✏️ Write your success story!"}
                            {currentCharacter === 5 && "📚 Knowledge is power!"}
                        </div>
                    </div>
                </div>

                {/* Second character on the right side */}
                <div className="character-container" style={{ right: '5%', left: 'auto', top: '50%', transform: 'translateY(-50%)' }}>
                    <div style={{
                        position: 'relative',
                        textAlign: 'center',
                        animation: 'floatAround 5s ease-in-out infinite reverse',
                    }}>
                        <div style={{ 
                            fontSize: '100px', 
                            filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.2))',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.animation = 'wiggle 0.3s ease-in-out';
                            setTimeout(() => e.currentTarget.style.animation = '', 300);
                        }}
                        >
                            🤖
                        </div>
                        
                        {/* Speech bubble for robot */}
                        <div className="speech-bubble" style={{ bottom: '90px', left: '-10px', whiteSpace: 'nowrap' }}>
                            🤖 Log in to start!
                        </div>
                    </div>
                </div>

                {/* Main Login Card */}
                <Card 
                    className="cartoon-card"
                    style={{ 
                        width: 480, 
                        maxWidth: '90%',
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.98)',
                    }}
                    bodyStyle={{ padding: '48px 40px' }}
                >
                    {/* Logo/Brand Section with cartoon animation */}
                    <div style={{ 
                        textAlign: 'center', 
                        marginBottom: 40,
                    }}>
                        <div style={{
                            width: 90,
                            height: 90,
                            margin: '0 auto 20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 15px 35px -8px rgba(102, 126, 234, 0.4)',
                            animation: 'pop 0.5s ease-out, spin 10s linear infinite',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.animation = 'wiggle 0.3s ease-in-out'}
                        onMouseLeave={(e) => e.currentTarget.style.animation = 'pop 0.5s ease-out, spin 10s linear infinite'}
                        >
                            <BookOutlined style={{ fontSize: 45, color: 'white' }} />
                        </div>
                        
                        <Title level={2} style={{ 
                            marginBottom: 8,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 800,
                            letterSpacing: '-0.5px',
                            fontSize: '32px',
                        }}>
                            Education Automation System
                        </Title>
                        <Text type="secondary" style={{ 
                            fontSize: 14, 
                            display: 'block', 
                            marginTop: 8,
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 500,
                        }}>
                            ⚡ Let's start learning! ⚡
                        </Text>
                    </div>

                    <Form
                        name="login"
                        onFinish={onFinish}
                        size="large"
                        initialValues={{ email: 'admin@school.edu', organizationId: '' }}
                    >
                        <Form.Item
                            name="organizationId"
                            rules={[
                                { required: true, message: 'Please enter your Organization ID 🏫' },
                            ]}
                        >
                            <Input 
                                prefix={<BankOutlined style={{ color: '#667eea', fontSize: '18px' }} />} 
                                placeholder="Organization ID 🏫"
                                className="cartoon-input"
                                style={{ 
                                    height: 52,
                                    fontSize: '16px',
                                }}
                            />
                        </Form.Item>
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Please enter your email 📧' },
                                { type: 'email', message: 'Please enter a valid email 📧' }
                            ]}
                        >
                            <Input 
                                prefix={<UserOutlined style={{ color: '#667eea', fontSize: '18px' }} />} 
                                placeholder="Email address 📧"
                                className="cartoon-input"
                                style={{ 
                                    height: 52,
                                    fontSize: '16px',
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Please enter your password 🔒' }]}
                        >
                            <Input.Password 
                                prefix={<LockOutlined style={{ color: '#667eea', fontSize: '18px' }} />} 
                                placeholder="Password 🔒"
                                className="cartoon-input"
                                style={{ 
                                    height: 52,
                                    fontSize: '16px',
                                }}
                                onFocus={() => setShowPasswordTip(true)}
                                onBlur={() => setShowPasswordTip(false)}
                                iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                            />
                        </Form.Item>

                        {showPasswordTip && (
                            <div style={{
                                textAlign: 'center',
                                marginTop: '-15px',
                                marginBottom: '15px',
                                animation: 'pop 0.3s ease-out',
                            }}>
                                <Text style={{ fontSize: '12px', color: '#667eea' }}>
                                    🤫 Don't worry, your password is safe with us!
                                </Text>
                            </div>
                        )}

                        <Form.Item>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                block 
                                loading={loading}
                                className="cartoon-button"
                                style={{
                                    height: 52,
                                    fontSize: 18,
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                }}
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                                icon={!loading && <RocketOutlined />}
                            >
                                {!loading ? 'Let\'s Go! 🚀' : 'Logging in...'}
                            </Button>
                        </Form.Item>
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <span style={{ color: '#999', fontSize: 14 }}>New school? </span>
                            <Link to="/register-organization" style={{ color: '#667eea', fontWeight: 600, fontSize: 14 }}>
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