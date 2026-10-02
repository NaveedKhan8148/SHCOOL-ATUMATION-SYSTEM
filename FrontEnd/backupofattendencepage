import React, { useState, useEffect } from 'react';
import {
    Table, Button, DatePicker, Radio, message, Card, Typography,
    Space, Tabs, Row, Col, Statistic, Input, Select, Tag, Spin
} from 'antd';
import {
    SaveOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ReloadOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
import axios from 'axios';

const { Title } = Typography;
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

    // ── Analytics state ───────────────────────────────────────────────────────
    const [analyticsClass, setAnalyticsClass] = useState(null);
    const [analyticsFrom, setAnalyticsFrom] = useState(dayjs().startOf('month'));
    const [analyticsTo, setAnalyticsTo] = useState(dayjs());
    const [analyticsStudents, setAnalyticsStudents] = useState([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [weeklyData, setWeeklyData] = useState([]);

    // ── Computed stats ────────────────────────────────────────────────────────
    const totalRecords = analyticsStudents.reduce((s, r) => s + r.records.length, 0);
    const totalPresent = analyticsStudents.reduce(
        (s, r) => s + r.records.filter((x) => x.status === 'Present').length, 0
    );
    const totalAbsent = analyticsStudents.reduce(
        (s, r) => s + r.records.filter((x) => x.status === 'Absent').length, 0
    );
    const avgAttendance = totalRecords > 0
        ? ((totalPresent / totalRecords) * 100).toFixed(1)
        : 0;

    // ── Effects ───────────────────────────────────────────────────────────────
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
        if (selectedClass) {
            fetchExistingAttendance(selectedClass, selectedDate);
        }
    }, [selectedClass, selectedDate]);

    // Auto-load analytics when class or date range changes
    useEffect(() => {
        if (analyticsClass) {
            fetchAnalytics();
        }
    }, [analyticsClass, analyticsFrom, analyticsTo]);

    // ── Fetch helpers ─────────────────────────────────────────────────────────
    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/v1/classes/');
            setClasses(res.data.data);
        } catch (err) {
            message.error('Failed to fetch classes');
        }
    };

    const fetchStudentsForClass = async (classId) => {
        setLoadingStudents(true);
        try {
            const res = await axios.get(`/api/v1/students/class/${classId}`);
            const list = res.data.data;
            setStudents(list);
            const init = {};
            list.forEach((s) => { init[s._id] = 'Present'; });
            setAttendance((prev) => ({ ...init, ...prev }));
        } catch (err) {
            message.error('Failed to fetch students');
        } finally {
            setLoadingStudents(false);
        }
    };

    const fetchExistingAttendance = async (classId, date) => {
        try {
            const dateStr = date.format('YYYY-MM-DD');
            const res = await axios.get(
                `/api/v1/attendance/class/${classId}?date=${dateStr}`
            );
            const records = res.data.data;
            const statusMap = {};
            const idMap = {};
            records.forEach((r) => {
                const sid = r.studentId?._id || r.studentId;
                statusMap[sid] = r.status;
                idMap[sid] = r._id;
            });
            setAttendance((prev) => ({ ...prev, ...statusMap }));
            setExistingRecords(idMap);
        } catch {
            // No existing records for this date is fine
        }
    };

    const fetchAnalytics = async () => {
        if (!analyticsClass) return;
        setAnalyticsLoading(true);
        try {
            const stuRes = await axios.get(`/api/v1/students/class/${analyticsClass}`);
            const stuList = stuRes.data.data;

            const from = analyticsFrom.format('YYYY-MM-DD');
            const to = analyticsTo.format('YYYY-MM-DD');

            const results = await Promise.all(
                stuList.map((s) =>
                    axios
                        .get(`/api/v1/attendance/student/${s._id}?from=${from}&to=${to}`)
                        .then((r) => ({ student: s, records: r.data.data }))
                        .catch(() => ({ student: s, records: [] }))
                )
            );

            setAnalyticsStudents(results);

            // Build chart data grouped by date (last 7 days)
            const byDate = {};
            results.forEach(({ records }) => {
                records.forEach((rec) => {
                    const d = dayjs(rec.date).format('MM/DD');
                    if (!byDate[d]) byDate[d] = { name: d, Present: 0, Absent: 0, Late: 0 };
                    byDate[d][rec.status] = (byDate[d][rec.status] || 0) + 1;
                });
            });
            setWeeklyData(Object.values(byDate).slice(-7));
        } catch (err) {
            message.error('Failed to fetch analytics');
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // ── Save attendance ───────────────────────────────────────────────────────
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

            if (toCreate.length > 0) {
                await axios.post('/api/v1/attendance/bulk', { records: toCreate });
            }

            await Promise.all(
                toUpdate.map((r) =>
                    axios.patch(`/api/v1/attendance/${r.id}`, { status: r.status })
                )
            );

            message.success(`Attendance saved for ${dateStr}`);
            fetchExistingAttendance(selectedClass, selectedDate);
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    // ── Table columns ─────────────────────────────────────────────────────────
    const markColumns = [
        {
            title: 'Roll No',
            dataIndex: 'rollNo',
            key: 'rollNo',
        },
        {
            title: 'Student Name',
            dataIndex: 'studentName',
            key: 'studentName',
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
                        style={
                            attendance[record._id] === 'Present'
                                ? { backgroundColor: '#52c41a', borderColor: '#52c41a' }
                                : {}
                        }
                    >
                        Present
                    </Radio.Button>
                    <Radio.Button
                        value="Absent"
                        style={
                            attendance[record._id] === 'Absent'
                                ? { backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }
                                : {}
                        }
                    >
                        Absent
                    </Radio.Button>
                    <Radio.Button
                        value="Late"
                        style={
                            attendance[record._id] === 'Late'
                                ? { backgroundColor: '#faad14', borderColor: '#faad14' }
                                : {}
                        }
                    >
                        Late
                    </Radio.Button>
                </Radio.Group>
            ),
        },
        {
            title: 'Saved',
            key: 'saved',
            render: (_, record) =>
                existingRecords[record._id] ? (
                    <Tag color="green">Saved</Tag>
                ) : (
                    <Tag color="default">Unsaved</Tag>
                ),
        },
    ];

    const analyticsColumns = [
        {
            title: 'Student Name',
            key: 'name',
            render: (_, record) => record.student.studentName,
        },
        {
            title: 'Roll No',
            key: 'rollNo',
            render: (_, record) => record.student.rollNo,
        },
        {
            title: 'Present',
            key: 'present',
            render: (_, record) =>
                record.records.filter((r) => r.status === 'Present').length,
        },
        {
            title: 'Absent',
            key: 'absent',
            render: (_, record) =>
                record.records.filter((r) => r.status === 'Absent').length,
        },
        {
            title: 'Late',
            key: 'late',
            render: (_, record) =>
                record.records.filter((r) => r.status === 'Late').length,
        },
        {
            title: 'Attendance %',
            key: 'percent',
            render: (_, record) => {
                const total = record.records.length;
                const present = record.records.filter((r) => r.status === 'Present').length;
                if (total === 0) return '-';
                const pct = ((present / total) * 100).toFixed(1);
                return <Tag color={pct >= 75 ? 'green' : 'red'}>{pct}%</Tag>;
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

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const items = [
        {
            key: '1',
            label: 'Mark Attendance',
            children: (
                <div>
                    {/* Controls */}
                    <Card style={{ marginBottom: 16 }}>
                        <Space wrap size="middle">
                            <div>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                                    Select Class
                                </div>
                                <Select
                                    placeholder="Select class"
                                    style={{ width: 200 }}
                                    onChange={(val) => setSelectedClass(val)}
                                    value={selectedClass}
                                >
                                    {classes.map((cls) => (
                                        <Option key={cls._id} value={cls._id}>
                                            {cls.name}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                                    Select Date
                                </div>
                                <DatePicker
                                    value={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    format="YYYY-MM-DD"
                                    disabledDate={(d) => d && d.isAfter(dayjs())}
                                />
                            </div>

                            <div style={{ paddingTop: 20 }}>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    onClick={handleSaveAttendance}
                                    loading={saving}
                                    disabled={!selectedClass}
                                >
                                    Save Attendance
                                </Button>
                            </div>
                        </Space>
                    </Card>

                    {/* Search */}
                    <div style={{ marginBottom: 12 }}>
                        <Input.Search
                            placeholder="Search by name or roll no..."
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 300 }}
                        />
                    </div>

                    {/* Quick stats for current session */}
                    {students.length > 0 && (
                        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                            <Col xs={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Present"
                                        value={
                                            Object.values(attendance).filter((v) => v === 'Present').length
                                        }
                                        valueStyle={{ color: '#52c41a' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Absent"
                                        value={
                                            Object.values(attendance).filter((v) => v === 'Absent').length
                                        }
                                        valueStyle={{ color: '#ff4d4f' }}
                                        prefix={<CloseCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Late"
                                        value={
                                            Object.values(attendance).filter((v) => v === 'Late').length
                                        }
                                        valueStyle={{ color: '#faad14' }}
                                        prefix={<ClockCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    )}

                    <Card className="hover-card">
                        {!selectedClass ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
                                Please select a class to mark attendance
                            </div>
                        ) : (
                            <Table
                                dataSource={filteredStudents}
                                columns={markColumns}
                                pagination={{
                                    pageSize: 15,
                                    showTotal: (t) => `Total ${t} students`,
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
            label: 'Reports & Analytics',
            children: (
                <div>
                    {/* Analytics filters */}
                    <Card style={{ marginBottom: 16 }}>
                        <Space wrap size="middle">
                            <div>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                                    Class
                                </div>
                                <Select
                                    placeholder="Select class"
                                    style={{ width: 200 }}
                                    onChange={(val) => setAnalyticsClass(val)}
                                    value={analyticsClass}
                                >
                                    {classes.map((cls) => (
                                        <Option key={cls._id} value={cls._id}>
                                            {cls.name}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                                    From
                                </div>
                                <DatePicker
                                    value={analyticsFrom}
                                    onChange={(d) => setAnalyticsFrom(d)}
                                    format="YYYY-MM-DD"
                                />
                            </div>

                            <div>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                                    To
                                </div>
                                <DatePicker
                                    value={analyticsTo}
                                    onChange={(d) => setAnalyticsTo(d)}
                                    format="YYYY-MM-DD"
                                />
                            </div>

                            <div style={{ paddingTop: 20 }}>
                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined />}
                                    onClick={fetchAnalytics}
                                    loading={analyticsLoading}
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
                            {/* Summary stats */}
                            <Row gutter={16} style={{ marginBottom: 24 }}>
                                <Col xs={24} sm={8}>
                                    <Card className="hover-card">
                                        <Statistic
                                            title="Average Attendance"
                                            value={avgAttendance}
                                            valueStyle={{ color: '#3f8600' }}
                                            prefix={<CheckCircleOutlined />}
                                            suffix="%"
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <Card className="hover-card">
                                        <Statistic
                                            title="Total Absences"
                                            value={totalAbsent}
                                            valueStyle={{ color: '#cf1322' }}
                                            prefix={<CloseCircleOutlined />}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <Card className="hover-card">
                                        <Statistic
                                            title="Total Present"
                                            value={totalPresent}
                                            valueStyle={{ color: '#52c41a' }}
                                            prefix={<CheckCircleOutlined />}
                                        />
                                    </Card>
                                </Col>
                            </Row>

                            {/* Weekly Attendance Trends — always visible */}
                            <Card
                                className="hover-card"
                                title="Weekly Attendance Trends"
                                style={{ marginBottom: 24 }}
                            >
                                {weeklyData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={weeklyData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="Present" fill="#52c41a" />
                                            <Bar dataKey="Absent"  fill="#ff4d4f" />
                                            <Bar dataKey="Late"    fill="#faad14" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
                                        {analyticsClass
                                            ? 'No attendance records found for the selected period'
                                            : 'Select a class above to view attendance trends'}
                                    </div>
                                )}
                            </Card>

                            {/* Per-student breakdown */}
                            {analyticsStudents.length > 0 && (
                                <Card className="hover-card" title="Per Student Breakdown">
                                    <Table
                                        dataSource={analyticsStudents}
                                        columns={analyticsColumns}
                                        rowKey={(r) => r.student._id}
                                        pagination={{ pageSize: 10 }}
                                    />
                                </Card>
                            )}

                            {analyticsStudents.length === 0 && (
                                <div style={{ textAlign: 'center', padding: 20, color: '#8c8c8c' }}>
                                    {analyticsClass
                                        ? 'No student data found for the selected class'
                                        : 'Select a class above to view the per-student breakdown'}
                                </div>
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