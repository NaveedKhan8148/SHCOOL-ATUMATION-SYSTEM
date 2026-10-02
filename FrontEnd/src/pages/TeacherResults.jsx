import React, { useMemo, useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, Tag, Spin, Space, Avatar, Tooltip, Progress } from 'antd';
import { PlusOutlined, ReloadOutlined, BookOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const { Option } = Select;
const { Title, Text } = Typography;

const GRADE_COLOR = {
    'A+': 'green', 'A': 'green',
    'B+': 'blue', 'B': 'blue',
    'C+': 'orange', 'C': 'orange',
    'F': 'red',
};

const GRADE_BG_COLOR = {
    'A+': '#f6ffed', 'A': '#f6ffed',
    'B+': '#e6f7ff', 'B': '#e6f7ff',
    'C+': '#fff7e6', 'C': '#fff7e6',
    'F': '#fff2f0',
};

const calculateGrade = (marks) => {
    const m = Number(marks);
    if (m >= 90) return 'A+';
    if (m >= 85) return 'A';
    if (m >= 80) return 'B+';
    if (m >= 75) return 'B';
    if (m >= 70) return 'C+';
    if (m >= 60) return 'C';
    return 'F';
};

const TeacherResults = () => {
    const { user, profile, loading: authLoading } = useAuth();
    const [results, setResults] = useState([]);
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [form] = Form.useForm();

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

    useEffect(() => {
        fetchClasses();
        fetchStudents();
    }, []);

    useEffect(() => {
        if (selectedClass && selectedSemester) {
            fetchResults();
        } else if (selectedClass) {
            fetchResults();
        } else {
            setResults([]);
        }
    }, [selectedClass, selectedSemester]);

    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/v1/classes/');
            setClasses(res.data.data?.classes || res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/api/v1/students/');
            setStudents(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const fetchResults = async () => {
        setLoading(true);
        try {
            const url = selectedSemester
                ? `/api/v1/results/class/${selectedClass}?semester=${selectedSemester}`
                : `/api/v1/results/class/${selectedClass}`;
            const res = await axios.get(url);
            const enriched = (res.data.data || []).map((r) => ({
                ...r,
                studentName: r.studentId?.studentName || '-',
                rollNo: r.studentId?.rollNo || '-',
                marks: r.marks || 0,
                grade: r.grade || 'F',
            }));
            setResults(enriched);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (values) => {
        setSubmitLoading(true);
        try {
            const marks = Number(values.marks);
            const grade = calculateGrade(marks);
            
            await axios.post('/api/v1/results/', {
                studentId: values.studentId,
                classId: selectedClass,
                subject: values.subject,
                marks: marks,
                grade: grade,
                semester: values.semester,
            });
            
            message.success('Marks saved successfully');
            setOpen(false);
            form.resetFields();
            fetchResults();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    // Filter students by selected class
    const filteredStudents = useMemo(() => {
        if (!selectedClass) return [];
        return students.filter(s => s.classId?._id === selectedClass || s.classId === selectedClass);
    }, [students, selectedClass]);

    // Statistics
    const totalResults = results.length;
    const avgMarks = totalResults > 0
        ? (results.reduce((s, r) => s + (r.marks || 0), 0) / totalResults).toFixed(1)
        : 0;
    const passCount = results.filter((r) => r.grade !== 'F').length;
    const failCount = results.filter((r) => r.grade === 'F').length;
    const passRate = totalResults > 0 ? ((passCount / totalResults) * 100).toFixed(1) : 0;

    const columns = [
        {
            title: 'Student',
            key: 'student',
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
            sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || ''),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            render: (subject) => (
                <Tag color="blue" icon={<BookOutlined />}>
                    {subject}
                </Tag>
            ),
            sorter: (a, b) => (a.subject || '').localeCompare(b.subject || ''),
        },
        {
            title: 'Marks',
            dataIndex: 'marks',
            key: 'marks',
            render: (marks) => (
                <Tooltip title={`${marks}/100`}>
                    <Space>
                        <Progress 
                            type="circle" 
                            percent={marks} 
                            width={40} 
                            strokeColor={marks >= 60 ? '#52c41a' : '#ff4d4f'}
                            format={(percent) => `${percent}`}
                        />
                        <span style={{ fontWeight: 500 }}>{marks}/100</span>
                    </Space>
                </Tooltip>
            ),
            sorter: (a, b) => (a.marks || 0) - (b.marks || 0),
        },
        {
            title: 'Grade',
            dataIndex: 'grade',
            key: 'grade',
            render: (grade) => (
                <Tag 
                    color={GRADE_COLOR[grade] || 'default'}
                    style={{ 
                        backgroundColor: GRADE_BG_COLOR[grade] || '#fafafa',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        padding: '4px 12px',
                        borderRadius: '20px'
                    }}
                >
                    {grade}
                </Tag>
            ),
            filters: Object.keys(GRADE_COLOR).map((g) => ({ text: g, value: g })),
            onFilter: (value, record) => record.grade === value,
        },
        {
            title: 'Semester',
            dataIndex: 'semester',
            key: 'semester',
            render: (semester) => (
                <Tag color="purple">{semester}</Tag>
            ),
            sorter: (a, b) => (a.semester || '').localeCompare(b.semester || ''),
        },
    ];

    // Unique semesters from results
    const semesters = [...new Set(results.map((r) => r.semester))];

    if (authLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            <Title level={2}>Enter Results</Title>
            <Text type="secondary">
                Manage student results and grades for your classes
            </Text>

            {/* Filters */}
            <div style={{ margin: '16px 0', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                <div style={{ minWidth: 200 }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Select Class</div>
                    <Select
                        placeholder="Choose a class"
                        style={{ width: '100%' }}
                        onChange={(val) => setSelectedClass(val)}
                        value={selectedClass}
                        allowClear
                        size="large"
                    >
                        {classes.map((cls) => (
                            <Option key={cls._id} value={cls._id}>
                                {cls.name} {cls.section ? `- ${cls.section}` : ''}
                            </Option>
                        ))}
                    </Select>
                </div>

                <div style={{ minWidth: 200 }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Semester</div>
                    <Select
                        placeholder="Select semester"
                        style={{ width: '100%' }}
                        onChange={(val) => setSelectedSemester(val)}
                        value={selectedSemester}
                        allowClear
                        size="large"
                    >
                        <Option value="Fall-2024">Fall 2024</Option>
                        <Option value="Spring-2024">Spring 2024</Option>
                        <Option value="Fall-2023">Fall 2023</Option>
                        <Option value="Spring-2023">Spring 2023</Option>
                    </Select>
                </div>

                <div>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => setOpen(true)}
                        disabled={!selectedClass}
                        size="large"
                    >
                        Add Marks
                    </Button>
                </div>

                <div>
                    <Button 
                        icon={<ReloadOutlined />} 
                        onClick={fetchResults}
                        disabled={!selectedClass}
                        size="large"
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            {selectedClass && totalResults > 0 && (
                <div style={{ marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div>
                        <Text type="secondary">Total Results</Text>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{totalResults}</div>
                    </div>
                    <div>
                        <Text type="secondary">Average Marks</Text>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: avgMarks >= 75 ? '#52c41a' : '#faad14' }}>
                            {avgMarks}%
                        </div>
                    </div>
                    <div>
                        <Text type="secondary">Pass Rate</Text>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{passRate}%</div>
                    </div>
                    <div>
                        <Text type="secondary">Failed</Text>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{failCount}</div>
                    </div>
                </div>
            )}

            {/* Results Table */}
            {!selectedClass ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                    <BookOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                    <div style={{ fontSize: 16 }}>Select a class to view results</div>
                </div>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <Table 
                    rowKey="_id" 
                    columns={columns} 
                    dataSource={results} 
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} results`,
                    }}
                    scroll={{ x: 800 }}
                />
            )}

            {/* Add Marks Modal */}
            <Modal 
                title="Enter Student Marks" 
                open={open} 
                onCancel={() => {
                    setOpen(false);
                    form.resetFields();
                }} 
                footer={null} 
                destroyOnClose
            >
                <Form layout="vertical" form={form} onFinish={handleAdd}>
                    <Form.Item 
                        name="studentId" 
                        label="Student" 
                        rules={[{ required: true, message: 'Please select a student' }]}
                    >
                        <Select 
                            placeholder="Select student"
                            showSearch
                            optionFilterProp="children"
                            size="large"
                        >
                            {filteredStudents.map((s) => (
                                <Option key={s._id} value={s._id}>
                                    <Space>
                                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                                        <span>{s.studentName}</span>
                                        <Tag color="blue">{s.rollNo}</Tag>
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item 
                        name="subject" 
                        label="Subject" 
                        rules={[{ required: true, message: 'Please enter subject' }]}
                    >
                        <Input placeholder="e.g., Mathematics" size="large" />
                    </Form.Item>

                    <Form.Item 
                        name="marks" 
                        label="Marks (0–100)" 
                        rules={[
                            { required: true, message: 'Please enter marks' },
                            { type: 'number', min: 0, max: 100, message: 'Marks must be between 0 and 100' }
                        ]}
                    >
                        <Input type="number" min={0} max={100} size="large" />
                    </Form.Item>

                    <Form.Item 
                        name="semester" 
                        label="Semester" 
                        rules={[{ required: true, message: 'Please select semester' }]}
                    >
                        <Select placeholder="Select semester" size="large">
                            <Option value="Fall-2024">Fall 2024</Option>
                            <Option value="Spring-2024">Spring 2024</Option>
                            <Option value="Fall-2023">Fall 2023</Option>
                            <Option value="Spring-2023">Spring 2023</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            block 
                            loading={submitLoading}
                            size="large"
                            icon={<CheckCircleOutlined />}
                        >
                            Save Marks
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TeacherResults;