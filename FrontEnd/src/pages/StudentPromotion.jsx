import React, { useState, useEffect } from 'react';
import {
    Table, Button, Select, Space, Tag, Modal, Form, Input,
    message, Card, Row, Col, Alert, Typography, Divider, Popconfirm
} from 'antd';
import {
    SwapRightOutlined, TeamOutlined, SolutionOutlined, CheckCircleOutlined,
    ReloadOutlined, ArrowRightOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const StudentPromotion = () => {
    const [classes, setClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [sourceClassId, setSourceClassId] = useState(null);
    const [targetClassId, setTargetClassId] = useState(null);
    const [targetSessionId, setTargetSessionId] = useState(null);
    const [students, setStudents] = useState([]);
    const [promotionRows, setPromotionRows] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [summaryResult, setSummaryResult] = useState(null);

    const extractErrorMessage = (error) => {
        if (error.response?.data?.message) return error.response.data.message;
        return error.message || 'Operation failed';
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [classRes, sessionRes] = await Promise.all([
                axios.get('/api/v1/classes', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/v1/academic-sessions', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (classRes.data?.data) setClasses(classRes.data.data);
            if (sessionRes.data?.data) {
                setSessions(sessionRes.data.data);
                const active = sessionRes.data.data.find(s => s.isCurrent);
                if (active) setTargetSessionId(active._id);
            }
        } catch (error) {
            message.error(extractErrorMessage(error));
        }
    };

    const handleSourceClassChange = async (classId) => {
        setSourceClassId(classId);
        setSummaryResult(null);
        if (!classId) {
            setStudents([]);
            setPromotionRows([]);
            return;
        }

        setLoadingStudents(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/v1/students/class/${classId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.data) {
                const fetched = res.data.data.filter(s => s.status === 'ACTIVE' || s.status === 'PROMOTED');
                setStudents(fetched);
                // Initialize default promotion rows
                const rows = fetched.map(s => ({
                    studentId: s._id,
                    studentName: s.studentName,
                    currentRollNo: s.rollNo,
                    action: 'PROMOTE',
                    newRollNo: s.rollNo,
                    remarks: ''
                }));
                setPromotionRows(rows);
            }
        } catch (error) {
            message.error(extractErrorMessage(error));
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleActionChange = (studentId, action) => {
        setPromotionRows(prev => prev.map(row => {
            if (row.studentId === studentId) {
                return { ...row, action };
            }
            return row;
        }));
    };

    const handleRollNoChange = (studentId, newRollNo) => {
        setPromotionRows(prev => prev.map(row => {
            if (row.studentId === studentId) {
                return { ...row, newRollNo };
            }
            return row;
        }));
    };

    const handleRemarksChange = (studentId, remarks) => {
        setPromotionRows(prev => prev.map(row => {
            if (row.studentId === studentId) {
                return { ...row, remarks };
            }
            return row;
        }));
    };

    const handleBulkPromote = async () => {
        if (!sourceClassId) {
            message.error('Please select Source Class');
            return;
        }
        if (!targetSessionId) {
            message.error('Please select Target Academic Session');
            return;
        }
        if (promotionRows.length === 0) {
            message.error('No active students found in the selected source class');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                sourceClassId,
                targetClassId: targetClassId || null,
                targetSessionId,
                promotions: promotionRows.map(r => ({
                    studentId: r.studentId,
                    action: r.action,
                    newRollNo: r.newRollNo,
                    remarks: r.remarks
                }))
            };

            const res = await axios.post('/api/v1/students/bulk-promote', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.data) {
                setSummaryResult(res.data.data);
                message.success('Bulk Student Promotion executed successfully!');
                // Refresh list
                handleSourceClassChange(sourceClassId);
            }
        } catch (error) {
            message.error(extractErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const setAllActions = (action) => {
        setPromotionRows(prev => prev.map(row => ({ ...row, action })));
    };

    const columns = [
        {
            title: 'Current Roll No',
            dataIndex: 'currentRollNo',
            key: 'currentRollNo',
            width: 140,
            render: text => <Text strong>{text}</Text>
        },
        {
            title: 'Student Name',
            dataIndex: 'studentName',
            key: 'studentName',
            render: text => <Text style={{ fontSize: '15px' }}>{text}</Text>
        },
        {
            title: 'Promotion Decision',
            key: 'action',
            width: 180,
            render: (_, record) => (
                <Select
                    value={record.action}
                    onChange={val => handleActionChange(record.studentId, val)}
                    style={{ width: '100%' }}
                >
                    <Option value="PROMOTE">
                        <Tag color="green">PROMOTE</Tag>
                    </Option>
                    <Option value="RETAIN">
                        <Tag color="orange">RETAIN (Repeat)</Tag>
                    </Option>
                    <Option value="GRADUATE">
                        <Tag color="blue">GRADUATE (Alumni)</Tag>
                    </Option>
                </Select>
            )
        },
        {
            title: 'New Session Roll No',
            key: 'newRollNo',
            width: 160,
            render: (_, record) => (
                <Input
                    value={record.newRollNo}
                    onChange={e => handleRollNoChange(record.studentId, e.target.value)}
                    placeholder="New Roll No"
                    disabled={record.action === 'GRADUATE'}
                />
            )
        },
        {
            title: 'Remarks / Notes',
            key: 'remarks',
            render: (_, record) => (
                <Input
                    value={record.remarks}
                    onChange={e => handleRemarksChange(record.studentId, e.target.value)}
                    placeholder="Remarks (e.g., Passed with A Grade)"
                />
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
            <div style={{ marginBottom: '24px' }}>
                <Title level={2} style={{ margin: 0 }}>
                    <SolutionOutlined style={{ marginRight: '10px', color: '#52c41a' }} />
                    Bulk Student Promotion & Retention Engine
                </Title>
                <Text type="secondary">
                    Promote batch of students to the next grade level, retain repeating students, or archive graduating alumni for a new academic year.
                </Text>
            </div>

            {summaryResult && (
                <Alert
                    message="Batch Promotion Summary"
                    description={
                        <div>
                            <Text strong>Promoted: </Text><Tag color="green">{summaryResult.promotedCount}</Tag>
                            <Text strong style={{ marginLeft: '16px' }}>Retained: </Text><Tag color="orange">{summaryResult.retainedCount}</Tag>
                            <Text strong style={{ marginLeft: '16px' }}>Graduated: </Text><Tag color="blue">{summaryResult.graduatedCount}</Tag>
                        </div>
                    }
                    type="success"
                    showIcon
                    closable
                    style={{ marginBottom: '24px' }}
                />
            )}

            <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
                <Title level={4} style={{ marginBottom: '16px' }}>1. Select Session & Class Transition</Title>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={7}>
                        <Form.Item label={<Text strong>From Source Class</Text>} style={{ marginBottom: 0 }}>
                            <Select
                                placeholder="Select Source Class"
                                value={sourceClassId}
                                onChange={handleSourceClassChange}
                                style={{ width: '100%' }}
                            >
                                {classes.map(c => (
                                    <Option key={c._id} value={c._id}>{c.name} {c.section ? `(${c.section})` : ''}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={2} style={{ textAlign: 'center' }}>
                        <ArrowRightOutlined style={{ fontSize: '24px', color: '#1890ff', marginTop: '24px' }} />
                    </Col>

                    <Col xs={24} md={7}>
                        <Form.Item label={<Text strong>To Target Academic Session</Text>} style={{ marginBottom: 0 }}>
                            <Select
                                placeholder="Select Target Session"
                                value={targetSessionId}
                                onChange={setTargetSessionId}
                                style={{ width: '100%' }}
                            >
                                {sessions.map(s => (
                                    <Option key={s._id} value={s._id}>
                                        {s.name} {s.isCurrent ? '(Active Current)' : ''}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                        <Form.Item label={<Text strong>To Target Destination Class</Text>} style={{ marginBottom: 0 }}>
                            <Select
                                placeholder="Select Destination Class (or none if graduating)"
                                value={targetClassId}
                                onChange={setTargetClassId}
                                style={{ width: '100%' }}
                                allowClear
                            >
                                {classes.map(c => (
                                    <Option key={c._id} value={c._id}>{c.name} {c.section ? `(${c.section})` : ''}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            {sourceClassId && (
                <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                        <Col>
                            <Space>
                                <Title level={4} style={{ margin: 0 }}>2. Student Batch Roster ({promotionRows.length} Students)</Title>
                                <Button size="small" onClick={() => setAllActions('PROMOTE')}>Set All to PROMOTE</Button>
                                <Button size="small" onClick={() => setAllActions('RETAIN')}>Set All to RETAIN</Button>
                                <Button size="small" onClick={() => setAllActions('GRADUATE')}>Set All to GRADUATE</Button>
                            </Space>
                        </Col>
                        <Col>
                            <Popconfirm
                                title="Execute Bulk Promotion for all students listed below?"
                                onConfirm={handleBulkPromote}
                                okText="Yes, Execute"
                                cancelText="Cancel"
                            >
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<CheckCircleOutlined />}
                                    loading={submitting}
                                >
                                    Execute Batch Promotion
                                </Button>
                            </Popconfirm>
                        </Col>
                    </Row>

                    <Table
                        columns={columns}
                        dataSource={promotionRows}
                        rowKey="studentId"
                        loading={loadingStudents}
                        pagination={false}
                    />
                </Card>
            )}
        </div>
    );
};

export default StudentPromotion;
