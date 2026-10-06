import React, { useState, useEffect } from 'react';
import {
    Table, Button, Input, Space, Tag, Modal, Form, Select,
    message, Card, Row, Col, Popconfirm, DatePicker, Typography, Badge, Tooltip
} from 'antd';
import {
    PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, CalendarOutlined, CheckCircleOutlined, StarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

// Helper Statistic component wrapper (must be defined before usage)
const StatisticCard = ({ title, value, prefix, valueStyle }) => (
    <div>
        <Text type="secondary">{title}</Text>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px', ...valueStyle }}>
            {prefix} <span style={{ marginLeft: prefix ? '8px' : 0 }}>{value}</span>
        </div>
    </div>
);

const AcademicSessions = () => {
    const [sessions, setSessions] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [editingSession, setEditingSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [form] = Form.useForm();

    const extractErrorMessage = (error) => {
        if (error.response?.data?.message) return error.response.data.message;
        return error.message || 'Operation failed';
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/academic-sessions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) {
                setSessions(res.data.data);
            }
        } catch (error) {
            message.error(extractErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSetCurrent = async (id, name) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/v1/academic-sessions/${id}/set-current`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success(`Academic Session "${name}" is now the ACTIVE session!`);
            fetchSessions();
        } catch (error) {
            message.error(extractErrorMessage(error));
        }
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/academic-sessions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Academic session deleted successfully');
            fetchSessions();
        } catch (error) {
            message.error(extractErrorMessage(error));
        }
    };

    const openModal = (session = null) => {
        setEditingSession(session);
        if (session) {
            form.setFieldsValue({
                name: session.name,
                dateRange: [dayjs(session.startDate), dayjs(session.endDate)],
                status: session.status,
                isCurrent: session.isCurrent,
                description: session.description
            });
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const handleFormSubmit = async (values) => {
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                name: values.name,
                startDate: values.dateRange[0].format('YYYY-MM-DD'),
                endDate: values.dateRange[1].format('YYYY-MM-DD'),
                status: values.status || 'UPCOMING',
                isCurrent: values.isCurrent || false,
                description: values.description || ''
            };

            if (editingSession) {
                await axios.patch(`/api/v1/academic-sessions/${editingSession._id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('Academic Session updated successfully');
            } else {
                await axios.post('/api/v1/academic-sessions', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('Academic Session created successfully');
            }
            setIsModalVisible(false);
            fetchSessions();
        } catch (error) {
            message.error(extractErrorMessage(error));
        } finally {
            setSubmitLoading(false);
        }
    };

    const filteredSessions = sessions.filter(s =>
        s.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchText.toLowerCase()))
    );

    const currentSession = sessions.find(s => s.isCurrent);

    const columns = [
        {
            title: 'Session Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <Text strong style={{ fontSize: '15px' }}>{text}</Text>
                    {record.isCurrent && (
                        <Tag color="gold" icon={<StarOutlined />}>Current Active</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Start Date',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (date) => dayjs(date).format('DD MMM YYYY'),
        },
        {
            title: 'End Date',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (date) => dayjs(date).format('DD MMM YYYY'),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'blue';
                if (status === 'ACTIVE') color = 'green';
                if (status === 'COMPLETED') color = 'gray';
                return <Tag color={color}>{status}</Tag>;
            },
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (desc) => desc || <Text type="secondary">-</Text>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    {!record.isCurrent && (
                        <Tooltip title="Set as Current Active Session">
                            <Button
                                type="primary"
                                ghost
                                icon={<CheckCircleOutlined />}
                                size="small"
                                onClick={() => handleSetCurrent(record._id, record.name)}
                            >
                                Set Current
                            </Button>
                        </Tooltip>
                    )}
                    <Button
                        type="text"
                        icon={<EditOutlined style={{ color: '#1890ff' }} />}
                        onClick={() => openModal(record)}
                    />
                    <Popconfirm
                        title="Are you sure you want to delete this session?"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
            <div style={{ marginBottom: '24px' }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={2} style={{ margin: 0 }}>
                            <CalendarOutlined style={{ marginRight: '10px', color: '#1890ff' }} />
                            Academic Session Management
                        </Title>
                        <Text type="secondary">Define school academic years, term durations, and set active session scope.</Text>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchSessions}>Refresh</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                                Create Academic Session
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <StatisticCard
                            title="Total Academic Sessions"
                            value={sessions.length}
                            prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #faad14' }}>
                        <Title level={5} style={{ margin: 0, color: '#8c8c8c' }}>Currently Active Session</Title>
                        <Title level={3} style={{ marginTop: '8px', marginBottom: 0, color: '#faad14' }}>
                            {currentSession ? currentSession.name : 'None Selected'}
                        </Title>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <StatisticCard
                            title="Upcoming Sessions"
                            value={sessions.filter(s => s.status === 'UPCOMING').length}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ marginBottom: '16px' }}>
                    <Input
                        placeholder="Search session name or description..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: '320px' }}
                        allowClear
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredSessions}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                />
            </Card>

            <Modal
                title={editingSession ? "Edit Academic Session" : "Create New Academic Session"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={submitLoading}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFormSubmit}
                    initialValues={{ status: 'UPCOMING', isCurrent: false }}
                >
                    <Form.Item
                        name="name"
                        label="Session Name / Year"
                        rules={[{ required: true, message: 'Please enter session name (e.g. 2024-2025)' }]}
                    >
                        <Input placeholder="e.g. 2024-2025 or Spring 2025" />
                    </Form.Item>

                    <Form.Item
                        name="dateRange"
                        label="Session Duration (Start & End Date)"
                        rules={[{ required: true, message: 'Please select start and end dates' }]}
                    >
                        <DatePicker.RangePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>

                    <Form.Item name="status" label="Status">
                        <Select>
                            <Option value="UPCOMING">UPCOMING</Option>
                            <Option value="ACTIVE">ACTIVE</Option>
                            <Option value="COMPLETED">COMPLETED</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="description" label="Description / Notes">
                        <Input.TextArea rows={3} placeholder="Optional notes for this session" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AcademicSessions;
