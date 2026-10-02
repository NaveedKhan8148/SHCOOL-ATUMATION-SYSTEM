import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, DatePicker, Radio, message, Card, Typography,
    Space, Tabs, Row, Col, Statistic, Input, Select, Tag, Spin,
    Badge, Avatar, Tooltip, Progress
} from 'antd';
import {
    SaveOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ReloadOutlined, ClockCircleOutlined, UserOutlined,
    CalendarOutlined, BarChartOutlined, BookOutlined
} from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line, Area, ComposedChart
} from 'recharts';
import dayjs from 'dayjs';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const Attendance = () => {
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [selectedClass, setSelectedClass] = useState(null);
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [existingRecords, setExistingRecords] = useState({});
    const [searchText, setSearchText] = useState('');
    const [saving, setSaving] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Analytics state
    const [analyticsClass, setAnalyticsClass] = useState(null);
    const [analyticsFrom, setAnalyticsFrom] = useState(dayjs().startOf('month'));
    const [analyticsTo, setAnalyticsTo] = useState(dayjs());
    const [analyticsStudents, setAnalyticsStudents] = useState([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [weeklyData, setWeeklyData] = useState([]);

    // Computed stats
    const totalRecords = analyticsStudents.reduce((s, r) => s + r.records.length, 0);
    const totalPresent = analyticsStudents.reduce(
        (s, r) => s + r.records.filter((x) => x.status === 'Present').length, 0
    );
    const totalAbsent = analyticsStudents.reduce(
        (s, r) => s + r.records.filter((x) => x.status === 'Absent').length, 0
    );
    const totalLate = analyticsStudents.reduce(
        (s, r) => s + r.records.filter((x) => x.status === 'Late').length, 0
    );
    const avgAttendance = totalRecords > 0
        ? ((totalPresent / totalRecords) * 100).toFixed(1)
        : 0;

    // Helper function to extract error message from any response format
    const extractErrorMessage = (error) => {
        if (error.response?.data) {
            if (typeof error.response.data === 'object') {
                return error.response.data.message || error.response.data.error || 'Operation failed';
            }
            if (typeof error.response.data === 'string') {
                const htmlMatch = error.response.data.match(/Error:\s*([^<]+)/);
                if (htmlMatch) return htmlMatch[1].trim();
                const preMatch = error.response.data.match(/<pre>Error:\s*([^<]+)<\/pre>/);
                if (preMatch) return preMatch[1].trim();
                if (error.response.data.length < 200) return error.response.data;
            }
        }
        return error.message || 'Operation failed';
    };

    // Effects
    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchStudentsForClass(selectedClass);
        } else {
            setStudents([]);
            setAttendance({});
            setExistingRecords({});
        }
    }, [selectedClass]);

    useEffect(() => {
        if (selectedClass && students.length > 0) {
            fetchExistingAttendance(selectedClass, selectedDate);
        }
    }, [selectedClass, selectedDate, students]);

    useEffect(() => {
        if (analyticsClass) {
            fetchAnalytics();
        }
    }, [analyticsClass, analyticsFrom, analyticsTo]);

    // Fetch helpers
    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/v1/classes/');
            setClasses(res.data.data?.classes || res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const fetchStudentsForClass = async (classId) => {
        setLoadingStudents(true);
        try {
            const res = await axios.get(`/api/v1/students/class/${classId}`);
            const list = res.data.data || [];
            setStudents(list);
            // Reset attendance when loading new class
            const init = {};
            list.forEach((s) => { init[s._id] = 'Present'; });
            setAttendance(init);
            setExistingRecords({});
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setLoadingStudents(false);
        }
    };

    const fetchExistingAttendance = async (classId, date) => {
        if (!classId || students.length === 0) return;
        
        try {
            const dateStr = date.format('YYYY-MM-DD');
            const res = await axios.get(
                `/api/v1/attendance/class/${classId}?date=${dateStr}`
            );
            const records = res.data.data || [];
            
            if (records.length === 0) {
                // No records found for this date - reset to default "Present" for all students
                const init = {};
                students.forEach((s) => { init[s._id] = 'Present'; });
                setAttendance(init);
                setExistingRecords({});
                return;
            }
            
            const statusMap = {};
            const idMap = {};
            records.forEach((r) => {
                const sid = r.studentId?._id || r.studentId;
                statusMap[sid] = r.status;
                idMap[sid] = r._id;
            });
            
            // For students without records, set default to "Present"
            const finalAttendance = {};
            students.forEach((s) => {
                finalAttendance[s._id] = statusMap[s._id] || 'Present';
            });
            
            setAttendance(finalAttendance);
            setExistingRecords(idMap);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            // On error, reset to default "Present" for all students
            const init = {};
            students.forEach((s) => { init[s._id] = 'Present'; });
            setAttendance(init);
            setExistingRecords({});
        }
    };

    const fetchAnalytics = async () => {
        if (!analyticsClass) return;
        setAnalyticsLoading(true);
        try {
            const stuRes = await axios.get(`/api/v1/students/class/${analyticsClass}`);
            const stuList = stuRes.data.data || [];

            const from = analyticsFrom.format('YYYY-MM-DD');
            const to = analyticsTo.format('YYYY-MM-DD');

            const results = await Promise.all(
                stuList.map((s) =>
                    axios
                        .get(`/api/v1/attendance/student/${s._id}?from=${from}&to=${to}`)
                        .then((r) => ({ student: s, records: r.data.data || [] }))
                        .catch(() => ({ student: s, records: [] }))
                )
            );

            setAnalyticsStudents(results);

            // Build chart data grouped by date
            const byDate = {};
            results.forEach(({ records }) => {
                records.forEach((rec) => {
                    const d = dayjs(rec.date).format('MM/DD');
                    if (!byDate[d]) byDate[d] = { name: d, Present: 0, Absent: 0, Late: 0, total: 0 };
                    byDate[d][rec.status] = (byDate[d][rec.status] || 0) + 1;
                    byDate[d].total = (byDate[d].total || 0) + 1;
                });
            });
            
            // Calculate attendance percentage for each day
            const chartData = Object.values(byDate).map(day => ({
                ...day,
                attendanceRate: day.total > 0 ? ((day.Present / day.total) * 100).toFixed(1) : 0
            })).slice(-7);
            
            setWeeklyData(chartData);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // Save attendance
    const handleStatusChange = (studentId, status) => {
        setAttendance((prev) => ({ ...prev, [studentId]: status }));
    };

    const handleSaveAttendance = async () => {
        if (!selectedClass) {
            message.warning('Please select a class first');
            return;
        }
        if (students.length === 0) {
            message.warning('No students found for this class');
            return;
        }

        setSaving(true);
        const dateStr = selectedDate.format('YYYY-MM-DD');

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
                        classId: selectedClass,
                        date: dateStr,
                        status,
                    });
                }
            });

            // Save new records
            if (toCreate.length > 0) {
                await axios.post('/api/v1/attendance/bulk', { records: toCreate });
            }

            // Update existing records
            if (toUpdate.length > 0) {
                await Promise.all(
                    toUpdate.map((r) =>
                        axios.patch(`/api/v1/attendance/${r.id}`, { status: r.status })
                    )
                );
            }

            message.success(`Attendance saved for ${dateStr}`);
            
            // Refresh attendance data after save
            await fetchExistingAttendance(selectedClass, selectedDate);
            
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    const clearFilters = () => {
        setSelectedClass(null);
        setSearchText('');
    };

    // Current attendance stats for the selected date
    const presentCount = Object.values(attendance).filter((v) => v === 'Present').length;
    const absentCount = Object.values(attendance).filter((v) => v === 'Absent').length;
    const lateCount = Object.values(attendance).filter((v) => v === 'Late').length;

    // Table columns with Date column added
    const markColumns = [
        {
            title: 'Date',
            key: 'date',
            width: 120,
            render: () => (
                <Space>
                    <CalendarOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontWeight: 500 }}>{selectedDate.format('YYYY-MM-DD')}</span>
                </Space>
            ),
        },
        {
            title: 'Student',
            key: 'student',
            sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || ''),
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
            title: 'Roll No',
            key: 'rollNo',
            width: 120,
            render: (_, record) => record.rollNo,
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Radio.Group
                    value={attendance[record._id] || 'Present'}
                    onChange={(e) => handleStatusChange(record._id, e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                >
                    <Radio.Button
                        value="Present"
                        style={{
                            backgroundColor: attendance[record._id] === 'Present' ? '#52c41a' : undefined,
                            borderColor: '#52c41a',
                            color: attendance[record._id] === 'Present' ? 'white' : '#52c41a'
                        }}
                    >
                        <CheckCircleOutlined /> Present
                    </Radio.Button>
                    <Radio.Button
                        value="Absent"
                        style={{
                            backgroundColor: attendance[record._id] === 'Absent' ? '#ff4d4f' : undefined,
                            borderColor: '#ff4d4f',
                            color: attendance[record._id] === 'Absent' ? 'white' : '#ff4d4f'
                        }}
                    >
                        <CloseCircleOutlined /> Absent
                    </Radio.Button>
                    <Radio.Button
                        value="Late"
                        style={{
                            backgroundColor: attendance[record._id] === 'Late' ? '#faad14' : undefined,
                            borderColor: '#faad14',
                            color: attendance[record._id] === 'Late' ? 'white' : '#faad14'
                        }}
                    >
                        <ClockCircleOutlined /> Late
                    </Radio.Button>
                </Radio.Group>
            ),
        },
        {
            title: 'Saved Status',
            key: 'saved',
            width: 120,
            render: (_, record) =>
                existingRecords[record._id] ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>Saved</Tag>
                ) : (
                    <Tag color="default" icon={<ClockCircleOutlined />}>Unsaved</Tag>
                ),
        },
    ];

    const analyticsColumns = [
        {
            title: 'Student',
            key: 'name',
            render: (_, record) => (
                <Space>
                    <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                    <span style={{ fontWeight: 500 }}>{record.student.studentName}</span>
                </Space>
            ),
        },
        {
            title: 'Roll No',
            key: 'rollNo',
            render: (_, record) => record.student.rollNo,
        },
        {
            title: 'Present',
            key: 'present',
            render: (_, record) => (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                    {record.records.filter((r) => r.status === 'Present').length}
                </Tag>
            ),
            sorter: (a, b) => {
                const aPresent = a.records.filter((r) => r.status === 'Present').length;
                const bPresent = b.records.filter((r) => r.status === 'Present').length;
                return aPresent - bPresent;
            },
        },
        {
            title: 'Absent',
            key: 'absent',
            render: (_, record) => (
                <Tag color="red" icon={<CloseCircleOutlined />}>
                    {record.records.filter((r) => r.status === 'Absent').length}
                </Tag>
            ),
        },
        {
            title: 'Late',
            key: 'late',
            render: (_, record) => (
                <Tag color="orange" icon={<ClockCircleOutlined />}>
                    {record.records.filter((r) => r.status === 'Late').length}
                </Tag>
            ),
        },
        {
            title: 'Attendance %',
            key: 'percent',
            render: (_, record) => {
                const total = record.records.length;
                const present = record.records.filter((r) => r.status === 'Present').length;
                if (total === 0) return '-';
                const pct = ((present / total) * 100).toFixed(1);
                return (
                    <Tooltip title={`${present} out of ${total} days present`}>
                        <Progress 
                            type="circle" 
                            percent={parseFloat(pct)} 
                            width={50}
                            strokeColor={pct >= 75 ? '#52c41a' : '#ff4d4f'}
                            format={(percent) => `${percent}%`}
                        />
                    </Tooltip>
                );
            },
            sorter: (a, b) => {
                const aTotal = a.records.length;
                const aPresent = a.records.filter((r) => r.status === 'Present').length;
                const aPct = aTotal > 0 ? (aPresent / aTotal) * 100 : 0;
                const bTotal = b.records.length;
                const bPresent = b.records.filter((r) => r.status === 'Present').length;
                const bPct = bTotal > 0 ? (bPresent / bTotal) * 100 : 0;
                return aPct - bPct;
            },
        },
    ];

    const filteredStudents = students.filter((s) => {
        const q = searchText.toLowerCase();
        return (
            !q ||
            s.studentName?.toLowerCase().includes(q) ||
            s.rollNo?.toLowerCase().includes(q)
        );
    });

    // Stats Cards for Analytics
    const analyticsStatsCards = [
        {
            title: 'Average Attendance',
            value: `${avgAttendance}%`,
            icon: <CheckCircleOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed',
            progress: true,
            progressValue: avgAttendance
        },
        {
            title: 'Total Present',
            value: totalPresent,
            icon: <CheckCircleOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed'
        },
        {
            title: 'Total Absent',
            value: totalAbsent,
            icon: <CloseCircleOutlined />,
            color: '#ff4d4f',
            bgColor: '#fff2f0'
        },
        {
            title: 'Total Late',
            value: totalLate,
            icon: <ClockCircleOutlined />,
            color: '#faad14',
            bgColor: '#fff7e6'
        }
    ];

    // Tabs items
    const items = [
        {
            key: '1',
            label: (
                <span>
                    <CheckCircleOutlined /> Mark Attendance
                </span>
            ),
            children: (
                <div>
                    {/* Header */}
                    <div style={{ marginBottom: 24 }}>
                        <Title level={2} style={{ margin: 0 }}>
                            Mark Attendance
                        </Title>
                        <Text type="secondary">
                            Record daily attendance for students
                        </Text>
                    </div>

                    {/* Filters Card */}
                    <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                        <Space wrap size="middle" style={{ width: '100%' }}>
                            <div style={{ minWidth: 200 }}>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                                    <BookOutlined /> Select Class
                                </div>
                                <Select
                                    placeholder="Choose a class"
                                    style={{ width: '100%' }}
                                    onChange={(val) => setSelectedClass(val)}
                                    value={selectedClass}
                                    size="large"
                                >
                                    {classes.map((cls) => (
                                        <Option key={cls._id} value={cls._id}>
                                            {cls.name}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div style={{ minWidth: 200 }}>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                                    <CalendarOutlined /> Select Date
                                </div>
                                <DatePicker
                                    value={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    format="YYYY-MM-DD"
                                    size="large"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                                    Search
                                </div>
                                <Input.Search
                                    placeholder="Search by name or roll number..."
                                    allowClear
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    size="large"
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    onClick={handleSaveAttendance}
                                    loading={saving}
                                    disabled={!selectedClass}
                                    size="large"
                                >
                                    Save Attendance
                                </Button>
                            </div>
                        </Space>
                    </Card>

                    {/* Quick Stats for selected date */}
                    {students.length > 0 && (
                        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                            <Col xs={24} sm={8}>
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
                                                Present on {selectedDate.format('YYYY-MM-DD')}
                                            </div>
                                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                                                {presentCount}
                                            </div>
                                        </div>
                                        <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Card 
                                    hoverable 
                                    style={{ 
                                        borderTop: '4px solid #ff4d4f',
                                        borderRadius: '10px',
                                        backgroundColor: '#fff2f0'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
                                                Absent on {selectedDate.format('YYYY-MM-DD')}
                                            </div>
                                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f' }}>
                                                {absentCount}
                                            </div>
                                        </div>
                                        <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} sm={8}>
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
                                                Late on {selectedDate.format('YYYY-MM-DD')}
                                            </div>
                                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#faad14' }}>
                                                {lateCount}
                                            </div>
                                        </div>
                                        <ClockCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />
                                    </div>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* Students Table */}
                    <Card style={{ borderRadius: '10px' }}>
                        {!selectedClass ? (
                            <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                                <BookOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                                <div style={{ fontSize: 16 }}>Please select a class to mark attendance</div>
                            </div>
                        ) : students.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                                <UserOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                                <div style={{ fontSize: 16 }}>No students found in this class</div>
                            </div>
                        ) : (
                            <Table
                                dataSource={filteredStudents}
                                columns={markColumns}
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) => `Total ${total} students`,
                                    pageSizeOptions: ['10', '20', '50'],
                                }}
                                rowKey="_id"
                                loading={loadingStudents}
                            />
                        )}
                    </Card>
                </div>
            ),
        },
        {
            key: '2',
            label: (
                <span>
                    <BarChartOutlined /> Reports & Analytics
                </span>
            ),
            children: (
                <div>
                    {/* Header */}
                    <div style={{ marginBottom: 24 }}>
                        <Title level={2} style={{ margin: 0 }}>
                            Attendance Analytics
                        </Title>
                        <Text type="secondary">
                            Track attendance trends and student performance
                        </Text>
                    </div>

                    {/* Analytics Filters Card */}
                    <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                        <Space wrap size="middle" style={{ width: '100%' }}>
                            <div style={{ minWidth: 200 }}>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                                    <BookOutlined /> Select Class
                                </div>
                                <Select
                                    placeholder="Choose a class"
                                    style={{ width: '100%' }}
                                    onChange={(val) => setAnalyticsClass(val)}
                                    value={analyticsClass}
                                    size="large"
                                >
                                    {classes.map((cls) => (
                                        <Option key={cls._id} value={cls._id}>
                                            {cls.name}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                                    From Date
                                </div>
                                <DatePicker
                                    value={analyticsFrom}
                                    onChange={(d) => setAnalyticsFrom(d)}
                                    format="YYYY-MM-DD"
                                    size="large"
                                />
                            </div>

                            <div>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                                    To Date
                                </div>
                                <DatePicker
                                    value={analyticsTo}
                                    onChange={(d) => setAnalyticsTo(d)}
                                    format="YYYY-MM-DD"
                                    size="large"
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined />}
                                    onClick={fetchAnalytics}
                                    loading={analyticsLoading}
                                    size="large"
                                >
                                    Load Report
                                </Button>
                            </div>
                        </Space>
                    </Card>

                    {analyticsLoading ? (
                        <div style={{ textAlign: 'center', padding: 60 }}>
                            <Spin size="large" />
                        </div>
                    ) : (
                        <>
                            {/* Analytics Stats Cards */}
                            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                {analyticsStatsCards.map((card, index) => (
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
                                                </div>
                                                {card.progress ? (
                                                    <Progress 
                                                        type="circle" 
                                                        percent={card.progressValue} 
                                                        width={60} 
                                                        strokeColor={card.color}
                                                    />
                                                ) : (
                                                    <div style={{ fontSize: '40px', color: card.color }}>
                                                        {card.icon}
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>

                            {/* Weekly Attendance Trends Chart */}
                            <Card 
                                className="hover-card"
                                title="Weekly Attendance Trends"
                                style={{ marginBottom: 24, borderRadius: '10px' }}
                            >
                                {weeklyData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <ComposedChart data={weeklyData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis yAxisId="left" />
                                            <YAxis yAxisId="right" orientation="right" />
                                            <RechartsTooltip />
                                            <Legend />
                                            <Bar yAxisId="left" dataKey="Present" fill="#52c41a" name="Present" />
                                            <Bar yAxisId="left" dataKey="Absent" fill="#ff4d4f" name="Absent" />
                                            <Bar yAxisId="left" dataKey="Late" fill="#faad14" name="Late" />
                                            <Line 
                                                yAxisId="right" 
                                                type="monotone" 
                                                dataKey="attendanceRate" 
                                                stroke="#1890ff" 
                                                name="Attendance Rate %"
                                                strokeWidth={2}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                                        {analyticsClass
                                            ? 'No attendance records found for the selected period'
                                            : 'Select a class above to view attendance trends'}
                                    </div>
                                )}
                            </Card>

                            {/* Per-student breakdown */}
                            {analyticsStudents.length > 0 && (
                                <Card 
                                    className="hover-card" 
                                    title="Per Student Breakdown"
                                    style={{ borderRadius: '10px' }}
                                >
                                    <Table
                                        dataSource={analyticsStudents}
                                        columns={analyticsColumns}
                                        rowKey={(r) => r.student._id}
                                        pagination={{ 
                                            pageSize: 10,
                                            showSizeChanger: true,
                                            showTotal: (total) => `Total ${total} students`
                                        }}
                                    />
                                </Card>
                            )}

                            {analyticsStudents.length === 0 && analyticsClass && (
                                <Card style={{ borderRadius: '10px' }}>
                                    <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
                                        <BookOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                                        <div>No student data found for the selected class</div>
                                    </div>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <Tabs defaultActiveKey="1" items={items} />
        </div>
    );
};

export default Attendance;