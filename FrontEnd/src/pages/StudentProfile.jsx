import React from 'react';
import { Card, Descriptions, Typography, Spin, Tag, Avatar, Row, Col, Statistic, Space, Badge, Tooltip } from 'antd';
import { 
    UserOutlined, MailOutlined, BookOutlined, CalendarOutlined, 
    HomeOutlined, CheckCircleOutlined, CloseCircleOutlined,
    IdcardOutlined, TeamOutlined, PhoneOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const StudentProfile = () => {
    const { profile, loading, user } = useAuth();

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!profile) {
        return <Text type="danger">Profile not found.</Text>;
    }

    // Safe access to nested properties
    const studentName = profile?.studentName || 'Not provided';
    const rollNo = profile?.rollNo || 'N/A';
    const className = profile?.classId?.name || 'No Class Assigned';
    const email = profile?.userId?.email || user?.email || 'Not provided';
    const phoneNumber = profile?.phoneNumber || 'Not provided';
    const address = profile?.address || 'Not provided';
    const dateOfJoining = profile?.dateOfJoining;
    const createdAt = profile?.createdAt;
    const studentId = profile?._id;
    const userStatus = user?.status || 'ACTIVE';
    
    // Calculate account age
    const accountAge = createdAt ? dayjs(createdAt).fromNow() : null;
    const isActive = userStatus === 'ACTIVE';

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    My Profile
                </Title>
                <Text type="secondary">
                    View your personal and academic information
                </Text>
            </div>

            {/* Profile Header Card */}
            <Card 
                style={{ marginBottom: 24, borderRadius: '10px' }}
                className="hover-card"
            >
                <Row gutter={[24, 16]} align="middle">
                    <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
                        <Avatar
                            size={100}
                            icon={<UserOutlined />}
                            style={{ backgroundColor: '#1890ff', marginBottom: 12 }}
                        />
                        <div>
                            <Badge 
                                status={isActive ? 'success' : 'error'}
                                text={isActive ? 'Active Account' : 'Inactive Account'}
                            />
                        </div>
                    </Col>
                    <Col xs={24} sm={18}>
                        <Row gutter={[16, 8]}>
                            <Col xs={24}>
                                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                                    {studentName}
                                </div>
                                <Space wrap>
                                    <Tag color="blue" icon={<IdcardOutlined />}>
                                        {rollNo}
                                    </Tag>
                                    <Tag color="cyan" icon={<BookOutlined />}>
                                        {className}
                                    </Tag>
                                    {accountAge && (
                                        <Tag color="purple" icon={<CalendarOutlined />}>
                                            Joined {accountAge}
                                        </Tag>
                                    )}
                                </Space>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Email Address</Text>
                                <div style={{ fontWeight: 500 }}>
                                    <MailOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                    {email}
                                </div>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Phone Number</Text>
                                <div style={{ fontWeight: 500 }}>
                                    <PhoneOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                    {phoneNumber}
                                </div>
                            </Col>
                            <Col xs={24}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Address</Text>
                                <div style={{ fontWeight: 500 }}>
                                    <HomeOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                    {address}
                                </div>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>

            {/* Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        hoverable 
                        style={{ 
                            borderTop: '4px solid #1890ff',
                            borderRadius: '10px',
                            backgroundColor: '#e6f7ff'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
                                    Student ID
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                                    {studentId ? studentId.slice(-8) : 'N/A'}
                                </div>
                            </div>
                            <IdcardOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        hoverable 
                        style={{ 
                            borderTop: '4px solid #52c41a',
                            borderRadius: '10px',
                            backgroundColor: '#f6ffed'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
                                    Class & Section
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                                    {className}
                                </div>
                            </div>
                            <TeamOutlined style={{ fontSize: '40px', color: '#52c41a' }} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        hoverable 
                        style={{ 
                            borderTop: '4px solid #faad14',
                            borderRadius: '10px',
                            backgroundColor: '#fff7e6'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
                                    Date of Joining
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#faad14' }}>
                                    {dateOfJoining
                                        ? dayjs(dateOfJoining).format('YYYY-MM-DD')
                                        : '-'}
                                </div>
                            </div>
                            <CalendarOutlined style={{ fontSize: '40px', color: '#faad14' }} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        hoverable 
                        style={{ 
                            borderTop: `4px solid ${isActive ? '#52c41a' : '#ff4d4f'}`,
                            borderRadius: '10px',
                            backgroundColor: isActive ? '#f6ffed' : '#fff2f0'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
                                    Account Status
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: isActive ? '#52c41a' : '#ff4d4f' }}>
                                    {userStatus}
                                </div>
                            </div>
                            {isActive ? (
                                <CheckCircleOutlined style={{ fontSize: '40px', color: '#52c41a' }} />
                            ) : (
                                <CloseCircleOutlined style={{ fontSize: '40px', color: '#ff4d4f' }} />
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Detailed Information Card */}
            <Card 
                title={
                    <Space>
                        <UserOutlined style={{ color: '#1890ff' }} />
                        <span>Detailed Information</span>
                    </Space>
                }
                style={{ borderRadius: '10px' }}
            >
                <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }} labelStyle={{ fontWeight: 600 }}>
                    <Descriptions.Item label="Full Name" labelStyle={{ backgroundColor: '#fafafa' }}>
                        <Space>
                            <UserOutlined style={{ color: '#1890ff' }} />
                            {studentName}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Roll Number" labelStyle={{ backgroundColor: '#fafafa' }}>
                        <Tag color="blue">{rollNo}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Email" labelStyle={{ backgroundColor: '#fafafa' }}>
                        <Space>
                            <MailOutlined style={{ color: '#1890ff' }} />
                            {email}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Class" labelStyle={{ backgroundColor: '#fafafa' }}>
                        <Tag color="cyan" icon={<BookOutlined />}>
                            {className}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Date of Joining" labelStyle={{ backgroundColor: '#fafafa' }}>
                        <Space>
                            <CalendarOutlined style={{ color: '#faad14' }} />
                            {dateOfJoining
                                ? dayjs(dateOfJoining).format('YYYY-MM-DD')
                                : '-'}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Account Created" labelStyle={{ backgroundColor: '#fafafa' }}>
                        <Tooltip title={createdAt ? dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}>
                            <Space>
                                <CalendarOutlined style={{ color: '#1890ff' }} />
                                {createdAt ? dayjs(createdAt).format('YYYY-MM-DD') : '-'}
                            </Space>
                        </Tooltip>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone Number" labelStyle={{ backgroundColor: '#fafafa' }}>
                        <Space>
                            <PhoneOutlined style={{ color: '#1890ff' }} />
                            {phoneNumber}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Address" span={2} labelStyle={{ backgroundColor: '#fafafa' }}>
                        <Space>
                            <HomeOutlined style={{ color: '#1890ff' }} />
                            {address}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Account Status" span={2} labelStyle={{ backgroundColor: '#fafafa' }}>
                        <Badge 
                            status={isActive ? 'success' : 'error'}
                            text={isActive ? 'Active - You can access all features' : 'Inactive - Please contact administrator'}
                        />
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* Footer Note */}
            <Card 
                style={{ marginTop: 16, borderRadius: '10px', backgroundColor: '#f0f5ff' }}
                bodyStyle={{ padding: '12px 16px' }}
            >
                <Text type="secondary" style={{ fontSize: 12 }}>
                    <CheckCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    This information is read-only. For any changes or corrections, please contact the school administration.
                </Text>
            </Card>
        </div>
    );
};

export default StudentProfile;