import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Modal, Form, Input, Select, message,
    Tag, Space, Card, Row, Col, Statistic, Popconfirm, Progress, 
    Tooltip, Badge, Avatar, DatePicker, Tabs, Typography, Divider, InputNumber
} from 'antd';
import {
    PlusOutlined, PrinterOutlined, EditOutlined,
    DeleteOutlined, ReloadOutlined, SearchOutlined,
    RiseOutlined, FallOutlined, TrophyOutlined, BookOutlined,
    CheckCircleOutlined, CloseCircleOutlined, PercentageOutlined,
    UserOutlined, ClockCircleOutlined, FileTextOutlined,
    SaveOutlined, MinusCircleOutlined, SolutionOutlined
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { generateStudentTranscriptPDF, calculateGrade } from '../utils/transcriptGenerator';

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
    const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [orgName, setOrgName] = useState('SCHOOL AUTOMATION SYSTEM');
    const [form] = Form.useForm();
    const [batchForm] = Form.useForm();

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
        fetchOrgName();
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
    const fetchOrgName = async () => {
        try {
            const res = await axios.get('/api/v1/organizations/me');
            const name = res.data.data?.name || res.data.data?.organizationName || '';
            if (name) setOrgName(name);
        } catch (err) {
            // silently fallback to default name
            console.warn('Could not fetch organization name:', err.message);
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

    // Group results by studentId + semester so each student appears in 1 row per semester/term
    const groupedResults = useMemo(() => {
        const map = {};

        results.forEach((r) => {
            const studentId = r.studentId?._id || r.studentId || r.student_id;
            const semester = r.semester || 'Current';
            const key = `${studentId}_${semester}`;

            if (!map[key]) {
                const sObj = students.find(s => s._id === studentId) || {};
                let className = r.className;
                if (!className) {
                    const classVal = r.classId || sObj.classId;
                    if (typeof classVal === 'object' && classVal !== null) {
                        className = classVal.name || '';
                    } else if (typeof classVal === 'string') {
                        className = classMap[classVal] || '';
                    }
                }

                map[key] = {
                    key,
                    studentId,
                    studentName: r.studentName || sObj.studentName || 'Student',
                    rollNo: r.rollNo || sObj.rollNo || '-',
                    fatherName: sObj.fatherName || r.fatherName || '-',
                    className: className || '-',
                    classId: r.classId?._id || r.classId || sObj.classId,
                    semester,
                    subjects: [],
                    totalObtained: 0,
                    totalMax: 0,
                };
            }

            const marks = Number(r.marks) || 0;
            const maxMarks = Number(r.maxMarks) || 100;
            map[key].subjects.push(r);
            map[key].totalObtained += marks;
            map[key].totalMax += maxMarks;
        });

        return Object.values(map).map((group) => {
            const overallPct = group.totalMax > 0 ? (group.totalObtained / group.totalMax) * 100 : 0;
            const overallGrade = calculateGrade(overallPct);
            const subjectCount = group.subjects.length;
            const avgMarks = subjectCount > 0 ? (group.totalObtained / subjectCount).toFixed(1) : 0;

            return {
                ...group,
                overallPct: Math.round(overallPct * 10) / 10,
                overallGrade,
                subjectCount,
                avgMarks
            };
        });
    }, [results, students, classMap]);

    // Filter grouped results based on search text
    const filteredGroupedResults = useMemo(() => {
        if (!searchText) return groupedResults;
        const term = searchText.toLowerCase();

        return groupedResults.filter((record) =>
            (record.studentName || '').toLowerCase().includes(term) ||
            (record.rollNo || '').toLowerCase().includes(term) ||
            (record.className || '').toLowerCase().includes(term) ||
            (record.semester || '').toLowerCase().includes(term) ||
            (record.overallGrade || '').toLowerCase().includes(term)
        );
    }, [groupedResults, searchText]);

    // Stats calculations based on FILTERED GROUPED results
    const totalStudentsCount = filteredGroupedResults.length;
    const avgMarksOverall = totalStudentsCount > 0
        ? (filteredGroupedResults.reduce((s, r) => s + (r.overallPct || 0), 0) / totalStudentsCount).toFixed(1)
        : 0;
    const passCount = filteredGroupedResults.filter((r) => r.overallGrade !== 'F').length;
    const failCount = filteredGroupedResults.filter((r) => r.overallGrade === 'F').length;
    const passRate = totalStudentsCount > 0 ? ((passCount / totalStudentsCount) * 100).toFixed(1) : 0;
    
    // Grade distribution based on FILTERED GROUPED results
    const gradeDistribution = {
        'A+': filteredGroupedResults.filter(r => r.overallGrade === 'A+').length,
        'A': filteredGroupedResults.filter(r => r.overallGrade === 'A').length,
        'B+': filteredGroupedResults.filter(r => r.overallGrade === 'B+').length,
        'B': filteredGroupedResults.filter(r => r.overallGrade === 'B').length,
        'C+': filteredGroupedResults.filter(r => r.overallGrade === 'C+').length,
        'C': filteredGroupedResults.filter(r => r.overallGrade === 'C').length,
        'F': filteredGroupedResults.filter(r => r.overallGrade === 'F').length,
    };

    // Stats Cards Data
    const statsCards = [
        {
            title: 'Students Evaluated',
            value: totalStudentsCount,
            icon: <BookOutlined />,
            color: '#1890ff',
            bgColor: '#e6f7ff',
            subtitle: searchText ? `From ${groupedResults.length} total students` : null
        },
        {
            title: 'Overall Average Marks',
            value: `${avgMarksOverall}%`,
            icon: <RiseOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed',
            progress: true,
            progressValue: avgMarksOverall
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
    const openBatchModal = () => {
        batchForm.resetFields();
        batchForm.setFieldsValue({
            studentId: selectedStudent || undefined,
            classId: selectedClass || undefined,
            semester: selectedSemester || 'Fall-2024',
            subjects: [
                { subject: 'Mathematics', marks: 85, maxMarks: 100 },
                { subject: 'English', marks: 78, maxMarks: 100 },
                { subject: 'Science', marks: 90, maxMarks: 100 },
                { subject: 'Computer', marks: 88, maxMarks: 100 },
                { subject: 'Urdu', marks: 80, maxMarks: 100 }
            ]
        });
        setIsBatchModalVisible(true);
    };

    const openBatchModalForGroup = (groupRecord) => {
        batchForm.resetFields();
        const subjectsList = groupRecord.subjects.map(s => ({
            subject: s.subject,
            marks: s.marks,
            maxMarks: s.maxMarks || 100
        }));

        batchForm.setFieldsValue({
            studentId: groupRecord.studentId,
            classId: groupRecord.classId,
            semester: groupRecord.semester,
            subjects: subjectsList.length > 0 ? subjectsList : [
                { subject: 'Mathematics', marks: 85, maxMarks: 100 }
            ]
        });
        setIsBatchModalVisible(true);
    };

    const handleBulkCreate = async (values) => {
        setSubmitLoading(true);
        try {
            await axios.post('/api/v1/results/bulk', {
                studentId: values.studentId,
                classId: values.classId,
                semester: values.semester,
                subjects: values.subjects
            });
            message.success('Multiple subject marks saved successfully');
            setIsBatchModalVisible(false);
            batchForm.resetFields();
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

    const handleCreate = async (values) => {
        setSubmitLoading(true);
        try {
            const numMarks = Number(values.marks);
            const numMax = Number(values.maxMarks) || 100;
            const pct = (numMarks / numMax) * 100;
            const grade = calculateGrade(pct);
            await axios.post('/api/v1/results/', {
                studentId: values.studentId,
                classId: values.classId,
                subject: values.subject,
                marks: numMarks,
                maxMarks: numMax,
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
            maxMarks: record.maxMarks || 100,
            grade: record.grade,
        });
        setIsEditModalVisible(true);
    };

    const handleEditSave = async (values) => {
        setSubmitLoading(true);
        try {
            const numMarks = Number(values.marks);
            const numMax = Number(values.maxMarks) || 100;
            const pct = (numMarks / numMax) * 100;
            await axios.patch(`/api/v1/results/${editingResult._id}`, {
                marks: numMarks,
                maxMarks: numMax,
                grade: values.grade || calculateGrade(pct),
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

    const handleDeleteGroup = async (groupRecord) => {
        try {
            await Promise.all(
                groupRecord.subjects.map(s => axios.delete(`/api/v1/results/${s._id}`))
            );
            message.success('Student result records deleted successfully');
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

    const handleDownloadTranscript = async (recordOrStudentId, semesterParam = null) => {
        try {
            let targetStudentId = null;
            let targetSemester = semesterParam || selectedSemester || '';
            let targetStudentObj = null;

            if (typeof recordOrStudentId === 'object' && recordOrStudentId !== null) {
                targetStudentId = recordOrStudentId.studentId?._id || recordOrStudentId.studentId || recordOrStudentId.student_id;
                if (recordOrStudentId.semester && !semesterParam) {
                    targetSemester = recordOrStudentId.semester;
                }
            } else {
                targetStudentId = recordOrStudentId || selectedStudent;
            }

            if (!targetStudentId) {
                message.warning('Please select a student to generate transcript');
                return;
            }

            targetStudentObj = students.find((s) => s._id === targetStudentId);

            // Fetch latest student results from API if needed
            const url = targetSemester
                ? `/api/v1/results/student/${targetStudentId}?semester=${targetSemester}`
                : `/api/v1/results/student/${targetStudentId}`;
            const res = await axios.get(url);
            const studentResults = res.data.data || [];

            if (studentResults.length === 0) {
                message.warning('No examination records found for this student');
                return;
            }

            let className = '';
            if (targetStudentObj?.classId) {
                className = typeof targetStudentObj.classId === 'object'
                    ? targetStudentObj.classId.name
                    : classMap[targetStudentObj.classId] || '';
            }
            if (!className && studentResults[0]?.className) {
                className = studentResults[0].className;
            }

            generateStudentTranscriptPDF({
                studentName: targetStudentObj?.studentName || (typeof recordOrStudentId === 'object' ? recordOrStudentId.studentName : 'Student'),
                rollNo: targetStudentObj?.rollNo || (typeof recordOrStudentId === 'object' ? recordOrStudentId.rollNo : '-'),
                fatherName: targetStudentObj?.fatherName || (typeof recordOrStudentId === 'object' ? recordOrStudentId.fatherName : '-'),
                className: className || '-',
                semester: targetSemester || studentResults[0]?.semester || 'Academic Term',
                results: studentResults,
                schoolName: orgName,
            });

            message.success('Official Complete Student Transcript downloaded');
        } catch (err) {
            console.error('Transcript PDF generation error:', err);
            message.error(extractErrorMessage(err) || 'Failed to download transcript');
        }
    };

    const clearFilters = () => {
        setSelectedStudent(null);
        setSelectedClass(null);
        setSearchText('');
        setSelectedSemester(null);
    };

    // Table columns - Subject column removed, aggregated into 1 row per student per semester
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
            title: 'Subjects Count',
            dataIndex: 'subjectCount',
            key: 'subjectCount',
            render: (count) => (
                <Tag color="geekblue" icon={<BookOutlined />}>
                    {count} {count === 1 ? 'Subject' : 'Subjects'}
                </Tag>
            ),
            sorter: (a, b) => (a.subjectCount || 0) - (b.subjectCount || 0),
        },
        {
            title: 'Total & Avg Marks',
            key: 'totalMarks',
            render: (_, record) => {
                const pct = record.overallPct || 0;
                return (
                    <Tooltip title={`Total: ${record.totalObtained} / ${record.totalMax} | Avg: ${pct}%`}>
                        <Space>
                            <Progress 
                                type="circle" 
                                percent={pct} 
                                width={42} 
                                strokeColor={pct >= 60 ? '#52c41a' : '#ff4d4f'}
                                format={(p) => `${p}%`}
                            />
                            <div>
                                <div style={{ fontWeight: 600 }}>{record.totalObtained} / {record.totalMax}</div>
                                <div style={{ fontSize: 11, color: '#52c41a', fontWeight: 500 }}>Avg: {pct}%</div>
                            </div>
                        </Space>
                    </Tooltip>
                );
            },
            sorter: (a, b) => (a.overallPct || 0) - (b.overallPct || 0),
        },
        {
            title: 'Overall Grade',
            dataIndex: 'overallGrade',
            key: 'overallGrade',
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
            onFilter: (value, record) => record.overallGrade === value,
        },
        {
            title: 'Semester / Term',
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
            width: 240,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Edit / Manage Subject Marks">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => openBatchModalForGroup(record)}
                        >
                            Edit Marks
                        </Button>
                    </Tooltip>
                    <Tooltip title="Download Complete Student Transcript PDF">
                        <Button
                            type="primary"
                            ghost
                            icon={<PrinterOutlined />}
                            size="small"
                            onClick={() => handleDownloadTranscript(record)}
                        >
                            Transcript
                        </Button>
                    </Tooltip>
                    <Popconfirm
                        title="Delete student results for this term?"
                        description="This will delete marks for all subjects of this student in this term."
                        onConfirm={() => handleDeleteGroup(record)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Student Results">
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
                    Manage student results, enter multiple subject marks at once, and download complete official transcripts
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
                            {totalStudentsCount === 0 && (
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
                <Space wrap>
                    {selectedStudent && results.length > 0 && (
                        <Button
                            type="primary"
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                            icon={<PrinterOutlined />}
                            onClick={() => handleDownloadTranscript(selectedStudent, selectedSemester)}
                        >
                            Download Student Transcript (PDF)
                        </Button>
                    )}
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
                        type="default"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                    >
                        Single Subject Marks
                    </Button>
                    <Button
                        type="primary"
                        icon={<SolutionOutlined />}
                        onClick={openBatchModal}
                    >
                        Enter Multiple Subjects (Batch)
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
                    dataSource={filteredGroupedResults}
                    rowKey="key"
                    loading={tableLoading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} student records`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    scroll={{ x: 1000 }}
                    expandable={{
                        expandedRowRender: (record) => (
                            <div style={{ padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
                                <div style={{ fontWeight: 600, marginBottom: 10, color: '#1890ff' }}>
                                    Subject-wise Breakdown — {record.studentName} | {record.semester}
                                </div>
                                <Row gutter={[12, 8]}>
                                    {record.subjects.map((s, idx) => {
                                        const pct = s.maxMarks > 0 ? ((s.marks / s.maxMarks) * 100).toFixed(1) : 0;
                                        const borderColor = s.grade === 'F' ? '#ff4d4f' : (s.grade === 'A+' || s.grade === 'A') ? '#52c41a' : '#1890ff';
                                        return (
                                            <Col xs={24} sm={12} md={8} key={s._id || idx}>
                                                <Card
                                                    size="small"
                                                    style={{ borderLeft: `4px solid ${borderColor}` }}
                                                >
                                                    <div style={{ fontWeight: 600 }}>{s.subject}</div>
                                                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                                                        {s.marks} / {s.maxMarks} marks &nbsp;|&nbsp;
                                                        <span style={{ color: '#1890ff' }}>{pct}%</span>
                                                    </div>
                                                    <Tag color={GRADE_COLOR[s.grade] || 'default'} style={{ marginTop: 4 }}>
                                                        {s.grade}
                                                    </Tag>
                                                </Card>
                                            </Col>
                                        );
                                    })}
                                </Row>
                            </div>
                        ),
                        rowExpandable: (record) => record.subjects && record.subjects.length > 0,
                    }}
                />
            )}

            {/* Create Single Subject Modal */}
            <Modal
                title={
                    <Space>
                        <PlusOutlined style={{ color: '#1890ff' }} />
                        <span>Enter Single Subject Marks</span>
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
                <Form layout="vertical" onFinish={handleCreate} form={form} initialValues={{ maxMarks: 100 }}>
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

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="marks"
                                label="Obtained Marks"
                                rules={[{ required: true, message: 'Please enter marks' }]}
                            >
                                <Input type="number" min={0} size="large" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="maxMarks"
                                label="Maximum Marks"
                                rules={[{ required: true, message: 'Please enter max marks' }]}
                            >
                                <Input type="number" min={1} size="large" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="semester"
                        label="Semester / Exam Term"
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

            {/* Batch Entry Modal (Enter Multiple Subjects at Same Time) */}
            <Modal
                title={
                    <Space>
                        <SolutionOutlined style={{ color: '#1890ff' }} />
                        <span>Enter Multiple Subject Marks at Once</span>
                    </Space>
                }
                open={isBatchModalVisible}
                onCancel={() => {
                    setIsBatchModalVisible(false);
                    batchForm.resetFields();
                }}
                onOk={() => batchForm.submit()}
                confirmLoading={submitLoading}
                okText="Save All Subjects Marks"
                width={700}
                destroyOnClose
            >
                <Form layout="vertical" form={batchForm} onFinish={handleBulkCreate}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="studentId"
                                label="Select Student"
                                rules={[{ required: true, message: 'Please select student' }]}
                            >
                                <Select
                                    placeholder="Select student"
                                    showSearch
                                    optionFilterProp="children"
                                    onChange={(sId) => {
                                        const sObj = students.find(s => s._id === sId);
                                        if (sObj?.classId) {
                                            const cId = typeof sObj.classId === 'object' ? sObj.classId._id : sObj.classId;
                                            batchForm.setFieldsValue({ classId: cId });
                                        }
                                    }}
                                >
                                    {students.map((s) => (
                                        <Option key={s._id} value={s._id}>
                                            {s.studentName} — {s.rollNo}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="classId"
                                label="Class"
                                rules={[{ required: true, message: 'Please select class' }]}
                            >
                                <Select placeholder="Select class">
                                    {classes.map((c) => (
                                        <Option key={c._id} value={c._id}>
                                            {c.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="semester"
                        label="Exam Term / Semester"
                        rules={[{ required: true, message: 'Please enter term / semester' }]}
                    >
                        <Input placeholder="e.g. Mid-Term 2024 / Fall-2024 / Annual 2025" />
                    </Form.Item>

                    <Divider style={{ margin: '12px 0' }}>Subject Marks List</Divider>

                    <Form.List name="subjects">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'subject']}
                                            rules={[{ required: true, message: 'Subject name' }]}
                                            style={{ marginBottom: 0, width: 250 }}
                                        >
                                            <Input placeholder="Subject Name (e.g. Physics)" />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'marks']}
                                            rules={[{ required: true, message: 'Marks' }]}
                                            style={{ marginBottom: 0, width: 140 }}
                                        >
                                            <Input placeholder="Obtained" type="number" min={0} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'maxMarks']}
                                            rules={[{ required: true, message: 'Max' }]}
                                            style={{ marginBottom: 0, width: 140 }}
                                        >
                                            <Input placeholder="Total Max" type="number" min={1} />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', fontSize: 16, cursor: 'pointer' }} />
                                    </Space>
                                ))}
                                <Form.Item style={{ marginTop: 12 }}>
                                    <Button type="dashed" onClick={() => add({ subject: '', marks: 0, maxMarks: 100 })} block icon={<PlusOutlined />}>
                                        Add Subject Row
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>

        </div>
    );
};

export default Results;