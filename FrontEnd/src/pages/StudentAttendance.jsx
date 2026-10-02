import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Card, Statistic, Row, Col, Tag,
    Typography, Spin, Input, DatePicker, Select,
    Space, Avatar, Progress, Tooltip, Button, Badge
} from 'antd';
import {
    CheckCircleOutlined, CloseCircleOutlined,
    ClockCircleOutlined, SearchOutlined, CalendarOutlined,
    UserOutlined, ReloadOutlined, BookOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAuth } from '../context/AuthContext';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;

const StudentAttendance = () => {
    const { profile, loading: authLoading } = useAuth();
    const [attendance, setAttendance] = useState([]);
    const [loadingAtt, setLoadingAtt] = useState(false);
    const [dateRange, setDateRange] = useState([null, null]);
    const [statusFilter, setStatusFilter] = useState(null);
    const [searchText, setSearchText] = useState('');

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
        if (profile?._id) fetchAttendance(profile._id);
    }, [profile]);

    useEffect(() => {
        if (profile?._id) fetchAttendance(profile._id);
    }, [dateRange]);

    const fetchAttendance = async (studentId) => {
        setLoadingAtt(true);
        try {
            let url = `/api/v1/attendance/student/${studentId}`;
            const params = new URLSearchParams();
            if (dateRange[0]) params.append('from', dateRange[0].format('YYYY-MM-DD'));
            if (dateRange[1]) params.append('to', dateRange[1].format('YYYY-MM-DD'));
            if (params.toString()) url += `?${params.toString()}`;

            const res = await axios.get(url);
            setAttendance(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Attendance fetch error:', errorMsg);
            // Silent fail for student view - don't show error message to avoid confusion
            setAttendance([]);
        } finally {
            setLoadingAtt(false);
        }
    };

    // Filter attendance
    const filteredAttendance = useMemo(() => {
        let filtered = attendance;
        
        if (statusFilter) {
            filtered = filtered.filter((r) => r.status === statusFilter);
        }
        
        if (searchText) {
            filtered = filtered.filter((r) =>
                dayjs(r.date).format('YYYY-MM-DD').includes(searchText) ||
                (r.classId?.name || '').toLowerCase().includes(searchText.toLowerCase())
            );
        }
        
        return filtered;
    }, [attendance, statusFilter, searchText]);

    // Stats
    const total = attendance.length;
    const totalPresent = attendance.filter((r) => r.status === 'Present').length;
    const totalAbsent = attendance.filter((r) => r.status === 'Absent').length;
    const totalLate = attendance.filter((r) => r.status === 'Late').length;
    const attendancePct = total > 0 ? ((totalPresent / total) * 100).toFixed(1) : 0;

    // Stats Cards Data
    const statsCards = [
        {
            title: 'Attendance Rate',
            value: `${attendancePct}%`,
            icon: <CheckCircleOutlined />,
            color: attendancePct >= 75 ? '#52c41a' : '#ff4d4f',
            bgColor: attendancePct >= 75 ? '#f6ffed' : '#fff2f0',
            progress: true,
            progressValue: attendancePct,
            subtitle: attendancePct >= 75 ? 'Good standing' : 'Below requirement'
        },
        {
            title: 'Present Days',
            value: totalPresent,
            icon: <CheckCircleOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed',
            subtitle: `${total} total days`
        },
        {
            title: 'Absent Days',
            value: totalAbsent,
            icon: <CloseCircleOutlined />,
            color: '#ff4d4f',
            bgColor: '#fff2f0',
            subtitle: 'Missed days'
        },
        {
            title: 'Late Arrivals',
            value: totalLate,
            icon: <ClockCircleOutlined />,
            color: '#faad14',
            bgColor: '#fff7e6',
            subtitle: 'Came late'
        }
    ];

    // Table columns
    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (date) => (
                <Tooltip title={dayjs(date).format('dddd')}>
                    <Space>
                        <CalendarOutlined style={{ color: '#1890ff' }} />
                        <span style={{ fontWeight: 500 }}>{dayjs(date).format('YYYY-MM-DD')}</span>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            ({dayjs(date).fromNow()})
                        </Text>
                    </Space>
                </Tooltip>
            ),
            sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Class',
            key: 'class',
            render: (_, record) => (
                <Tag color="cyan" icon={<BookOutlined />}>
                    {record.classId?.name || '-'}
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const config = {
                    'Present': { color: '#52c41a', bgColor: '#f6ffed', icon: <CheckCircleOutlined /> },
                    'Absent': { color: '#ff4d4f', bgColor: '#fff2f0', icon: <CloseCircleOutlined /> },
                    'Late': { color: '#faad14', bgColor: '#fff7e6', icon: <ClockCircleOutlined /> }
                };
                const { color, bgColor, icon } = config[status] || config['Absent'];
                return (
                    <Tag 
                        color={color}
                        style={{ 
                            backgroundColor: bgColor,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontWeight: 500
                        }}
                        icon={icon}
                    >
                        {status}
                    </Tag>
                );
            },
            filters: [
                { text: 'Present', value: 'Present' },
                { text: 'Absent', value: 'Absent' },
                { text: 'Late', value: 'Late' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Time',
            key: 'time',
            render: (_, record) => {
                if (record.status === 'Late') {
                    return <Text type="secondary">Arrived after scheduled time</Text>;
                }
                if (record.status === 'Present') {
                    return <Text type="secondary" style={{ color: '#52c41a' }}>On time</Text>;
                }
                return <Text type="secondary">—</Text>;
            },
        }
    ];

    const clearFilters = () => {
        setDateRange([null, null]);
        setStatusFilter(null);
        setSearchText('');
    };

    if (authLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!profile) {
        return <Text type="danger">Profile not found.</Text>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    My Attendance
                </Title>
                <Text type="secondary">
                    Track your attendance records for <strong>{profile.studentName}</strong> ({profile.rollNo})
                </Text>
            </div>

            {/* Student Info Card */}
            <Card style={{ marginBottom: 24, borderRadius: '10px' }} className="hover-card">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={3} style={{ textAlign: 'center' }}>
                        <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                    </Col>
                    <Col xs={24} sm={21}>
                        <Row gutter={[16, 8]}>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Student Name</Text>
                                <div style={{ fontWeight: 600 }}>{profile.studentName}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Roll Number</Text>
                                <div style={{ fontWeight: 600 }}>{profile.rollNo}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Class</Text>
                                <div style={{ fontWeight: 600 }}>{profile.classId?.name || '-'}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Total Days</Text>
                                <div style={{ fontWeight: 600 }}>{total}</div>
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
                                {card.progress ? (
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

            {/* Filters Card */}
            <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                <Space wrap size="middle" style={{ width: '100%' }}>
                    <div style={{ minWidth: 280 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            <CalendarOutlined /> Date Range
                        </div>
                        <DatePicker.RangePicker
                            style={{ width: '100%' }}
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates || [null, null])}
                            placeholder={['From date', 'To date']}
                            disabledDate={(d) => d && d.isAfter(dayjs())}
                            size="large"
                        />
                    </div>

                    <div style={{ minWidth: 150 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Status
                        </div>
                        <Select
                            placeholder="All Status"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={(val) => setStatusFilter(val)}
                            value={statusFilter}
                            size="large"
                        >
                            <Option value="Present">
                                <CheckCircleOutlined style={{ color: '#52c41a' }} /> Present
                            </Option>
                            <Option value="Absent">
                                <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Absent
                            </Option>
                            <Option value="Late">
                                <ClockCircleOutlined style={{ color: '#faad14' }} /> Late
                            </Option>
                        </Select>
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Search
                        </div>
                        <Input
                            placeholder="Search by date or class..."
                            prefix={<SearchOutlined />}
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            size="large"
                        />
                    </div>

                    {(dateRange[0] || dateRange[1] || statusFilter || searchText) && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={() => fetchAttendance(profile._id)}
                            size="large"
                        >
                            Refresh
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Attendance Table */}
            <Card style={{ borderRadius: '10px' }}>
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={filteredAttendance}
                    loading={loadingAtt}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} records`,
                        pageSizeOptions: ['10', '20', '50'],
                    }}
                    scroll={{ x: 800 }}
                />
            </Card>
        </div>
    );
};

export default StudentAttendance;