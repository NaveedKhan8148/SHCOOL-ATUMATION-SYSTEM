import React, { useState, useEffect, useMemo } from 'react';
import { 
    Card, Table, Typography, Tag, Input, Spin, Select, 
    Row, Col, Statistic, Space, Avatar, Progress, Tooltip, 
    Button, Badge, message
} from 'antd';
import { 
    BookOutlined, SearchOutlined, FilterOutlined, 
    ReloadOutlined, UserOutlined, TrophyOutlined,
    RiseOutlined, FallOutlined, CheckCircleOutlined,
    CloseCircleOutlined, PercentageOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const GRADE_COLOR = {
    'A+': 'green', 'A': 'green',
    'B+': 'blue',  'B': 'blue',
    'C+': 'orange','C': 'orange',
    'F':  'red',
};

const GRADE_BG_COLOR = {
    'A+': '#f6ffed', 'A': '#f6ffed',
    'B+': '#e6f7ff', 'B': '#e6f7ff',
    'C+': '#fff7e6', 'C': '#fff7e6',
    'F':  '#fff2f0',
};

const TeacherClassResults = () => {
    const { classId } = useParams();
    const [classInfo, setClassInfo] = useState(null);
    const [results, setResults] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [semesterFilter, setSemesterFilter] = useState(null);
    const [loading, setLoading] = useState(false);

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
            fetchResults();
        }
    }, [classId]);

    useEffect(() => {
        if (classId) fetchResults();
    }, [semesterFilter]);

    const fetchClassInfo = async () => {
        try {
            const res = await axios.get(`/api/v1/classes/${classId}`);
            setClassInfo(res.data.data);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Failed to fetch class info:', errorMsg);
        }
    };

    const fetchResults = async () => {
        setLoading(true);
        try {
            const url = semesterFilter
                ? `/api/v1/results/class/${classId}?semester=${semesterFilter}`
                : `/api/v1/results/class/${classId}`;
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

    // Filtered results
    const filteredResults = useMemo(() => {
        let filtered = results;
        if (searchText) {
            const q = searchText.toLowerCase();
            filtered = filtered.filter((r) =>
                r.studentName?.toLowerCase().includes(q) ||
                r.subject?.toLowerCase().includes(q) ||
                r.rollNo?.toLowerCase().includes(q)
            );
        }
        return filtered;
    }, [results, searchText]);

    // Statistics
    const totalResults = results.length;
    const avgMarks = totalResults > 0
        ? (results.reduce((s, r) => s + (r.marks || 0), 0) / totalResults).toFixed(1)
        : 0;
    const passCount = results.filter((r) => r.grade !== 'F').length;
    const failCount = results.filter((r) => r.grade === 'F').length;
    const passRate = totalResults > 0 ? ((passCount / totalResults) * 100).toFixed(1) : 0;

    // Grade distribution
    const gradeDistribution = {
        'A+': results.filter(r => r.grade === 'A+').length,
        'A': results.filter(r => r.grade === 'A').length,
        'B+': results.filter(r => r.grade === 'B+').length,
        'B': results.filter(r => r.grade === 'B').length,
        'C+': results.filter(r => r.grade === 'C+').length,
        'C': results.filter(r => r.grade === 'C').length,
        'F': results.filter(r => r.grade === 'F').length,
    };

    // Unique semesters
    const semesters = [...new Set(results.map((r) => r.semester))];

    // Stats Cards
    const statsCards = [
        {
            title: 'Total Results',
            value: totalResults,
            icon: <BookOutlined />,
            color: '#1890ff',
            bgColor: '#e6f7ff',
            subtitle: 'Records found'
        },
        {
            title: 'Average Marks',
            value: `${avgMarks}/100`,
            icon: <RiseOutlined />,
            color: avgMarks >= 75 ? '#52c41a' : avgMarks >= 60 ? '#faad14' : '#ff4d4f',
            bgColor: avgMarks >= 75 ? '#f6ffed' : avgMarks >= 60 ? '#fff7e6' : '#fff2f0',
            progress: true,
            progressValue: avgMarks,
            subtitle: avgMarks >= 75 ? 'Excellent' : avgMarks >= 60 ? 'Good' : 'Needs Improvement'
        },
        {
            title: 'Pass Rate',
            value: `${passRate}%`,
            icon: <TrophyOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed',
            progress: true,
            progressValue: passRate,
            subtitle: `${passCount} Passed / ${failCount} Failed`
        },
        {
            title: 'Failed Subjects',
            value: failCount,
            icon: <CloseCircleOutlined />,
            color: failCount > 0 ? '#ff4d4f' : '#52c41a',
            bgColor: failCount > 0 ? '#fff2f0' : '#f6ffed',
            subtitle: failCount > 0 ? 'Need improvement' : 'All passed'
        }
    ];

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

    const clearFilters = () => {
        setSearchText('');
        setSemesterFilter(null);
    };

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
                    Class Results
                </Title>
                <Text type="secondary">
                    View results for <strong>{classInfo?.name || 'Class'}</strong> — read-only
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
                                <Text type="secondary" style={{ fontSize: 12 }}>Total Results</Text>
                                <div style={{ fontWeight: 600 }}>{totalResults}</div>
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
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: card.color }}>
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

            {/* Grade Distribution Card */}
            <Card 
                style={{ marginBottom: 24, borderRadius: '10px' }}
                title={
                    <Space>
                        <TrophyOutlined style={{ color: '#722ed1' }} />
                        <span>Grade Distribution</span>
                    </Space>
                }
            >
                <Row gutter={[16, 16]}>
                    {Object.entries(gradeDistribution).map(([grade, count]) => (
                        count > 0 && (
                            <Col xs={12} sm={6} lg={3} key={grade}>
                                <Card 
                                    size="small" 
                                    style={{ 
                                        textAlign: 'center',
                                        backgroundColor: GRADE_BG_COLOR[grade] || '#fafafa',
                                        borderLeft: `4px solid ${GRADE_COLOR[grade] || '#8c8c8c'}`
                                    }}
                                >
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: GRADE_COLOR[grade] || '#8c8c8c' }}>
                                        {grade}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                        {count} Result{count !== 1 ? 's' : ''}
                                    </div>
                                </Card>
                            </Col>
                        )
                    ))}
                    {totalResults === 0 && (
                        <Col span={24}>
                            <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 20 }}>
                                No results available
                            </div>
                        </Col>
                    )}
                </Row>
            </Card>

            {/* Filters Card */}
            <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                <Space wrap size="middle" style={{ width: '100%' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Search
                        </div>
                        <Input
                            placeholder="Search by student name, roll number or subject..."
                            prefix={<SearchOutlined />}
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            size="large"
                        />
                    </div>

                    <div style={{ minWidth: 200 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Semester
                        </div>
                        <Select
                            placeholder="All Semesters"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={(val) => setSemesterFilter(val)}
                            value={semesterFilter}
                            size="large"
                        >
                            {semesters.map((s) => (
                                <Option key={s} value={s}>{s}</Option>
                            ))}
                        </Select>
                    </div>

                    {(searchText || semesterFilter) && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={fetchResults}
                            size="large"
                        >
                            Refresh
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Results Table */}
            <Card style={{ borderRadius: '10px' }}>
                {totalResults === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                        <BookOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                        <div style={{ fontSize: 16 }}>No results found for this class</div>
                        <Text type="secondary">Results will appear here once marks are entered</Text>
                    </div>
                ) : (
                    <Table
                        rowKey="_id"
                        columns={columns}
                        dataSource={filteredResults}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} results`,
                            pageSizeOptions: ['10', '20', '50'],
                        }}
                        scroll={{ x: 900 }}
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
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            <Text type="secondary">
                                Results are read-only. For corrections, please contact the administrator.
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

export default TeacherClassResults;