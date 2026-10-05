// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Form, Input, Button, Typography, ConfigProvider, message } from 'antd';
import { MailOutlined, BankOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const ForgotPassword = () => {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await axios.post('/api/v1/users/forgot-password', {
                email: values.email,
                organizationId: values.organizationId,
            });
            setSent(true);
        } catch (err) {
            message.error(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
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
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateY(24px) scale(0.96); }
                        to   { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes pop {
                        0%   { transform: scale(1); }
                        50%  { transform: scale(1.12); }
                        100% { transform: scale(1); }
                    }
                    .fp-card {
                        background: rgba(255,255,255,0.97);
                        border-radius: 24px;
                        box-shadow: 0 16px 48px rgba(0,0,0,0.2),
                                    0 0 0 6px rgba(255,255,255,0.28),
                                    0 0 0 10px rgba(102,126,234,0.18);
                        border: none;
                        animation: slideIn 0.5s cubic-bezier(0.68,-0.55,0.265,1.55);
                        position: relative;
                        z-index: 2;
                        width: 400px;
                        max-width: 92vw;
                        padding: clamp(24px,4vh,36px) clamp(24px,3vw,36px);
                    }
                    .fp-input {
                        border-radius: 50px !important;
                        border: 2px solid #e0e0e0 !important;
                        transition: all 0.25s ease;
                    }
                    .fp-input:hover { border-color: #667eea !important; }
                    .fp-input:focus {
                        border-color: #667eea !important;
                        box-shadow: 0 0 0 4px rgba(102,126,234,0.18) !important;
                    }
                    .fp-btn {
                        border-radius: 50px !important;
                        transition: all 0.3s cubic-bezier(0.68,-0.55,0.265,1.55);
                    }
                    .fp-btn:hover { transform: scale(1.04) translateY(-2px); }
                    .fp-btn:active { transform: scale(0.96); }
                    /* floating decorative orbs */
                    .fp-orb {
                        position: fixed;
                        border-radius: 50%;
                        filter: blur(80px);
                        pointer-events: none;
                        opacity: 0.4;
                    }
                `}</style>

                {/* Background orbs */}
                <div className="fp-orb" style={{ width: 300, height: 300, background: 'rgba(255,255,255,0.15)', top: '-10%', left: '-8%' }} />
                <div className="fp-orb" style={{ width: 200, height: 200, background: 'rgba(255,255,255,0.1)', bottom: '-8%', right: '-6%' }} />

                <div className="fp-card">
                    {!sent ? (
                        <>
                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: 'clamp(16px,3vh,24px)' }}>
                                <div style={{
                                    width: 'clamp(48px,7vh,60px)',
                                    height: 'clamp(48px,7vh,60px)',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto clamp(10px,1.5vh,14px)',
                                    boxShadow: '0 8px 24px rgba(102,126,234,0.4)',
                                    animation: 'pop 0.5s ease-out',
                                }}>
                                    <MailOutlined style={{ fontSize: 'clamp(20px,3vh,26px)', color: 'white' }} />
                                </div>
                                <Title style={{
                                    margin: 0,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 800,
                                    fontSize: 'clamp(1.1rem, 2.5vh, 1.4rem)',
                                    lineHeight: 1.2,
                                }}>
                                    Forgot Password?
                                </Title>
                                <Text style={{ color: '#888', fontSize: 'clamp(11px,1.5vh,13px)', display: 'block', marginTop: 6 }}>
                                    Enter your details and we'll send a reset link to your email.
                                </Text>
                            </div>

                            {/* Form */}
                            <Form name="forgot-password" onFinish={onFinish} layout="vertical">
                                <Form.Item
                                    name="organizationId"
                                    style={{ marginBottom: 'clamp(10px,1.5vh,14px)' }}
                                    rules={[{ required: true, message: 'Please enter your Organization ID 🏫' }]}
                                >
                                    <Input
                                        prefix={<BankOutlined style={{ color: '#667eea', fontSize: 13 }} />}
                                        placeholder="Organization ID 🏫"
                                        className="fp-input"
                                        style={{ height: 'clamp(36px,5.5vh,42px)', fontSize: 13 }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="email"
                                    style={{ marginBottom: 'clamp(14px,2vh,20px)' }}
                                    rules={[
                                        { required: true, message: 'Please enter your email 📧' },
                                        { type: 'email', message: 'Enter a valid email address' },
                                    ]}
                                >
                                    <Input
                                        prefix={<MailOutlined style={{ color: '#667eea', fontSize: 13 }} />}
                                        placeholder="Registered email address 📧"
                                        className="fp-input"
                                        style={{ height: 'clamp(36px,5.5vh,42px)', fontSize: 13 }}
                                    />
                                </Form.Item>

                                <Form.Item style={{ marginBottom: 'clamp(10px,1.5vh,14px)' }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        block
                                        loading={loading}
                                        className="fp-btn"
                                        style={{
                                            height: 'clamp(36px,5.5vh,42px)',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            border: 'none',
                                        }}
                                    >
                                        {loading ? 'Sending...' : 'Send Reset Link 📧'}
                                    </Button>
                                </Form.Item>

                                <div style={{ textAlign: 'center' }}>
                                    <Link to="/login" style={{ color: '#667eea', fontWeight: 600, fontSize: 12 }}>
                                        <ArrowLeftOutlined style={{ marginRight: 4 }} />
                                        Back to Login
                                    </Link>
                                </div>
                            </Form>
                        </>
                    ) : (
                        /* ── Success state ── */
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 'clamp(56px,8vh,70px)',
                                height: 'clamp(56px,8vh,70px)',
                                background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto clamp(14px,2vh,20px)',
                                boxShadow: '0 8px 24px rgba(82,196,26,0.4)',
                                animation: 'pop 0.5s ease-out',
                            }}>
                                <CheckCircleOutlined style={{ fontSize: 'clamp(26px,4vh,34px)', color: 'white' }} />
                            </div>
                            <Title style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: 800,
                                fontSize: 'clamp(1rem, 2.2vh, 1.3rem)',
                                margin: 0,
                            }}>
                                Check Your Email!
                            </Title>
                            <Text style={{ color: '#666', fontSize: 13, display: 'block', margin: '10px 0 24px', lineHeight: 1.6 }}>
                                We've sent a password reset link to your email address. The link will expire in <strong>1 hour</strong>.
                            </Text>
                            <div style={{
                                background: '#f0f7ff',
                                borderRadius: 10,
                                padding: '10px 14px',
                                fontSize: 12,
                                color: '#667eea',
                                marginBottom: 20,
                                textAlign: 'left',
                            }}>
                                💡 <strong>Tip:</strong> Check your spam/junk folder if you don't see the email within a few minutes.
                            </div>
                            <Link to="/login">
                                <Button
                                    type="primary"
                                    block
                                    className="fp-btn"
                                    style={{
                                        height: 40,
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none',
                                        borderRadius: 50,
                                        fontWeight: 700,
                                        fontSize: 13,
                                    }}
                                >
                                    <ArrowLeftOutlined /> Back to Login
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </ConfigProvider>
    );
};

export default ForgotPassword;
