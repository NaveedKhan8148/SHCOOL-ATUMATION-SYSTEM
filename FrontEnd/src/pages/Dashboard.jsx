import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Typography, Spin, Statistic, Button, Space, Tooltip, Badge, Modal, Form, Input, Select, message } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer, LineChart, Line,
    PieChart, Pie, Cell,
} from 'recharts';
import {
    ReloadOutlined, TeamOutlined, BookOutlined,
    DollarOutlined, WarningOutlined, UserOutlined,
    RiseOutlined, FallOutlined, TrophyOutlined,
    CheckCircleOutlined, CloseCircleOutlined,
    PlusOutlined, MailOutlined, LockOutlined, SaveOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];

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

// Small reusable chart card with loading state
const ChartCard = ({ title, loading, children }) => (
    <Card 
        className="hover-card" 
        title={title}
        style={{ 
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
    >
        {loading ? (
            <div style={{ height: 320, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" />
            </div>
        ) : (
            children
        )}
    </Card>
);

// Stats Card Component
const StatsCard = ({ title, value, icon, color, bgColor, subtitle, loading }) => (
    <Card 
        hoverable 
        style={{ 
            borderTop: `4px solid ${color}`,
            borderRadius: '10px',
            backgroundColor: bgColor,
            height: '100%'
        }}
        loading={loading}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: 500 }}>
                    {title}
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: color }}>
                    {value}
                </div>
                {subtitle && (
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                        {subtitle}
                    </div>
                )}
            </div>
            <div style={{ fontSize: '48px', color: color }}>
                {icon}
            </div>
        </div>
    </Card>
);

const Dashboard = () => {
    // Chart data
    const [attendanceData, setAttendanceData] = useState([]);
    const [semesterData, setSemesterData] = useState([]);
    const [feeData, setFeeData] = useState([]);
    const [distributionData, setDistributionData] = useState([]);

    // Summary stats
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalTeachers, setTotalTeachers] = useState(0);
    const [totalClasses, setTotalClasses] = useState(0);
    const [totalWarnings, setTotalWarnings] = useState(0);

    // Loading flags
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [loadingSemester, setLoadingSemester] = useState(false);
    const [loadingFees, setLoadingFees] = useState(false);
    const [loadingDistribution, setLoadingDistribution] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchAll();
    }, []);

    const handleAddUser = async (values) => {
        setSubmitLoading(true);
        try {
            await axios.post('/api/v1/users/register', {
                email: values.email,
                password: values.password,
                role: values.role
            });
            message.success('User created successfully');
            setIsModalVisible(false);
            form.resetFields();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const fetchAll = () => {
        fetchAttendance();
        fetchSemesters();
        fetchFees();
        fetchDistribution();
        fetchSummaryStats();
    };

    const fetchAttendance = async () => {
        setLoadingAttendance(true);
        try {
            const res = await axios.get('/api/v1/analytics/attendance-by-class');
            setAttendanceData(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Attendance fetch error:', errorMsg);
            setAttendanceData([]);
        } finally {
            setLoadingAttendance(false);
        }
    };

    const fetchSemesters = async () => {
        setLoadingSemester(true);
        try {
            const res = await axios.get('/api/v1/analytics/results-by-semester');
            setSemesterData(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Semester fetch error:', errorMsg);
            setSemesterData([]);
        } finally {
            setLoadingSemester(false);
        }
    };

    const fetchFees = async () => {
        setLoadingFees(true);
        try {
            const res = await axios.get('/api/v1/analytics/fee-collection');
            setFeeData(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Fees fetch error:', errorMsg);
            setFeeData([]);
        } finally {
            setLoadingFees(false);
        }
    };

    const fetchDistribution = async () => {
        setLoadingDistribution(true);
        try {
            const res = await axios.get('/api/v1/analytics/performance-distribution');
            setDistributionData(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Distribution fetch error:', errorMsg);
            setDistributionData([]);
        } finally {
            setLoadingDistribution(false);
        }
    };

    const fetchSummaryStats = async () => {
        setLoadingStats(true);
        try {
            const [students, teachers, classes, warnings] = await Promise.all([
                axios.get('/api/v1/students/'),
                axios.get('/api/v1/teachers/'),
                axios.get('/api/v1/classes/'),
                axios.get('/api/v1/warnings/'),
            ]);
            setTotalStudents(students.data.data?.length || 0);
            setTotalTeachers(teachers.data.data?.length || 0);
            setTotalClasses(classes.data.data?.length || 0);
            setTotalWarnings(warnings.data.data?.length || 0);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Summary stats fetch error:', errorMsg);
            // Silent fail - keep existing values (0)
        } finally {
            setLoadingStats(false);
        }
    };

    const weekKeys = attendanceData.length > 0
        ? Object.keys(attendanceData[0]).filter((k) => k !== 'className')
        : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    const weekColors = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f'];

    const EmptyChart = ({ message = 'No data available yet' }) => (
        <div style={{
            height: 300, display: 'flex', justifyContent: 'center',
            alignItems: 'center', color: '#8c8c8c', flexDirection: 'column', gap: 8,
        }}>
            <div style={{ fontSize: 48 }}>📊</div>
            <div>{message}</div>
        </div>
    );

    // Stats Cards Data
    const statsCards = [
        {
            title: 'Total Students',
            value: totalStudents,
            icon: <TeamOutlined />,
            color: '#1890ff',
            bgColor: '#e6f7ff',
            subtitle: 'Enrolled students'
        },
        {
            title: 'Total Teachers',
            value: totalTeachers,
            icon: <UserOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed',
            subtitle: 'Active faculty'
        },
        {
            title: 'Total Classes',
            value: totalClasses,
            icon: <BookOutlined />,
            color: '#faad14',
            bgColor: '#fff7e6',
            subtitle: 'Active classes'
        },
        {
            title: 'Academic Warnings',
            value: totalWarnings,
            icon: <WarningOutlined />,
            color: '#ff4d4f',
            bgColor: '#fff2f0',
            subtitle: 'Issued warnings'
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <Title level={2} style={{ margin: 0, fontWeight: 600 }}>
                        Academic Analytics Dashboard
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>
                        Institutional summaries for decision support — live data
                    </Text>
                </div>
                <Space>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => setIsModalVisible(true)}
                        size="large"
                        style={{ backgroundColor: '#52c41a' }}
                    >
                        Add User Role
                    </Button>
                    <Button 
                        type="primary" 
                        icon={<ReloadOutlined />} 
                        onClick={fetchAll}
                        size="large"
                    >
                        Refresh All
                    </Button>
                </Space>
            </div>

            {/* Summary Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {statsCards.map((card, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                        <StatsCard {...card} loading={loadingStats} />
                    </Col>
                ))}
            </Row>

            {/* Charts Section */}
            <Row gutter={[16, 16]}>
                {/* Chart 1 — Attendance trends by class */}
                <Col xs={24} lg={12}>
                    <ChartCard title="Attendance Trends by Class (%)" loading={loadingAttendance}>
                        {attendanceData.length === 0 ? (
                            <EmptyChart message="No attendance records found" />
                        ) : (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={attendanceData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="className" />
                                    <YAxis domain={[0, 100]} />
                                    <RechartsTooltip formatter={(val) => `${val}%`} />
                                    <Legend />
                                    {weekKeys.map((key, i) => (
                                        <Bar
                                            key={key}
                                            dataKey={key}
                                            name={key}
                                            fill={weekColors[i % weekColors.length]}
                                            radius={[4, 4, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </Col>

                {/* Chart 2 — Result comparison across semesters */}
                <Col xs={24} lg={12}>
                    <ChartCard title="Result Comparison Across Semesters" loading={loadingSemester}>
                        {semesterData.length === 0 ? (
                            <EmptyChart message="No result records found" />
                        ) : (
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={semesterData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="semester" />
                                    <YAxis yAxisId="left" domain={[0, 100]} />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="avgMarks"
                                        name="Avg Marks"
                                        stroke="#1890ff"
                                        strokeWidth={2}
                                        dot={{ r: 6, fill: '#1890ff' }}
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="passRate"
                                        name="Pass Rate %"
                                        stroke="#52c41a"
                                        strokeWidth={2}
                                        dot={{ r: 6, fill: '#52c41a' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </Col>

                {/* Chart 3 — Fee collection vs pending */}
                <Col xs={24} lg={12}>
                    <ChartCard title="Fee Collection vs Pending Dues (Rs)" loading={loadingFees}>
                        {feeData.length === 0 ? (
                            <EmptyChart message="No fee records found" />
                        ) : (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={feeData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis
                                        tickFormatter={(v) =>
                                            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                                        }
                                    />
                                    <RechartsTooltip
                                        formatter={(val) => `Rs ${Number(val).toLocaleString()}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="collected" name="Collected" fill="#52c41a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="pending" name="Pending" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </Col>

                {/* Chart 4 — Performance distribution */}
                <Col xs={24} lg={12}>
                    <ChartCard title="Performance Distribution" loading={loadingDistribution}>
                        {distributionData.length === 0 || distributionData.every((d) => d.count === 0) ? (
                            <EmptyChart message="No result records found" />
                        ) : (
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        dataKey="count"
                                        nameKey="range"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ range, percent }) =>
                                            `${range} (${(percent * 100).toFixed(0)}%)`
                                        }
                                        labelLine={true}
                                    >
                                        {distributionData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(val, name) => [`${val} students`, name]}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </Col>
            </Row>

            {/* Add Admin Role Modal */}
            <Modal
                title={
                    <Space>
                        <UserOutlined style={{ color: '#1890ff' }} />
                        <span>Add Admin Role</span>
                    </Space>
                }
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                width={500}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={handleAddUser} form={form} autoComplete="off">
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Please enter a valid email' },
                        ]}
                    >
                        <Input 
                            placeholder="e.g. admin@school.edu" 
                            size="large"
                            prefix={<MailOutlined style={{ color: '#8c8c8c' }} />}
                            autoComplete="new-email"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                            { required: true, message: 'Please enter a password' },
                            { min: 6, message: 'Password must be at least 6 characters' }
                        ]}
                    >
                        <Input.Password 
                            placeholder="Enter password" 
                            size="large"
                            prefix={<LockOutlined style={{ color: '#8c8c8c' }} />}
                            autoComplete="new-password"
                        />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select a role' }]}
                    >
                        <Select placeholder="Select a role" size="large">
                            <Select.Option value="ADMIN">ADMIN</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={submitLoading}
                            size="large"
                            icon={<SaveOutlined />}
                        >
                            Create User
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Dashboard;