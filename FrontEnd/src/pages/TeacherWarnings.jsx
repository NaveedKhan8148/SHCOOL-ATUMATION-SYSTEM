import React, { useState, useEffect, useMemo } from 'react';
import { Table, Typography, Tag, Spin, Card, Space, Avatar, Tooltip, message, Button } from 'antd';
import { 
    WarningOutlined, UserOutlined, ReloadOutlined, 
    ExclamationCircleOutlined, ClockCircleOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const TeacherWarnings = () => {
    const { user, profile, loading: authLoading } = useAuth();
    const [warnings, setWarnings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [classes, setClasses] = useState([]);

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
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchWarnings();
        } else {
            setWarnings([]);
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/v1/classes/');
            setClasses(res.data.data?.classes || res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const fetchWarnings = async () => {
        setLoading(true);
        try {
            // Fetch warnings for the selected class
            const res = await axios.get(`/api/v1/warnings/class/${selectedClass}`);
            const warningsData = res.data.data || [];
            
            // Enrich warnings with student details
            const enriched = await Promise.all(
                warningsData.map(async (warning) => {
                    let studentName = '-';
                    let rollNo = '-';
                    
                    try {
                        const studentRes = await axios.get(`/api/v1/students/${warning.studentId}`);
                        studentName = studentRes.data.data?.studentName || '-';
                        rollNo = studentRes.data.data?.rollNo || '-';
                    } catch {
                        // Student not found
                    }
                    
                    return {
                        ...warning,
                        studentName,
                        rollNo,
                    };
                })
            );
            
            setWarnings(enriched);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
            setWarnings([]);
        } finally {
            setLoading(false);
        }
    };

    // Statistics
    const totalWarnings = warnings.length;
    const highSeverityCount = warnings.filter(w => w.severity === 'high').length;
    const mediumSeverityCount = warnings.filter(w => w.severity === 'medium').length;
    const lowSeverityCount = warnings.filter(w => w.severity === 'low').length;

    const getSeverityConfig = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high':
                return { color: '#ff4d4f', bgColor: '#fff2f0', icon: <ExclamationCircleOutlined /> };
            case 'medium':
                return { color: '#faad14', bgColor: '#fff7e6', icon: <WarningOutlined /> };
            case 'low':
                return { color: '#1890ff', bgColor: '#e6f7ff', icon: <ClockCircleOutlined /> };
            default:
                return { color: '#8c8c8c', bgColor: '#fafafa', icon: <WarningOutlined /> };
        }
    };

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
            title: 'Rule Violated',
            dataIndex: 'ruleViolated',
            key: 'ruleViolated',
            render: (rule) => (
                <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                    {rule}
                </Tag>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'detailDescription',
            key: 'detailDescription',
            ellipsis: true,
            render: (text) => (
                <Tooltip title={text}>
                    <span>{text?.length > 60 ? text.substring(0, 60) + '...' : text}</span>
                </Tooltip>
            ),
        },
        {
            title: 'Severity',
            dataIndex: 'severity',
            key: 'severity',
            render: (severity) => {
                const config = getSeverityConfig(severity);
                return (
                    <Tag 
                        color={config.color}
                        style={{ 
                            backgroundColor: config.bgColor,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontWeight: 500
                        }}
                        icon={config.icon}
                    >
                        {severity?.toUpperCase() || 'MEDIUM'}
                    </Tag>
                );
            },
            filters: [
                { text: 'High', value: 'high' },
                { text: 'Medium', value: 'medium' },
                { text: 'Low', value: 'low' },
            ],
            onFilter: (value, record) => record.severity?.toLowerCase() === value,
        },
        {
            title: 'Warning Date',
            dataIndex: 'warningDate',
            key: 'warningDate',
            render: (date) => (
                <Tooltip title={date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}>
                    <Space>
                        <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                        <span>{date ? dayjs(date).format('YYYY-MM-DD') : '-'}</span>
                    </Space>
                </Tooltip>
            ),
            sorter: (a, b) => dayjs(a.warningDate).unix() - dayjs(b.warningDate).unix(),
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
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Academic Warnings
                </Title>
                <Text type="secondary">
                    Track academic warnings issued to students in your classes
                </Text>
            </div>

            {/* Class Selector */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                    Select Class
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select 
                        className="ant-select-selector"
                        style={{ 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            border: '1px solid #d9d9d9',
                            minWidth: 200,
                            fontSize: 14
                        }}
                        value={selectedClass || ''}
                        onChange={(e) => setSelectedClass(e.target.value || null)}
                    >
                        <option value="">Select a class</option>
                        {classes.map((cls) => (
                            <option key={cls._id} value={cls._id}>
                                {cls.name} {cls.section ? `- ${cls.section}` : ''}
                            </option>
                        ))}
                    </select>
                    
                    <Button 
                        icon={<ReloadOutlined />} 
                        onClick={fetchWarnings}
                        disabled={!selectedClass}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {selectedClass && totalWarnings > 0 && (
                <div style={{ 
                    display: 'flex', 
                    gap: 16, 
                    marginBottom: 16, 
                    flexWrap: 'wrap' 
                }}>
                    <Card size="small" style={{ flex: 1, textAlign: 'center', backgroundColor: '#fff2f0', borderTop: '4px solid #ff4d4f' }}>
                        <Text type="secondary">Total Warnings</Text>
                        <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>{totalWarnings}</div>
                    </Card>
                    <Card size="small" style={{ flex: 1, textAlign: 'center', backgroundColor: '#fff2f0', borderTop: '4px solid #ff4d4f' }}>
                        <Text type="secondary">High Severity</Text>
                        <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>{highSeverityCount}</div>
                    </Card>
                    <Card size="small" style={{ flex: 1, textAlign: 'center', backgroundColor: '#fff7e6', borderTop: '4px solid #faad14' }}>
                        <Text type="secondary">Medium Severity</Text>
                        <div style={{ fontSize: 28, fontWeight: 'bold', color: '#faad14' }}>{mediumSeverityCount}</div>
                    </Card>
                    <Card size="small" style={{ flex: 1, textAlign: 'center', backgroundColor: '#e6f7ff', borderTop: '4px solid #1890ff' }}>
                        <Text type="secondary">Low Severity</Text>
                        <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>{lowSeverityCount}</div>
                    </Card>
                </div>
            )}

            {/* Warnings Table */}
            {!selectedClass ? (
                <Card style={{ borderRadius: '10px' }}>
                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                        <WarningOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                        <div style={{ fontSize: 16 }}>Select a class to view warnings</div>
                    </div>
                </Card>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : warnings.length === 0 ? (
                <Card style={{ borderRadius: '10px' }}>
                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                        <CheckCircleOutlined style={{ fontSize: 64, marginBottom: 16, color: '#52c41a' }} />
                        <div style={{ fontSize: 16 }}>No warnings found for this class</div>
                        <Text type="secondary">All students are in good standing</Text>
                    </div>
                </Card>
            ) : (
                <Table 
                    rowKey="_id" 
                    columns={columns} 
                    dataSource={warnings} 
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} warnings`,
                        pageSizeOptions: ['10', '20', '50'],
                    }}
                    scroll={{ x: 1000 }}
                />
            )}

            {/* Footer Note */}
            {selectedClass && warnings.length > 0 && (
                <Card 
                    style={{ marginTop: 16, borderRadius: '10px', backgroundColor: '#f0f5ff' }}
                    bodyStyle={{ padding: '12px 16px' }}
                >
                    <Space>
                        <ExclamationCircleOutlined style={{ color: '#1890ff' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Warnings are generated based on attendance, academic performance, and conduct rules.
                            For any corrections, please contact the academic coordinator.
                        </Text>
                    </Space>
                </Card>
            )}
        </div>
    );
};

export default TeacherWarnings;