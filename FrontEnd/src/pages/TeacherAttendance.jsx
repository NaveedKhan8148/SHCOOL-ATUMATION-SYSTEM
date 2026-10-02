import React, { useEffect, useMemo, useState } from 'react';
import { Table, Button, DatePicker, Radio, message, Typography, Space, Select, Spin, Card } from 'antd';
import { SaveOutlined, ReloadOutlined, BookOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const TeacherAttendance = () => {
    const { user, loading: authLoading } = useAuth();
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [existingRecords, setExistingRecords] = useState({});
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [saving, setSaving] = useState(false);

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
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass && selectedSubject && selectedDate) {
            fetchStudentsForClass(selectedClass);
        } else {
            setStudents([]);
            setAttendance({});
            setExistingRecords({});
        }
    }, [selectedClass, selectedSubject, selectedDate]);

    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            const res = await axios.get('/api/v1/classes/');
            setClasses(res.data.data?.classes || res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setLoadingClasses(false);
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
            
            // Fetch existing attendance for this date
            if (selectedDate) {
                fetchExistingAttendance(classId, selectedDate);
            }
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
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

    const handleStatusChange = (studentId, status) => {
        setAttendance((prev) => ({ ...prev, [studentId]: status }));
    };

    const handleSave = async () => {
        if (!selectedClass) {
            message.warning('Please select a class');
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
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    // Get unique subjects from teacher's assigned subjects or from class subjects
    useEffect(() => {
        if (user?.subjects) {
            setSubjects(user.subjects);
        } else {
            // Default subjects if not specified
            setSubjects(['Mathematics', 'Physics', 'Economics', 'Studio', 'Mechanics']);
        }
    }, [user]);

    // Stats
    const presentCount = Object.values(attendance).filter((v) => v === 'Present').length;
    const absentCount = Object.values(attendance).filter((v) => v === 'Absent').length;
    const lateCount = Object.values(attendance).filter((v) => v === 'Late').length;

    const columns = [
        {
            title: 'Roll No',
            dataIndex: 'rollNo',
            key: 'rollNo',
            sorter: (a, b) => (a.rollNo || '').localeCompare(b.rollNo || ''),
        },
        {
            title: 'Student Name',
            dataIndex: 'studentName',
            key: 'studentName',
            sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || ''),
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
                        Present
                    </Radio.Button>
                    <Radio.Button
                        value="Absent"
                        style={{
                            backgroundColor: attendance[record._id] === 'Absent' ? '#ff4d4f' : undefined,
                            borderColor: '#ff4d4f',
                            color: attendance[record._id] === 'Absent' ? 'white' : '#ff4d4f'
                        }}
                    >
                        Absent
                    </Radio.Button>
                    <Radio.Button
                        value="Late"
                        style={{
                            backgroundColor: attendance[record._id] === 'Late' ? '#faad14' : undefined,
                            borderColor: '#faad14',
                            color: attendance[record._id] === 'Late' ? 'white' : '#faad14'
                        }}
                    >
                        Late
                    </Radio.Button>
                </Radio.Group>
            ),
        },
    ];

    if (authLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            <Title level={2}>Mark Attendance</Title>
            <Text type="secondary">
                Record daily attendance for your students
            </Text>

            {/* Filters Card */}
            <Card style={{ marginTop: 16, marginBottom: 16, borderRadius: '10px' }}>
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
                            loading={loadingClasses}
                            allowClear
                        >
                            {classes.map((cls) => (
                                <Select.Option key={cls._id} value={cls._id}>
                                    {cls.name} {cls.section ? `- ${cls.section}` : ''}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    <div style={{ minWidth: 200 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Subject
                        </div>
                        <Select
                            placeholder="Select subject"
                            style={{ width: '100%' }}
                            onChange={(val) => setSelectedSubject(val)}
                            value={selectedSubject}
                            size="large"
                            allowClear
                        >
                            {subjects.map((subj) => (
                                <Select.Option key={subj} value={subj}>
                                    {subj}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    <div style={{ minWidth: 200 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Date
                        </div>
                        <DatePicker
                            value={selectedDate}
                            onChange={(date) => setSelectedDate(date || dayjs())}
                            format="YYYY-MM-DD"
                            size="large"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            loading={saving}
                            disabled={!selectedClass || !selectedSubject}
                            size="large"
                        >
                            Save Attendance
                        </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                if (selectedClass) {
                                    fetchStudentsForClass(selectedClass);
                                }
                            }}
                            disabled={!selectedClass}
                            size="large"
                        >
                            Refresh
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Quick Stats */}
            {students.length > 0 && (
                <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                    <Space size="large">
                        <div>
                            <Text type="secondary">Present</Text>
                            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{presentCount}</div>
                        </div>
                        <div>
                            <Text type="secondary">Absent</Text>
                            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{absentCount}</div>
                        </div>
                        <div>
                            <Text type="secondary">Late</Text>
                            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>{lateCount}</div>
                        </div>
                        <div>
                            <Text type="secondary">Total</Text>
                            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{students.length}</div>
                        </div>
                    </Space>
                </Card>
            )}

            {/* Students Table */}
            <Card style={{ borderRadius: '10px' }}>
                {!selectedClass || !selectedSubject ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                        <UserOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                        <div style={{ fontSize: 16 }}>Please select a class and subject to mark attendance</div>
                    </div>
                ) : students.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                        <UserOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                        <div style={{ fontSize: 16 }}>No students found in this class</div>
                    </div>
                ) : (
                    <Table
                        rowKey="_id"
                        columns={columns}
                        dataSource={students}
                        loading={loadingStudents}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} students`,
                        }}
                    />
                )}
            </Card>
        </div>
    );
};

export default TeacherAttendance;