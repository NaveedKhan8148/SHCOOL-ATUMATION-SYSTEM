import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Modal, Form, Input, Select, message,
    Tag, Space, Card, Row, Col, Statistic, Popconfirm, Progress, 
    Tooltip, Badge, Avatar, DatePicker, Tabs, Typography
} from 'antd';
import {
    PlusOutlined, PrinterOutlined, EditOutlined,
    DeleteOutlined, ReloadOutlined, SearchOutlined,
    RiseOutlined, FallOutlined, TrophyOutlined, BookOutlined,
    CheckCircleOutlined, CloseCircleOutlined, PercentageOutlined,
    UserOutlined, ClockCircleOutlined, FileTextOutlined,
    SaveOutlined
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const GRADE_COLOR = {
    'A+': 'green',
    'A':  'green',
    'B+': 'blue',
    'B':  'blue',
    'C+': 'orange',
    'C':  'orange',
    'F':  'red',
};

const GRADE_BG_COLOR = {
    'A+': '#f6ffed',
    'A':  '#f6ffed',
    'B+': '#e6f7ff',
    'B':  '#e6f7ff',
    'C+': '#fff7e6',
    'C':  '#fff7e6',
    'F':  '#fff2f0',
};

const calculateGrade = (marks) => {
    if (marks >= 90) return 'A+';
    if (marks >= 85) return 'A';
    if (marks >= 80) return 'B+';
    if (marks >= 75) return 'B';
    if (marks >= 70) return 'C+';
    if (marks >= 60) return 'C';
    return 'F';
};

const Results = () => {
    const [results, setResults] = useState([]);
    const [allResults, setAllResults] = useState([]);
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState(null);
    const [filterMode, setFilterMode] = useState('student');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingResult, setEditingResult] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

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

    // Create a map for quick class lookup
    const classMap = useMemo(() => {
        const map = {};
        classes.forEach(cls => {
            map[cls._id] = cls.name;
        });
        return map;
    }, [classes]);

    useEffect(() => {
        fetchStudents();
        fetchClasses();
    }, []);

    useEffect(() => {
        if (students.length > 0) fetchAllResults();
    }, [students]);

    useEffect(() => {
        if (filterMode === 'student' && selectedStudent) {
            fetchResultsByStudent(selectedStudent, selectedSemester);
        } else if (filterMode === 'class' && selectedClass) {
            fetchResultsByClass(selectedClass, selectedSemester);
        } else {
            setResults([]);
        }
    }, [selectedStudent, selectedClass, selectedSemester, filterMode]);

    // Fetch helpers
    const fetchStudents = async () => {
        try {
            const res = await axios.get('/api/v1/students/');
            setStudents(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/v1/classes/');
            const classesData = res.data.data?.classes || res.data.data || [];
            setClasses(classesData);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const fetchResultsByStudent = async (studentId, semester) => {
        setTableLoading(true);
        try {
            const url = semester
                ? `/api/v1/results/student/${studentId}?semester=${semester}`
                : `/api/v1/results/student/${studentId}`;
            const res = await axios.get(url);
            
            const student = students.find((s) => s._id === studentId);
            
            // Enrich results with student info and resolve class name
            const enriched = (res.data.data || []).map((r) => {
                // Get class ID (could be object or string)
                let classId = r.classId;
                let className = '';
                
                if (typeof classId === 'object' && classId !== null) {
                    className = classId.name || '';
                    classId = classId._id;
                } else if (typeof classId === 'string') {
                    className = classMap[classId] || '';
                }
                
                return {
                    ...r,
                    studentName: student?.studentName || '-',
                    rollNo: student?.rollNo || '-',
                    className: className,
                    classId: classId,
                };
            });

            setResults(enriched);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
            setResults([]);
        } finally {
            setTableLoading(false);
        }
    };

    const fetchResultsByClass = async (classId, semester) => {
        setTableLoading(true);
        try {
            const url = semester
                ? `/api/v1/results/class/${classId}?semester=${semester}`
                : `/api/v1/results/class/${classId}`;
            const res = await axios.get(url);

            const enriched = (res.data.data || []).map((r) => {
                const student = students.find(
                    (s) => s._id === (r.studentId?._id || r.studentId)
                );
                
                // Get class name
                let className = '';
                let classIdValue = r.classId;
                
                if (typeof classIdValue === 'object' && classIdValue !== null) {
                    className = classIdValue.name || '';
                    classIdValue = classIdValue._id;
                } else if (typeof classIdValue === 'string') {
                    className = classMap[classIdValue] || '';
                }
                
                return {
                    ...r,
                    studentName: r.studentId?.studentName || student?.studentName || '-',
                    rollNo: r.studentId?.rollNo || student?.rollNo || '-',
                    className: className,
                    classId: classIdValue,
                };
            });

            setResults(enriched);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
            setResults([]);
        } finally {
            setTableLoading(false);
        }
    };

    const fetchAllResults = async () => {
        try {
            const fetches = await Promise.all(
                students.map((s) =>
                    axios
                        .get(`/api/v1/results/student/${s._id}`)
                        .then((r) =>
                            (r.data.data || []).map((result) => {
                                // Get class name
                                let className = '';
                                let classIdValue = result.classId;
                                
                                if (typeof classIdValue === 'object' && classIdValue !== null) {
                                    className = classIdValue.name || '';
                                    classIdValue = classIdValue._id;
                                } else if (typeof classIdValue === 'string') {
                                    className = classMap[classIdValue] || '';
                                }
                                
                                return {
                                    ...result,
                                    studentName: s.studentName,
                                    rollNo: s.rollNo,
                                    className: className,
                                    classId: classIdValue,
                                };
                            })
                        )
                        .catch((err) => {
                            console.error(`Failed to fetch results for student ${s._id}:`, extractErrorMessage(err));
                            return [];
                        })
                )
            );
            setAllResults(fetches.flat());
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Failed to fetch all results:', errorMsg);
        }
    };

    // Filter results based on search text
    const filteredResults = useMemo(() => {
        if (!searchText) return results;
        
        return results.filter((record) =>
            (record.studentName || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.subject || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.semester || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.grade || '').toLowerCase().includes(searchText.toLowerCase())
        );
    }, [results, searchText]);

    // Stats calculations based on FILTERED results
    const totalResults = filteredResults.length;
    const avgMarks = totalResults > 0
        ? (filteredResults.reduce((s, r) => s + (r.marks || 0), 0) / totalResults).toFixed(1)
        : 0;
    const passCount = filteredResults.filter((r) => r.grade !== 'F').length;
    const failCount = filteredResults.filter((r) => r.grade === 'F').length;
    const passRate = totalResults > 0 ? ((passCount / totalResults) * 100).toFixed(1) : 0;
    
    // Grade distribution based on FILTERED results
    const gradeDistribution = {
        'A+': filteredResults.filter(r => r.grade === 'A+').length,
        'A': filteredResults.filter(r => r.grade === 'A').length,
        'B+': filteredResults.filter(r => r.grade === 'B+').length,
        'B': filteredResults.filter(r => r.grade === 'B').length,
        'C+': filteredResults.filter(r => r.grade === 'C+').length,
        'C': filteredResults.filter(r => r.grade === 'C').length,
        'F': filteredResults.filter(r => r.grade === 'F').length,
    };

    // Stats Cards Data
    const statsCards = [
        {
            title: 'Total Records',
            value: totalResults,
            icon: <BookOutlined />,
            color: '#1890ff',
            bgColor: '#e6f7ff',
            subtitle: searchText ? `From ${results.length} total` : null
        },
        {
            title: 'Average Marks',
            value: `${avgMarks}%`,
            icon: <RiseOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed',
            progress: true,
            progressValue: avgMarks
        },
        {
            title: 'Pass Rate',
            value: `${passRate}%`,
            icon: <PercentageOutlined />,
            color: '#faad14',
            bgColor: '#fff7e6',
            subtitle: `${passCount} Passed / ${failCount} Failed`
        }
    ];

    // Handlers
    const handleCreate = async (values) => {
        setSubmitLoading(true);
        try {
            const grade = calculateGrade(Number(values.marks));
            await axios.post('/api/v1/results/', {
                studentId: values.studentId,
                classId: values.classId,
                subject: values.subject,
                marks: Number(values.marks),
                grade,
                semester: values.semester,
            });
            message.success('Marks saved successfully');
            setIsModalVisible(false);
            form.resetFields();
            if (filterMode === 'student' && selectedStudent) {
                fetchResultsByStudent(selectedStudent, selectedSemester);
            } else if (filterMode === 'class' && selectedClass) {
                fetchResultsByClass(selectedClass, selectedSemester);
            }
            fetchAllResults();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEditOpen = (record) => {
        setEditingResult(record);
        editForm.setFieldsValue({
            marks: record.marks,
            grade: record.grade,
        });
        setIsEditModalVisible(true);
    };

    const handleEditSave = async (values) => {
        setSubmitLoading(true);
        try {
            await axios.patch(`/api/v1/results/${editingResult._id}`, {
                marks: Number(values.marks),
                grade: values.grade || calculateGrade(Number(values.marks)),
            });
            message.success('Result updated successfully');
            setIsEditModalVisible(false);
            editForm.resetFields();
            setEditingResult(null);
            if (filterMode === 'student' && selectedStudent) {
                fetchResultsByStudent(selectedStudent, selectedSemester);
            } else if (filterMode === 'class' && selectedClass) {
                fetchResultsByClass(selectedClass, selectedSemester);
            }
            fetchAllResults();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/v1/results/${id}`);
            message.success('Result deleted successfully');
            if (filterMode === 'student' && selectedStudent) {
                fetchResultsByStudent(selectedStudent, selectedSemester);
            } else if (filterMode === 'class' && selectedClass) {
                fetchResultsByClass(selectedClass, selectedSemester);
            }
            fetchAllResults();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const generateReportCard = (record) => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Student Report Card', 105, 20, null, null, 'center');
        doc.setFontSize(12);
        doc.text(`Student: ${record.studentName || '-'}`, 20, 40);
        doc.text(`Roll No: ${record.rollNo || '-'}`, 20, 50);
        doc.text(`Semester: ${record.semester}`, 20, 60);
        doc.text(`Class: ${record.className || '-'}`, 20, 70);
        autoTable(doc, {
            startY: 80,
            head: [['Subject', 'Marks', 'Grade']],
            body: [[record.subject, record.marks, record.grade]],
        });
        doc.text(
            'End of Report',
            105,
            doc.lastAutoTable.finalY + 20,
            null, null, 'center'
        );
        doc.save(`${record.studentName}_${record.semester}_ReportCard.pdf`);
        message.success('Report card downloaded');
    };

    const clearFilters = () => {
        setSelectedStudent(null);
        setSelectedClass(null);
        setSearchText('');
        setSelectedSemester(null);
    };

    // Table columns
    const columns = [
        {
            title: 'Student',
            dataIndex: 'studentName',
            key: 'studentName',
            sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || ''),
            render: (name, record) => (
                <Tooltip title={`Roll No: ${record.rollNo}`}>
                    <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                            <div style={{ fontWeight: 500 }}>{name}</div>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.rollNo}</div>
                        </div>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: 'Roll No',
            dataIndex: 'rollNo',
            key: 'rollNo',
            sorter: (a, b) => (a.rollNo || '').localeCompare(b.rollNo || ''),
        },
        {
            title: 'Class',
            dataIndex: 'className',
            key: 'className',
            render: (className) => (
                <Tag color="cyan" icon={<BookOutlined />}>
                    {className || '-'}
                </Tag>
            ),
            sorter: (a, b) => (a.className || '').localeCompare(b.className || ''),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            sorter: (a, b) => (a.subject || '').localeCompare(b.subject || ''),
            render: (subject) => (
                <Tag icon={<BookOutlined />} color="blue">
                    {subject}
                </Tag>
            ),
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
            filters: Object.keys(GRADE_COLOR).map((g) => ({
                text: g, value: g,
            })),
            onFilter: (value, record) => record.grade === value,
        },
        {
            title: 'Semester',
            dataIndex: 'semester',
            key: 'semester',
            sorter: (a, b) => (a.semester || '').localeCompare(b.semester || ''),
            render: (semester) => (
                <Space>
                    <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                    <span>{semester}</span>
                </Space>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 180,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Edit Result">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEditOpen(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Download Report Card">
                        <Button
                            icon={<PrinterOutlined />}
                            size="small"
                            onClick={() => generateReportCard(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this result?"
                        description="This action cannot be undone."
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Result">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Results & Grading
                </Title>
                <Text type="secondary">
                    Manage student results, track performance, and generate report cards
                </Text>
            </div>

            {/* Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {statsCards.map((card, index) => (
                    <Col xs={24} sm={12} lg={8} key={index}>
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
                <Col xs={24} sm={12} lg={8}>
                    <Card 
                        hoverable 
                        style={{ 
                            borderTop: '4px solid #722ed1',
                            borderRadius: '10px'
                        }}
                    >
                        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '12px' }}>
                            <TrophyOutlined /> Grade Distribution
                        </div>
                        <Row gutter={[8, 8]}>
                            {Object.entries(gradeDistribution).map(([grade, count]) => (
                                count > 0 && (
                                    <Col span={12} key={grade}>
                                        <Tag 
                                            color={GRADE_COLOR[grade]} 
                                            style={{ width: '100%', textAlign: 'center', padding: '4px 8px' }}
                                        >
                                            <strong>{grade}</strong>: {count}
                                        </Tag>
                                    </Col>
                                )
                            ))}
                            {totalResults === 0 && (
                                <Col span={24}>
                                    <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '20px 0' }}>
                                        No data available
                                    </div>
                                </Col>
                            )}
                        </Row>
                    </Card>
                </Col>
            </Row>

            {/* Filters Card */}
            <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                <Space wrap size="middle" style={{ width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Filter by
                        </div>
                        <Select
                            value={filterMode}
                            onChange={(v) => {
                                setFilterMode(v);
                                setResults([]);
                                setSelectedStudent(null);
                                setSelectedClass(null);
                                setSearchText('');
                            }}
                            style={{ width: 130 }}
                        >
                            <Option value="student">Student</Option>
                            <Option value="class">Class</Option>
                        </Select>
                    </div>

                    {filterMode === 'student' && (
                        <div style={{ minWidth: 250 }}>
                            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                                Student
                            </div>
                            <Select
                                placeholder="Select student"
                                style={{ width: '100%' }}
                                showSearch
                                allowClear
                                optionFilterProp="children"
                                onChange={(val) => {
                                    setSelectedStudent(val);
                                    setSearchText('');
                                }}
                                value={selectedStudent}
                            >
                                {students.map((s) => (
                                    <Option key={s._id} value={s._id}>
                                        {s.studentName} — {s.rollNo}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {filterMode === 'class' && (
                        <div style={{ minWidth: 200 }}>
                            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                                Class
                            </div>
                            <Select
                                placeholder="Select class"
                                style={{ width: '100%' }}
                                allowClear
                                onChange={(val) => {
                                    setSelectedClass(val);
                                    setSearchText('');
                                }}
                                value={selectedClass}
                            >
                                {classes.map((c) => (
                                    <Option key={c._id} value={c._id}>
                                        {c.name}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Search
                        </div>
                        <Input
                            placeholder="Search by student, subject, or grade..."
                            prefix={<SearchOutlined />}
                            allowClear
                            style={{ width: '100%' }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>

                    <div style={{ minWidth: 150 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Semester
                        </div>
                        <Input
                            placeholder="e.g., Fall-2024"
                            allowClear
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value || null)}
                        />
                    </div>

                    {(selectedStudent || selectedClass || searchText || selectedSemester) && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </Space>
            </Card>

            {/* Action buttons */}
            <div style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, fontWeight: 600 }}>
                    <FileTextOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                    Results Records
                </h3>
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            fetchAllResults();
                            if (filterMode === 'student' && selectedStudent) {
                                fetchResultsByStudent(selectedStudent, selectedSemester);
                            } else if (filterMode === 'class' && selectedClass) {
                                fetchResultsByClass(selectedClass, selectedSemester);
                            }
                        }}
                    >
                        Refresh
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                    >
                        Enter Marks
                    </Button>
                </Space>
            </div>

            {/* Table */}
            {!selectedStudent && !selectedClass ? (
                <Card style={{ borderRadius: '10px' }}>
                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                        <BookOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                        <div style={{ fontSize: 16 }}>Select a student or class above to view results</div>
                    </div>
                </Card>
            ) : (
                <Table
                    columns={columns}
                    dataSource={filteredResults}
                    rowKey="_id"
                    loading={tableLoading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} results`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    scroll={{ x: 1300 }}
                />
            )}

            {/* Create Modal */}
            <Modal
                title={
                    <Space>
                        <PlusOutlined style={{ color: '#1890ff' }} />
                        <span>Enter Student Marks</span>
                    </Space>
                }
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                destroyOnClose
                width={550}
            >
                <Form layout="vertical" onFinish={handleCreate} form={form}>
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
                            {students.map((s) => (
                                <Option key={s._id} value={s._id}>
                                    {s.studentName} — {s.rollNo}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="classId"
                        label="Class"
                        rules={[{ required: true, message: 'Please select a class' }]}
                    >
                        <Select placeholder="Select class" size="large">
                            {classes.map((c) => (
                                <Option key={c._id} value={c._id}>
                                    {c.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="subject"
                        label="Subject"
                        rules={[{ required: true, message: 'Please enter subject' }]}
                    >
                        <Input placeholder="e.g. Mathematics" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="marks"
                        label="Marks (0–100)"
                        rules={[{ required: true, message: 'Please enter marks' }]}
                    >
                        <Input type="number" min={0} max={100} size="large" />
                    </Form.Item>

                    <Form.Item
                        name="semester"
                        label="Semester"
                        rules={[{ required: true, message: 'Please enter semester' }]}
                    >
                        <Input placeholder="e.g. Fall-2024" size="large" />
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
                            Save Marks
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title={
                    <Space>
                        <EditOutlined style={{ color: '#1890ff' }} />
                        <span>Update Result</span>
                    </Space>
                }
                open={isEditModalVisible}
                onCancel={() => {
                    setIsEditModalVisible(false);
                    editForm.resetFields();
                    setEditingResult(null);
                }}
                footer={null}
                destroyOnClose
                width={500}
            >
                <Form layout="vertical" onFinish={handleEditSave} form={editForm}>
                    <Form.Item
                        name="marks"
                        label="Marks (0–100)"
                        rules={[{ required: true, message: 'Please enter marks' }]}
                    >
                        <Input type="number" min={0} max={100} size="large" />
                    </Form.Item>

                    <Form.Item
                        name="grade"
                        label="Grade (leave blank to auto-calculate)"
                    >
                        <Select allowClear placeholder="Auto-calculate from marks" size="large">
                            {Object.keys(GRADE_COLOR).map((g) => (
                                <Option key={g} value={g}>{g}</Option>
                            ))}
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
                            Update Result
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Results;