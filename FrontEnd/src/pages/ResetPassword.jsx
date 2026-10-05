// src/pages/ResetPassword.jsx
import React, { useState } from 'react';
import { Form, Input, Button, Typography, ConfigProvider, message } from 'antd';
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const ResetPassword = () => {
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');
    const orgId = searchParams.get('orgId');

    const onFinish = async (values) => {
        if (!token || !orgId) {
            message.error('Invalid or missing reset link. Please request a new one.');
            return;
        }
        if (values.newPassword !== values.confirmPassword) {
            message.error('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/v1/users/reset-password', {
                token,
                organizationId: orgId,
                newPassword: values.newPassword,
            });
            setDone(true);
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
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
                    .rp-card {
                        background: rgba(255,255,255,0.97);
                        border-radius: 24px;
                        box-shadow: 0 16px 48px rgba(0,0,0,0.2),
                                    0 0 0 6px rgba(255,255,255,0.28),
                                    0 0 0 10px rgba(102,126,234,0.18);
                        animation: slideIn 0.5s cubic-bezier(0.68,-0.55,0.265,1.55);
                        position: relative;
                        z-index: 2;
                        width: 400px;
                        max-width: 92vw;
                        padding: clamp(24px,4vh,36px) clamp(24px,3vw,36px);
                    }
                    .rp-input {
                        border-radius: 50px !important;
                        border: 2px solid #e0e0e0 !important;
                        transition: all 0.25s ease;
                    }
                    .rp-input:hover { border-color: #667eea !important; }
                    .rp-input:focus {
                        border-color: #667eea !important;
                        box-shadow: 0 0 0 4px rgba(102,126,234,0.18) !important;
                    }
                    .rp-btn {
                        border-radius: 50px !important;
                        transition: all 0.3s cubic-bezier(0.68,-0.55,0.265,1.55);
                    }
                    .rp-btn:hover  { transform: scale(1.04) translateY(-2px); }
                    .rp-btn:active { transform: scale(0.96); }
                    .fp-orb {
                        position: fixed; border-radius: 50%;
                        filter: blur(80px); pointer-events: none; opacity: 0.4;
                    }
                `}</style>

                {/* Background orbs */}
                <div className="fp-orb" style={{ width: 300, height: 300, background: 'rgba(255,255,255,0.15)', top: '-10%', left: '-8%' }} />
                <div className="fp-orb" style={{ width: 200, height: 200, background: 'rgba(255,255,255,0.1)', bottom: '-8%', right: '-6%' }} />

                <div className="rp-card">
                    {/* Invalid link warning */}
                    {(!token || !orgId) && !done && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 60, height: 60,
                                background: 'linear-gradient(135deg, #ff4d4f, #cf1322)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px',
                                fontSize: 28, color: '#fff',
                            }}>❌</div>
                            <Title style={{ fontSize: 18, color: '#ff4d4f', margin: 0 }}>Invalid Reset Link</Title>
                            <Text style={{ color: '#888', display: 'block', marginTop: 10, marginBottom: 20 }}>
                                This link is invalid or has expired. Please request a new one.
                            </Text>
                            <Link to="/forgot-password">
                                <Button type="primary" block className="rp-btn"
                                    style={{ height: 40, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', fontWeight: 700 }}>
                                    Request New Link
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Form */}
                    {token && orgId && !done && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 'clamp(16px,3vh,24px)' }}>
                                <div style={{
                                    width: 'clamp(48px,7vh,60px)', height: 'clamp(48px,7vh,60px)',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto clamp(10px,1.5vh,14px)',
                                    boxShadow: '0 8px 24px rgba(102,126,234,0.4)',
                                    animation: 'pop 0.5s ease-out',
                                }}>
                                    <LockOutlined style={{ fontSize: 'clamp(20px,3vh,26px)', color: 'white' }} />
                                </div>
                                <Title style={{
                                    margin: 0,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 800,
                                    fontSize: 'clamp(1.1rem, 2.5vh, 1.4rem)',
                                }}>
                                    Set New Password
                                </Title>
                                <Text style={{ color: '#888', fontSize: 12, display: 'block', marginTop: 6 }}>
                                    Choose a strong password — minimum 6 characters.
                                </Text>
                            </div>

                            <Form name="reset-password" onFinish={onFinish} layout="vertical">
                                <Form.Item
                                    name="newPassword"
                                    style={{ marginBottom: 'clamp(10px,1.5vh,14px)' }}
                                    rules={[
                                        { required: true, message: 'Please enter a new password' },
                                        { min: 6, message: 'Password must be at least 6 characters' },
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined style={{ color: '#667eea', fontSize: 13 }} />}
                                        placeholder="New Password 🔒"
                                        className="rp-input"
                                        style={{ height: 'clamp(36px,5.5vh,42px)', fontSize: 13 }}
                                        iconRender={(v) => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="confirmPassword"
                                    style={{ marginBottom: 'clamp(14px,2vh,20px)' }}
                                    rules={[
                                        { required: true, message: 'Please confirm your new password' },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue('newPassword') === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject('Passwords do not match');
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined style={{ color: '#667eea', fontSize: 13 }} />}
                                        placeholder="Confirm Password 🔒"
                                        className="rp-input"
                                        style={{ height: 'clamp(36px,5.5vh,42px)', fontSize: 13 }}
                                        iconRender={(v) => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                                    />
                                </Form.Item>

                                <Form.Item style={{ marginBottom: 'clamp(10px,1.5vh,14px)' }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        block
                                        loading={loading}
                                        className="rp-btn"
                                        style={{
                                            height: 'clamp(36px,5.5vh,42px)',
                                            fontSize: 13, fontWeight: 700,
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            border: 'none',
                                        }}
                                    >
                                        {loading ? 'Resetting...' : '🔐 Reset Password'}
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
                    )}

                    {/* Success state */}
                    {done && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 'clamp(56px,8vh,70px)', height: 'clamp(56px,8vh,70px)',
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
                                Password Reset!
                            </Title>
                            <Text style={{ color: '#666', fontSize: 13, display: 'block', margin: '10px 0 24px', lineHeight: 1.6 }}>
                                Your password has been reset successfully. You can now log in with your new password.
                            </Text>
                            <Button
                                type="primary"
                                block
                                className="rp-btn"
                                onClick={() => navigate('/login')}
                                style={{
                                    height: 40,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none', borderRadius: 50, fontWeight: 700, fontSize: 13,
                                }}
                            >
                                Go to Login 🚀
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </ConfigProvider>
    );
};

export default ResetPassword;
