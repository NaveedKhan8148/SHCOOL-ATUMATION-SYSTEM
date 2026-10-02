import React, { useState, useEffect } from 'react';
import {
    Typography, Spin, Card, Table, Tag, Select, Row, Col,
    Space, Avatar, Button, Tooltip, message
} from 'antd';
import {
    BookOutlined, ClockCircleOutlined, UserOutlined,
    EnvironmentOutlined, AppstoreOutlined, TableOutlined,
    ReloadOutlined, CalendarOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Subject color mapping
const SUBJECT_COLORS = {
    'Mathematics': '#1890ff',
    'Physics': '#52c41a',
    'Chemistry': '#faad14',
    'Biology': '#eb2f96',
    'English': '#722ed1',
    'Urdu': '#13c2c2',
    'Computer Science': '#2f54eb',
    'Economics': '#fa8c16',
    'History': '#a0d911',
    'Geography': '#389e0d',
};

const TeacherClassTimetable = () => {
    const { classId } = useParams();
    const [timetable, setTimetable] = useState([]);
    const [classInfo, setClassInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('grid'); // Default to 'grid'

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

    useEffect(() => {
        if (classId) {
            fetchClassInfo();
            fetchTimetable();
        }
    }, [classId]);

    const fetchClassInfo = async () => {
        try {
            const res = await axios.get(`/api/v1/classes/${classId}`);
            setClassInfo(res.data.data);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Failed to fetch class info:', errorMsg);
        }
    };

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v1/timetable/class/${classId}`);
            setTimetable(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
            setTimetable([]);
        } finally {
            setLoading(false);
        }
    };

    // Statistics
    const totalEntries = timetable.length;
    const uniqueSubjects = new Set(timetable.map(t => t.subject)).size;
    const uniqueTeachers = new Set(timetable.map(t => t.teacherId?._id)).size;

    // Weekly Grid Component - Previous better design
    const WeeklyGrid = () => (
        <Row gutter={[16, 16]}>
            {DAY_ORDER.map((day) => {
                const dayEntries = timetable
                    .filter((t) => t.dayOfWeek === day)
                    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

                return (
                    <Col xs={24} sm={12} lg={8} xl={4} key={day}>
                        <Card
                            size="small"
                            title={
                                <span style={{ fontWeight: 700 }}>
                                    <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                    {day}
                                </span>
                            }
                            style={{ 
                                minHeight: 200, 
                                borderRadius: '10px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                            }}
                            headStyle={{ 
                                backgroundColor: '#f0f5ff', 
                                borderBottom: '2px solid #1890ff',
                                borderRadius: '10px 10px 0 0'
                            }}
                        >
                            {dayEntries.length === 0 ? (
                                <div style={{ 
                                    color: '#bbb', 
                                    fontSize: 12, 
                                    textAlign: 'center', 
                                    paddingTop: 30,
                                    paddingBottom: 30
                                }}>
                                    <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                                    No classes scheduled
                                </div>
                            ) : (
                                dayEntries.map((entry) => (
                                    <div
                                        key={entry._id}
                                        style={{
                                            background: SUBJECT_COLORS[entry.subject] ? `${SUBJECT_COLORS[entry.subject]}10` : '#e6f7ff',
                                            borderLeft: `4px solid ${SUBJECT_COLORS[entry.subject] || '#1890ff'}`,
                                            borderRadius: 8,
                                            padding: '10px 12px',
                                            marginBottom: 10,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, color: SUBJECT_COLORS[entry.subject] || '#1890ff', marginBottom: 6 }}>
                                            <BookOutlined style={{ marginRight: 6 }} />
                                            {entry.subject}
                                        </div>
                                        <div style={{ color: '#555', marginBottom: 4 }}>
                                            <ClockCircleOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                                            {entry.timeSlot}
                                        </div>
                                        <div style={{ color: '#666', marginBottom: 4 }}>
                                            <UserOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                                            {entry.teacherId?.name || '-'}
                                        </div>
                                        <div style={{ color: '#888' }}>
                                            <EnvironmentOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                                            {entry.roomLocation}
                                        </div>
                                    </div>
                                ))
                            )}
                        </Card>
                    </Col>
                );
            })}
        </Row>
    );

    // Table Columns
    const tableColumns = [
        {
            title: 'Day',
            dataIndex: 'dayOfWeek',
            key: 'dayOfWeek',
            sorter: (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
            render: (day) => <Tag color="blue" icon={<BookOutlined />}>{day}</Tag>,
        },
        {
            title: 'Time Slot',
            dataIndex: 'timeSlot',
            key: 'timeSlot',
            render: (time) => <Tag icon={<ClockCircleOutlined />}>{time}</Tag>,
            sorter: (a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || ''),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            render: (subject) => (
                <Tag color={SUBJECT_COLORS[subject] || '#1890ff'} icon={<BookOutlined />}>
                    {subject}
                </Tag>
            ),
            sorter: (a, b) => (a.subject || '').localeCompare(b.subject || ''),
        },
        {
            title: 'Teacher',
            key: 'teacher',
            render: (_, record) => (
                <Space>
                    <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                    <span>{record.teacherId?.name || '-'}</span>
                </Space>
            ),
        },
        {
            title: 'Room',
            dataIndex: 'roomLocation',
            key: 'roomLocation',
            render: (room) => (
                <Tag icon={<EnvironmentOutlined />}>{room}</Tag>
            ),
        },
    ];

    // Stats Cards
    const statsCards = [
        {
            title: 'Total Classes',
            value: totalEntries,
            icon: <BookOutlined />,
            color: '#1890ff',
            bgColor: '#e6f7ff',
            subtitle: 'Weekly sessions'
        },
        {
            title: 'Unique Subjects',
            value: uniqueSubjects,
            icon: <BookOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed',
            subtitle: 'Subjects taught'
        },
        {
            title: 'Teachers',
            value: uniqueTeachers,
            icon: <UserOutlined />,
            color: '#faad14',
            bgColor: '#fff7e6',
            subtitle: 'Assigned teachers'
        },
        {
            title: 'Total Hours',
            value: totalEntries * 1,
            icon: <ClockCircleOutlined />,
            color: '#722ed1',
            bgColor: '#f9f0ff',
            subtitle: 'Weekly hours'
        },
    ];

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Class Timetable
                </Title>
                <Text type="secondary">
                    Weekly schedule for <strong>{classInfo?.name || 'Class'}</strong>
                </Text>
            </div>

            {/* Class Info Card */}
            <Card style={{ marginBottom: 24, borderRadius: '10px' }} className="hover-card">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={3} style={{ textAlign: 'center' }}>
                        <Avatar size={64} icon={<BookOutlined />} style={{ backgroundColor: '#1890ff' }} />
                    </Col>
                    <Col xs={24} sm={21}>
                        <Row gutter={[16, 8]}>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Class Name</Text>
                                <div style={{ fontWeight: 600 }}>{classInfo?.name || '-'}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Section</Text>
                                <div style={{ fontWeight: 600 }}>{classInfo?.section || '-'}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Academic Year</Text>
                                <div style={{ fontWeight: 600 }}>{classInfo?.academicYear || '-'}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Total Classes</Text>
                                <div style={{ fontWeight: 600 }}>{totalEntries}</div>
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
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: card.color }}>
                                        {card.value}
                                    </div>
                                    {card.subtitle && (
                                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                            {card.subtitle}
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '48px', color: card.color }}>
                                    {card.icon}
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* View Selector */}
            <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                <Space wrap size="middle" style={{ width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            View Mode
                        </div>
                        <Select 
                            value={view} 
                            onChange={setView} 
                            style={{ width: 160 }}
                            size="large"
                        >
                            <Option value="grid">
                                <AppstoreOutlined /> Weekly Grid
                            </Option>
                            <Option value="table">
                                <TableOutlined /> Table View
                            </Option>
                        </Select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={fetchTimetable}
                            size="large"
                        >
                            Refresh
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Timetable Content */}
            {timetable.length === 0 ? (
                <Card style={{ borderRadius: '10px' }}>
                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                        <BookOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                        <div style={{ fontSize: 16 }}>No timetable entries found for this class</div>
                        <Text type="secondary">Please contact administrator to create a timetable</Text>
                    </div>
                </Card>
            ) : (
                <>
                    {view === 'grid' && <WeeklyGrid />}
                    {view === 'table' && (
                        <Card style={{ borderRadius: '10px' }}>
                            <Table 
                                rowKey="_id" 
                                columns={tableColumns} 
                                dataSource={timetable} 
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) => `Total ${total} entries`,
                                    pageSizeOptions: ['10', '20', '50'],
                                }}
                                scroll={{ x: 800 }}
                            />
                        </Card>
                    )}
                </>
            )}

            {/* Footer Note */}
            <Card 
                style={{ marginTop: 16, borderRadius: '10px', backgroundColor: '#f0f5ff' }}
                bodyStyle={{ padding: '12px 16px' }}
            >
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space>
                            <ClockCircleOutlined style={{ color: '#1890ff' }} />
                            <Text type="secondary">
                                Timetable is read-only. For changes, please contact the administrator.
                            </Text>
                        </Space>
                    </Col>
                    <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Last updated: {dayjs().format('HH:mm:ss')}
                        </Text>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default TeacherClassTimetable;