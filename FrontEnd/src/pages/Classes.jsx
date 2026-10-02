import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Input, Space, Tag, Modal, Form, Select,
    message, Card, Row, Col, Popconfirm, Tooltip, Avatar, Typography, Badge, DatePicker
} from 'antd';
import {
    PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, BookOutlined, UserOutlined, TeamOutlined,
    SaveOutlined, ClockCircleOutlined, CalendarOutlined, PartitionOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Classes = () => {
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [editingClass, setEditingClass] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [form] = Form.useForm();

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
        fetchTeachers();
    }, []);

    const fetchClasses = async () => {
        setTableLoading(true);
        try {
            const res = await axios.get('/api/v1/classes/');
            setClasses(res.data.data?.classes || res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setTableLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const res = await axios.get('/api/v1/teachers/');
            setTeachers(res.data.data?.teachers || res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    // Filter classes based on search
    const filteredClasses = useMemo(() => {
        if (!searchText) return classes;
        
        return classes.filter((record) =>
            (record.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.section || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.academicYear || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.classTeacherId?.name || '').toLowerCase().includes(searchText.toLowerCase())
        );
    }, [classes, searchText]);

    // Stats
    const totalClasses = classes.length;
    const totalTeachers = teachers.length;
    const classesWithTeacher = classes.filter(c => c.classTeacherId).length;
    const classesWithoutTeacher = totalClasses - classesWithTeacher;

    // Stats Cards
    const statsCards = [
        { 
            title: 'Total Classes', 
            value: totalClasses, 
            color: '#1890ff', 
            bgColor: '#e6f7ff',
            icon: <BookOutlined />,
            subtitle: 'Active classes'
        },
        { 
            title: 'Total Teachers', 
            value: totalTeachers, 
            color: '#faad14', 
            bgColor: '#fff7e6',
            icon: <UserOutlined />,
            subtitle: 'Available teachers'
        },
        { 
            title: 'Classes with Teacher', 
            value: classesWithTeacher, 
            color: '#52c41a', 
            bgColor: '#f6ffed',
            icon: <TeamOutlined />,
            subtitle: 'Assigned'
        },
        { 
            title: 'Classes without Teacher', 
            value: classesWithoutTeacher, 
            color: '#ff4d4f', 
            bgColor: '#fff2f0',
            icon: <UserOutlined />,
            subtitle: 'Pending assignment'
        },
    ];

    // Table columns
    const columns = [
        {
            title: 'Class Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (name) => (
                <Space>
                    <BookOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontWeight: 500 }}>{name}</span>
                </Space>
            ),
        },
        {
            title: 'Section',
            dataIndex: 'section',
            key: 'section',
            width: 100,
            render: (section) => section ? (
                <Tag color="blue" icon={<PartitionOutlined />}>{section}</Tag>
            ) : (
                <Text type="secondary">—</Text>
            ),
        },
        {
            title: 'Academic Year',
            dataIndex: 'academicYear',
            key: 'academicYear',
            width: 120,
            render: (academicYear) => academicYear ? (
                <Tag color="purple" icon={<CalendarOutlined />}>
                    {dayjs(academicYear).format('YYYY')}
                </Tag>
            ) : (
                <Text type="secondary">—</Text>
            ),
        },
        {
            title: 'Class Teacher',
            key: 'classTeacher',
            render: (_, record) => {
                const teacher = record.classTeacherId;
                if (teacher?.name) {
                    return (
                        <Tooltip title={`Subject: ${teacher.subject || 'N/A'}`}>
                            <Space>
                                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                                <div>
                                    <div style={{ fontWeight: 500 }}>{teacher.name}</div>
                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{teacher.subject || 'Teacher'}</div>
                                </div>
                            </Space>
                        </Tooltip>
                    );
                }
                return (
                    <Tag color="default" icon={<ClockCircleOutlined />}>
                        Not Assigned
                    </Tag>
                );
            },
        },
        {
            title: 'Subject',
            key: 'subject',
            render: (_, record) => {
                const subject = record.classTeacherId?.subject;
                return subject ? (
                    <Tag color="cyan">{subject}</Tag>
                ) : (
                    <Text type="secondary">—</Text>
                );
            },
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Badge 
                    color={record.classTeacherId ? '#52c41a' : '#faad14'}
                    text={record.classTeacherId ? 'Active' : 'Pending'}
                />
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Edit Class">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Class"
                        description="Are you sure you want to delete this class? This will also affect all students in this class."
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Class">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Handlers
    const handleEdit = (record) => {
        setEditingClass(record);
        form.setFieldsValue({
            name: record.name,
            section: record.section,
            academicYear: record.academicYear ? dayjs(record.academicYear) : null,
            classTeacherId: record.classTeacherId?._id,
        });
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/v1/classes/${id}`);
            message.success('Class deleted successfully');
            fetchClasses();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const handleSave = async (values) => {
        setSubmitLoading(true);
        try {
            const payload = {
                name: values.name,
                section: values.section,
                academicYear: values.academicYear ? dayjs(values.academicYear).format('YYYY-MM-DD') : null,
                classTeacherId: values.classTeacherId,
            };

            if (editingClass) {
                await axios.patch(`/api/v1/classes/${editingClass._id}`, payload);
                message.success('Class updated successfully');
                fetchClasses();
                handleCancel();
            } else {
                await axios.post('/api/v1/classes/', payload);
                message.success('Class created successfully');
                fetchClasses();
                handleCancel();
            }
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingClass(null);
        form.resetFields();
    };

    const clearSearch = () => {
        setSearchText('');
    };

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Class Management
                </Title>
                <Text type="secondary">
                    Manage classes, assign teachers, and track class information
                </Text>
            </div>

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
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: card.color }}>
                                        {card.value}
                                    </div>
                                    {card.subtitle && (
                                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                            {card.subtitle}
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '48px', color: card.color }}>
                                    {card.icon}
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Filters Card */}
            <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                <Space wrap size="middle" style={{ width: '100%' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Search
                        </div>
                        <Input
                            placeholder="Search by class name, section, or teacher..."
                            prefix={<SearchOutlined />}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                            value={searchText}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {searchText && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button onClick={clearSearch}>
                                Clear Search
                            </Button>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchClasses}
                        >
                            Refresh
                        </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setEditingClass(null);
                                form.resetFields();
                                setIsModalVisible(true);
                            }}
                        >
                            Add Class
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredClasses}
                rowKey="_id"
                loading={tableLoading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} classes`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                }}
                scroll={{ x: 1000 }}
            />

            {/* Add/Edit Modal */}
            <Modal
                title={
                    <Space>
                        {editingClass ? <EditOutlined style={{ color: '#1890ff' }} /> : <PlusOutlined style={{ color: '#1890ff' }} />}
                        <span>{editingClass ? 'Edit Class' : 'Add New Class'}</span>
                    </Space>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={500}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={handleSave} form={form}>
                    <Form.Item
                        name="name"
                        label="Class Name"
                        rules={[{ required: true, message: 'Please enter class name' }]}
                    >
                        <Input 
                            placeholder="e.g., Grade 10, Class 5, O-Level" 
                            size="large"
                            prefix={<BookOutlined style={{ color: '#8c8c8c' }} />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="section"
                        label="Section"
                        rules={[{ required: true, message: 'Please enter section' }]}
                    >
                        <Input 
                            placeholder="e.g., A, B, C, Science, Arts" 
                            size="large"
                            prefix={<PartitionOutlined style={{ color: '#8c8c8c' }} />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="academicYear"
                        label="Academic Year"
                        rules={[{ required: true, message: 'Please select academic year' }]}
                    >
                        <DatePicker 
                            style={{ width: '100%' }}
                            size="large"
                            picker="year"
                            placeholder="Select academic year"
                            format="YYYY"
                            suffixIcon={<CalendarOutlined />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="classTeacherId"
                        label="Class Teacher"
                        rules={[{ required: true, message: 'Please select a class teacher' }]}
                    >
                        <Select
                            placeholder="Select class teacher"
                            showSearch
                            optionFilterProp="children"
                            loading={teachers.length === 0}
                            size="large"
                        >
                            {teachers.map((teacher) => (
                                <Option key={teacher._id} value={teacher._id}>
                                    <Space>
                                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                                        <span>{teacher.name}</span>
                                        <Tag color="cyan">{teacher.subject || 'Teacher'}</Tag>
                                    </Space>
                                </Option>
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
                            icon={<SaveOutlined />}
                        >
                            {editingClass ? 'Update Class' : 'Create Class'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Classes;