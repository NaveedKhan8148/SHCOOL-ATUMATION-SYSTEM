import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, Card, Col, Input, Row, Space,
    Statistic, Table, Typography, Spin, message,
    Avatar, Tag, Progress, Tooltip, Badge
} from 'antd';
import { 
    SaveOutlined, UserOutlined, CalendarOutlined, 
    SearchOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ClockCircleOutlined, TeamOutlined, BookOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const TeacherClassAttendance = () => {
    const { classId } = useParams();
    const [classInfo, setClassInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [existingRecords, setExistingRecords] = useState({});
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const today = dayjs();
    const todayStr = today.format('YYYY-MM-DD');
    const todayLabel = today.format('DD MMM YYYY');

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
            fetchStudents();
            fetchExistingAttendance();
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

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v1/students/class/${classId}`);
            const list = res.data.data || [];
            setStudents(list);
            const init = {};
            list.forEach((s) => { init[s._id] = 'Present'; });
            setAttendance((prev) => ({ ...init, ...prev }));
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingAttendance = async () => {
        try {
            const res = await axios.get(
                `/api/v1/attendance/class/${classId}?date=${todayStr}`
            );
            const records = res.data.data || [];
            const statusMap = {};
            const idMap = {};
            records.forEach((r) => {
                const sid = r.studentId?._id || r.studentId;
                statusMap[sid] = r.status;
                idMap[sid] = r._id;
            });
            setAttendance((prev) => ({ ...prev, ...statusMap }));
            setExistingRecords(idMap);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Failed to fetch existing attendance:', errorMsg);
            // No records yet is fine - continue with default values
        }
    };

    const handleSetStatus = (studentId, status) => {
        setAttendance((prev) => ({ ...prev, [studentId]: status }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const toCreate = [];
            const toUpdate = [];

            students.forEach((s) => {
                const status = attendance[s._id] || 'Present';
                if (existingRecords[s._id]) {
                    toUpdate.push({ id: existingRecords[s._id], status });
                } else {
                    toCreate.push({
                        studentId: s._id,
                        classId,
                        date: todayStr,
                        status,
                    });
                }
            });

            if (toCreate.length > 0) {
                await axios.post('/api/v1/attendance/bulk', { records: toCreate });
            }
            await Promise.all(
                toUpdate.map((r) =>
                    axios.patch(`/api/v1/attendance/${r.id}`, { status: r.status })
                )
            );

            message.success(`Attendance saved for ${todayStr}`);
            fetchExistingAttendance();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleRefresh = () => {
        fetchStudents();
        fetchExistingAttendance();
    };

    // Stats
    const presentCount = Object.values(attendance).filter((v) => v === 'Present').length;
    const absentCount = Object.values(attendance).filter((v) => v === 'Absent').length;
    const lateCount = Object.values(attendance).filter((v) => v === 'Late').length;
    const totalStudents = students.length;
    const attendanceRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;

    // Filtered students
    const filteredStudents = useMemo(() => {
        if (!searchText) return students;
        const q = searchText.toLowerCase();
        return students.filter((s) =>
            s.studentName?.toLowerCase().includes(q) ||
            s.rollNo?.toLowerCase().includes(q)
        );
    }, [students, searchText]);

    // Stats Cards
    const statsCards = [
        {
            title: 'Total Students',
            value: totalStudents,
            icon: <TeamOutlined />,
            color: '#1890ff',
            bgColor: '#e6f7ff',
            subtitle: 'Enrolled in class'
        },
        {
            title: 'Present Today',
            value: presentCount,
            icon: <CheckCircleOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed',
            subtitle: `${attendanceRate}% attendance rate`
        },
        {
            title: 'Absent Today',
            value: absentCount,
            icon: <CloseCircleOutlined />,
            color: '#ff4d4f',
            bgColor: '#fff2f0',
            subtitle: 'Missing students'
        },
        {
            title: 'Late Today',
            value: lateCount,
            icon: <ClockCircleOutlined />,
            color: '#faad14',
            bgColor: '#fff7e6',
            subtitle: 'Arrived late'
        }
    ];

    const columns = [
        {
            title: 'Student',
            key: 'student',
            width: 250,
            render: (_, record) => (
                <Tooltip title={`Roll No: ${record.rollNo}`}>
                    <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                            <div style={{ fontWeight: 500 }}>{record.studentName}</div>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.rollNo}</div>
                        </div>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: 'Date',
            key: 'date',
            width: 120,
            render: () => (
                <Space>
                    <CalendarOutlined style={{ color: '#1890ff' }} />
                    <span>{todayLabel}</span>
                </Space>
            ),
        },
        {
            title: 'Status',
            key: 'action',
            render: (_, record) => (
                <Space size={8} wrap>
                    <Button
                        size="small"
                        type={attendance[record._id] === 'Present' ? 'primary' : 'default'}
                        style={{
                            backgroundColor: attendance[record._id] === 'Present' ? '#52c41a' : undefined,
                            borderColor: '#52c41a',
                            color: attendance[record._id] === 'Present' ? 'white' : '#52c41a'
                        }}
                        onClick={() => handleSetStatus(record._id, 'Present')}
                        icon={<CheckCircleOutlined />}
                    >
                        Present
                    </Button>
                    <Button
                        size="small"
                        type={attendance[record._id] === 'Absent' ? 'primary' : 'default'}
                        style={{
                            backgroundColor: attendance[record._id] === 'Absent' ? '#ff4d4f' : undefined,
                            borderColor: '#ff4d4f',
                            color: attendance[record._id] === 'Absent' ? 'white' : '#ff4d4f'
                        }}
                        onClick={() => handleSetStatus(record._id, 'Absent')}
                        icon={<CloseCircleOutlined />}
                    >
                        Absent
                    </Button>
                    <Button
                        size="small"
                        type={attendance[record._id] === 'Late' ? 'primary' : 'default'}
                        style={{
                            backgroundColor: attendance[record._id] === 'Late' ? '#faad14' : undefined,
                            borderColor: '#faad14',
                            color: attendance[record._id] === 'Late' ? 'white' : '#faad14'
                        }}
                        onClick={() => handleSetStatus(record._id, 'Late')}
                        icon={<ClockCircleOutlined />}
                    >
                        Late
                    </Button>
                </Space>
            ),
        },
        {
            title: 'Saved',
            key: 'saved',
            width: 80,
            render: (_, record) => (
                existingRecords[record._id] ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>Saved</Tag>
                ) : (
                    <Tag color="default" icon={<ClockCircleOutlined />}>Unsaved</Tag>
                )
            ),
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
                    Mark Attendance
                </Title>
                <Text type="secondary">
                    Record today's attendance for <strong>{classInfo?.name || 'Class'}</strong>
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
                                <Text type="secondary" style={{ fontSize: 12 }}>Today's Date</Text>
                                <div style={{ fontWeight: 600 }}>{todayLabel}</div>
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

            {/* Attendance Rate Progress Card */}
            <Card 
                style={{ marginBottom: 24, borderRadius: '10px' }}
                bodyStyle={{ padding: '16px' }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: 8 }}>
                        Today's Attendance Rate
                    </div>
                    <Progress 
                        type="circle" 
                        percent={parseFloat(attendanceRate)} 
                        width={100}
                        strokeColor={attendanceRate >= 75 ? '#52c41a' : attendanceRate >= 50 ? '#faad14' : '#ff4d4f'}
                        format={(percent) => `${percent}%`}
                    />
                    <div style={{ marginTop: 12 }}>
                        <Space>
                            <Tag color="green">Present: {presentCount}</Tag>
                            <Tag color="red">Absent: {absentCount}</Tag>
                            <Tag color="orange">Late: {lateCount}</Tag>
                        </Space>
                    </div>
                </div>
            </Card>

            {/* Filters Card */}
            <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                <Space wrap size="middle" style={{ width: '100%' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Search
                        </div>
                        <Input
                            placeholder="Search by student name or roll number..."
                            prefix={<SearchOutlined />}
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            size="large"
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={handleRefresh}
                            size="large"
                        >
                            Refresh
                        </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button 
                            type="primary" 
                            icon={<SaveOutlined />} 
                            onClick={handleSave}
                            loading={saving}
                            disabled={students.length === 0}
                            size="large"
                        >
                            Save Attendance
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Students Table */}
            <Card style={{ borderRadius: '10px' }}>
                {students.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                        <TeamOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                        <div style={{ fontSize: 16 }}>No students found in this class</div>
                    </div>
                ) : (
                    <Table
                        rowKey="_id"
                        columns={columns}
                        dataSource={filteredStudents}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} students`,
                            pageSizeOptions: ['10', '20', '50'],
                        }}
                        scroll={{ x: 800 }}
                    />
                )}
            </Card>

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
                                Attendance can only be recorded for today. Past records are view-only.
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

export default TeacherClassAttendance;