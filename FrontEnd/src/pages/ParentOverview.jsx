import React, { useState, useEffect } from 'react';
import { Alert, Card, Col, List, Row, Typography, Spin, Tag, Statistic, Avatar, Badge, Progress, Space, Tooltip } from 'antd';
import {
    UserOutlined, BookOutlined, DollarOutlined, WarningOutlined,
    CheckCircleOutlined, CloseCircleOutlined, RiseOutlined,
    FallOutlined, ClockCircleOutlined, CalendarOutlined,
    TeamOutlined, MailOutlined, PhoneOutlined, HomeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axios from 'axios';
import { useChildStudent } from '../hooks/useChildStudent';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const ParentOverview = () => {
    const { child, loading: childLoading, error: childError } = useChildStudent();

    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState({
        attendancePct: null,
        pendingFees: 0,
        avgMarks: null,
        warningCount: 0,
    });
    const [loadingAlerts, setLoadingAlerts] = useState(false);

    // Helper function to extract error message from any response format
    const extractErrorMessage = (error) => {
        // Try to get JSON response
        if (error.response?.data) {
            // If it's a JSON object
            if (typeof error.response.data === 'object') {
                return error.response.data.message || error.response.data.error || 'Operation failed';
            }
            
            // If it's a string (could be HTML or plain text)
            if (typeof error.response.data === 'string') {
                // Try to extract error message from HTML
                const htmlMatch = error.response.data.match(/Error:\s*([^<]+)/);
                if (htmlMatch) {
                    return htmlMatch[1].trim();
                }
                // Try to extract from pre tags
                const preMatch = error.response.data.match(/<pre>Error:\s*([^<]+)<\/pre>/);
                if (preMatch) {
                    return preMatch[1].trim();
                }
                // If it's a short string, return it directly
                if (error.response.data.length < 200) {
                    return error.response.data;
                }
            }
        }
        
        // Fallback to error message
        return error.message || 'Operation failed';
    };

    // Helper function to extract amount from MongoDB Decimal128
    const getAmountValue = (amount) => {
        if (!amount) return 0;
        if (typeof amount === 'number') return amount;
        if (typeof amount === 'string') return parseFloat(amount);
        if (amount && typeof amount === 'object') {
            // Handle MongoDB Decimal128 format
            if (amount.$numberDecimal) return parseFloat(amount.$numberDecimal);
            // Handle other possible formats
            if (amount.value) return parseFloat(amount.value);
        }
        return 0;
    };

    useEffect(() => {
        if (child?._id) {
            buildAlerts(child._id);
        }
    }, [child]);

    const buildAlerts = async (studentId) => {
        setLoadingAlerts(true);
        const newAlerts = [];
        const newStats = { attendancePct: null, pendingFees: 0, avgMarks: null, warningCount: 0 };

        // Attendance
        try {
            const attRes = await axios.get(`/api/v1/attendance/student/${studentId}`);
            const records = attRes.data.data;
            if (records && records.length > 0) {
                const present = records.filter((r) => r.status === 'Present').length;
                const pct = (present / records.length) * 100;
                newStats.attendancePct = pct.toFixed(0);
                if (pct < 75) {
                    newAlerts.push({
                        type: 'warning',
                        title: 'Attendance below threshold',
                        description: `Overall attendance is ${pct.toFixed(0)}% — below the 75% requirement.`,
                    });
                }
            }
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Attendance fetch error:', errorMsg);
            // Silent fail - don't show error to parent
        }

        // Pending fees (single implementation)
        try {
            const feeRes = await axios.get(`/api/v1/fees/student/${studentId}/pending`);
            const pendingFees = feeRes.data.data;
            
            const total = pendingFees.reduce((s, f) => s + getAmountValue(f.amount), 0);
            newStats.pendingFees = total;

            pendingFees.forEach((f) => {
                const feeAmount = getAmountValue(f.amount);
                if (f.dueDate && dayjs().isAfter(dayjs(f.dueDate), 'day')) {
                    newAlerts.push({
                        type: 'error',
                        title: 'Fee overdue',
                        description: `${f.feeType} (Rs ${feeAmount.toLocaleString()}) was due on ${dayjs(f.dueDate).format('YYYY-MM-DD')}.`,
                    });
                }
            });
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Pending fees fetch error:', errorMsg);
            // Silent fail - don't show error to parent
        }

        // Results
        try {
            const resRes = await axios.get(`/api/v1/results/student/${studentId}`);
            const results = resRes.data.data;
            if (results && results.length > 0) {
                const avg = results.reduce((s, r) => s + r.marks, 0) / results.length;
                newStats.avgMarks = avg.toFixed(0);
                if (avg < 60) {
                    newAlerts.push({
                        type: 'warning',
                        title: 'Academic performance concern',
                        description: `Average marks are ${avg.toFixed(0)} — below the 60% passing threshold.`,
                    });
                }
            }
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Results fetch error:', errorMsg);
            // Silent fail - don't show error to parent
        }

        // Academic warnings
        try {
            const warnRes = await axios.get(`/api/v1/warnings/student/${studentId}`);
            const warnings = warnRes.data.data;
            newStats.warningCount = warnings?.length || 0;
            if (warnings && warnings.length > 0) {
                warnings.forEach((w) => {
                    newAlerts.push({
                        type: 'error',
                        title: w.ruleViolated || 'Academic Warning',
                        description: w.detailDescription || 'No details provided',
                    });
                });
            }
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Warnings fetch error:', errorMsg);
            // Silent fail - don't show error to parent
        }

        setAlerts(newAlerts);
        setStats(newStats);
        setLoadingAlerts(false);
    };

    // Stats Cards Data
    const statsCards = [
        {
            title: 'Attendance',
            value: stats.attendancePct !== null ? `${stats.attendancePct}%` : '—',
            icon: <CheckCircleOutlined />,
            color: stats.attendancePct !== null && stats.attendancePct < 75 ? '#ff4d4f' : '#52c41a',
            bgColor: stats.attendancePct !== null && stats.attendancePct < 75 ? '#fff2f0' : '#f6ffed',
            progress: true,
            progressValue: stats.attendancePct || 0,
            subtitle: stats.attendancePct !== null && stats.attendancePct < 75 ? 'Below requirement' : 'Good standing'
        },
        {
            title: 'Average Marks',
            value: stats.avgMarks !== null ? `${stats.avgMarks}/100` : '—',
            icon: <RiseOutlined />,
            color: stats.avgMarks !== null && stats.avgMarks < 60 ? '#ff4d4f' : '#1890ff',
            bgColor: stats.avgMarks !== null && stats.avgMarks < 60 ? '#fff2f0' : '#e6f7ff',
            progress: true,
            progressValue: stats.avgMarks || 0,
            subtitle: stats.avgMarks !== null && stats.avgMarks >= 75 ? 'Excellent' : stats.avgMarks >= 60 ? 'Good' : 'Needs improvement'
        },
        {
            title: 'Pending Fees',
            value: `Rs ${stats.pendingFees.toLocaleString()}`,
            icon: <DollarOutlined />,
            color: stats.pendingFees > 0 ? '#faad14' : '#52c41a',
            bgColor: stats.pendingFees > 0 ? '#fff7e6' : '#f6ffed',
            subtitle: stats.pendingFees > 0 ? 'Payment required' : 'All paid'
        },
        {
            title: 'Warnings',
            value: stats.warningCount,
            icon: <WarningOutlined />,
            color: stats.warningCount > 0 ? '#ff4d4f' : '#52c41a',
            bgColor: stats.warningCount > 0 ? '#fff2f0' : '#f6ffed',
            subtitle: stats.warningCount > 0 ? 'Action required' : 'No warnings'
        }
    ];

    if (childLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (childError || !child) {
        return <Text type="danger">{childError || 'No linked student record found.'}</Text>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Parent Dashboard
                </Title>
                <Text type="secondary">
                    Read-only view for your child's academic information
                </Text>
            </div>

            {/* Student Info Card */}
            <Card 
                style={{ marginBottom: 24, borderRadius: '10px' }}
                className="hover-card"
            >
                <Row gutter={[24, 16]} align="middle">
                    <Col xs={24} sm={4} style={{ textAlign: 'center' }}>
                        <Avatar 
                            size={80} 
                            icon={<UserOutlined />} 
                            style={{ backgroundColor: '#1890ff' }}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Tag color="blue">{child.classId?.name || 'No Class'}</Tag>
                        </div>
                    </Col>
                    <Col xs={24} sm={20}>
                        <Row gutter={[16, 16]}>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Student Name</Text>
                                <div style={{ fontWeight: 600, fontSize: 16 }}>{child.studentName}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Roll Number</Text>
                                <div style={{ fontWeight: 600 }}>{child.rollNo}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Class & Section</Text>
                                <div style={{ fontWeight: 600 }}>{child.classId?.name || '-'}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Date of Joining</Text>
                                <div style={{ fontWeight: 600 }}>
                                    {child.dateOfJoining
                                        ? dayjs(child.dateOfJoining).format('YYYY-MM-DD')
                                        : '-'}
                                </div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Father's Name</Text>
                                <div style={{ fontWeight: 600 }}>{child.fatherName || '-'}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Address</Text>
                                <div style={{ fontWeight: 600 }}>{child.address || '-'}</div>
                            </Col>
                            <Col xs={24}>
                                <Space>
                                    <Tooltip title="Email">
                                        <Tag icon={<MailOutlined />}>Parent Access</Tag>
                                    </Tooltip>
                                    <Tooltip title="Real-time Updates">
                                        <Tag icon={<ClockCircleOutlined />} color="cyan">Live Data</Tag>
                                    </Tooltip>
                                    <Tooltip title="Read-only Mode">
                                        <Tag icon={<BookOutlined />} color="purple">View Only</Tag>
                                    </Tooltip>
                                </Space>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>

            {/* Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {statsCards.map((card, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                        <Card 
                            hoverable 
                            style={{ 
                                borderTop: `4px solid ${card.color}`,
                                borderRadius: '10px',
                                backgroundColor: card.bgColor
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
                                        {card.title}
                                    </div>
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: card.color }}>
                                        {card.value}
                                    </div>
                                    {card.subtitle && (
                                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                            {card.subtitle}
                                        </div>
                                    )}
                                </div>
                                {card.progress && card.title !== 'Pending Fees' && card.title !== 'Warnings' ? (
                                    <Progress 
                                        type="circle" 
                                        percent={card.progressValue} 
                                        width={60} 
                                        strokeColor={card.color}
                                        format={(percent) => `${percent}%`}
                                    />
                                ) : (
                                    <div style={{ fontSize: '48px', color: card.color }}>
                                        {card.icon}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Alerts and Info Section */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                    <Card 
                        className="hover-card" 
                        title={
                            <Space>
                                <WarningOutlined style={{ color: '#faad14' }} />
                                <span>Automatic Alerts & Notifications</span>
                            </Space>
                        }
                        style={{ borderRadius: '10px' }}
                    >
                        {loadingAlerts ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <Spin size="large" />
                            </div>
                        ) : alerts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                                <div style={{ fontSize: 16, color: '#52c41a', fontWeight: 500 }}>All Clear!</div>
                                <Text type="secondary">No active alerts — everything looks good!</Text>
                            </div>
                        ) : (
                            <List
                                dataSource={alerts}
                                renderItem={(item) => (
                                    <List.Item style={{ padding: '8px 0' }}>
                                        <Alert
                                            style={{ width: '100%', borderRadius: '8px' }}
                                            type={item.type}
                                            message={item.title}
                                            description={item.description}
                                            showIcon
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card 
                        className="hover-card" 
                        title={
                            <Space>
                                <TeamOutlined style={{ color: '#1890ff' }} />
                                <span>Transparency & Accountability</span>
                            </Space>
                        }
                        style={{ borderRadius: '10px' }}
                    >
                        <Text style={{ color: '#595959', lineHeight: 1.6 }}>
                            This portal mirrors live institutional data — attendance, results,
                            fees, and timetable — so you can stay informed and collaborate
                            with the school. All data here is read-only for your convenience.
                        </Text>
                        <div style={{ marginTop: 20 }}>
                            <Title level={5} style={{ marginBottom: 12 }}>Available Information</Title>
                            <Space wrap>
                                <Tag color="blue" icon={<CheckCircleOutlined />}>Attendance Records</Tag>
                                <Tag color="green" icon={<RiseOutlined />}>Results & Grades</Tag>
                                <Tag color="orange" icon={<DollarOutlined />}>Fee Details</Tag>
                                <Tag color="red" icon={<WarningOutlined />}>Warnings</Tag>
                                <Tag color="purple" icon={<CalendarOutlined />}>Timetable</Tag>
                            </Space>
                        </div>
                        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f0f5ff', borderRadius: '8px' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                <ClockCircleOutlined /> Last updated: {dayjs().format('YYYY-MM-DD HH:mm:ss')}
                            </Text>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ParentOverview;