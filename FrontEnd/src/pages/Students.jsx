import React, { useMemo, useState, useEffect } from 'react';
import { 
    Table, Button, Input, Space, Tag, Modal, Form, Select, 
    message, Card, Row, Col, Popconfirm, Tooltip, Avatar, Typography, Badge 
} from 'antd';
import { 
    PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, UserOutlined, MailOutlined, BookOutlined,
    CalendarOutlined, HomeOutlined, TeamOutlined, SaveOutlined,
    CheckCircleOutlined, CloseCircleOutlined, DollarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Students = () => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [editingStudent, setEditingStudent] = useState(null);
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
        fetchStudents();
        fetchClasses();
    }, []);

    const fetchStudents = async () => {
        setTableLoading(true);
        try {
            const res = await axios.get('/api/v1/students/');
            setStudents(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setTableLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/v1/classes/');
            setClasses(res.data.data?.classes || res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    // Filter students based on search
    const filteredStudents = useMemo(() => {
        if (!searchText) return students;
        
        return students.filter((record) =>
            (record.studentName || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.rollNo || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.userId?.email || '').toLowerCase().includes(searchText.toLowerCase())
        );
    }, [students, searchText]);

    // Stats
    const totalStudents = students.length;
    const inactiveStudents = students.filter(
        (student) => student.status === 'INACTIVE' || student.userId?.status === 'INACTIVE'
    ).length;
    const activeStudents = totalStudents - inactiveStudents;

    // Stats Cards (removed hardcoded fee and attendance data)
    const statsCards = [
        { 
            title: 'Total Students', 
            value: totalStudents, 
            color: '#1890ff', 
            bgColor: '#e6f7ff',
            icon: <TeamOutlined />,
            subtitle: 'Enrolled students'
        },
        { 
            title: 'Active Students', 
            value: activeStudents, 
            color: '#52c41a', 
            bgColor: '#f6ffed',
            icon: <CheckCircleOutlined />,
            subtitle: 'Currently active'
        },
        { 
            title: 'Inactive Students', 
            value: inactiveStudents, 
            color: '#ff4d4f', 
            bgColor: '#fff2f0',
            icon: <CloseCircleOutlined />,
            subtitle: 'Inactive accounts'
        },
    ];

    // Table columns
    const columns = [
        {
            title: 'Roll No',
            dataIndex: 'rollNo',
            key: 'rollNo',
            sorter: (a, b) => (a.rollNo || '').localeCompare(b.rollNo || ''),
            render: (rollNo) => (
                <Tag color="blue" icon={<BookOutlined />}>
                    {rollNo}
                </Tag>
            ),
        },
        {
            title: 'Student Name',
            key: 'studentName',
            sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || ''),
            render: (_, record) => (
                <Tooltip title={`ID: ${record._id}`}>
                    <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                            <div style={{ fontWeight: 500 }}>{record.studentName}</div>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.rollNo}</div>
                        </div>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: 'Email',
            key: 'email',
            render: (_, record) => (
                <Space>
                    <MailOutlined style={{ color: '#8c8c8c' }} />
                    <span>{record.userId?.email || '-'}</span>
                </Space>
            ),
        },
        {
            title: 'Class',
            key: 'class',
            render: (_, record) => (
                <Tag color="cyan" icon={<BookOutlined />}>
                    {record.classId?.name || 'Not Assigned'}
                </Tag>
            ),
        },
        {
            title: 'Address',
            key: 'address',
            render: (_, record) => (
                <Tooltip title={record.address || 'No address provided'}>
                    <Space>
                        <HomeOutlined style={{ color: '#8c8c8c' }} />
                        <span>{record.address ? (record.address.length > 30 ? record.address.substring(0, 30) + '...' : record.address) : '-'}</span>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: 'Date of Joining',
            key: 'dateOfJoining',
            render: (_, record) => (
                <Space>
                    <CalendarOutlined style={{ color: '#8c8c8c' }} />
                    <span>{record.dateOfJoining ? dayjs(record.dateOfJoining).format('YYYY-MM-DD') : '-'}</span>
                </Space>
            ),
            sorter: (a, b) => new Date(a.dateOfJoining) - new Date(b.dateOfJoining),
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => {
                const status = record.status || record.userId?.status || 'ACTIVE';
                return (
                    <Badge 
                        color={status === 'ACTIVE' ? '#52c41a' : '#ff4d4f'}
                        text={status}
                    />
                );
            },
            filters: [
                { text: 'Active', value: 'ACTIVE' },
                { text: 'Inactive', value: 'INACTIVE' },
            ],
            onFilter: (value, record) => {
                const status = record.status || record.userId?.status || 'ACTIVE';
                return status === value;
            },
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Edit Student">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Student"
                        description={`Are you sure you want to delete ${record.studentName}?`}
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Student">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Handlers
    const handleEdit = (record) => {
        setEditingStudent(record);
        const currentStatus = record.status || record.userId?.status || 'ACTIVE';
        
        form.setFieldsValue({
            rollNo: record.rollNo,
            studentName: record.studentName,
            address: record.address,
            classId: record.classId?._id,
            dateOfJoining: record.dateOfJoining
                ? dayjs(record.dateOfJoining).format('YYYY-MM-DD')
                : '',
            status: currentStatus,
        });
        setIsModalVisible(true);
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this student?',
            content: 'This will also delete the student login account.',
            okType: 'danger',
            onOk: async () => {
                try {
                    await axios.delete(`/api/v1/students/${id}`);
                    message.success('Student deleted successfully');
                    fetchStudents();
                } catch (err) {
                    const errorMsg = extractErrorMessage(err);
                    message.error(errorMsg);
                }
            },
        });
    };

    const handleSave = async (values) => {
        setSubmitLoading(true);
        try {
            if (editingStudent) {
                const updateData = {
                    rollNo: values.rollNo,
                    studentName: values.studentName,
                    address: values.address,
                    classId: values.classId,
                    dateOfJoining: values.dateOfJoining,
                };
                
                if (values.status) {
                    updateData.status = values.status;
                }
                
                await axios.patch(`/api/v1/students/${editingStudent._id}`, updateData);
                message.success('Student updated successfully');
            } else {
                await axios.post('/api/v1/students/', {
                    email: values.email,
                    password: values.password,
                    rollNo: values.rollNo,
                    studentName: values.studentName,
                    address: values.address,
                    classId: values.classId,
                    dateOfJoining: values.dateOfJoining,
                    status: values.status || 'ACTIVE',
                });
                message.success('Student created successfully');
            }
            fetchStudents();
            handleCancel();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Save error:', err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingStudent(null);
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
                    Student Management
                </Title>
                <Text type="secondary">
                    Manage student profiles, track attendance, and monitor academic progress
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
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: card.color }}>
                                        {card.value}
                                    </div>
                                    {card.subtitle && (
                                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                            {card.subtitle}
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '40px', color: card.color }}>
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
                            placeholder="Search by name, roll number or email..."
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
                            onClick={fetchStudents}
                            loading={tableLoading}
                        >
                            Refresh
                        </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setEditingStudent(null);
                                form.resetFields();
                                form.setFieldsValue({ status: 'ACTIVE' });
                                setIsModalVisible(true);
                            }}
                        >
                            Add Student
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredStudents}
                rowKey="_id"
                loading={tableLoading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} students`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                }}
                scroll={{ x: 1200 }}
            />

            {/* Add/Edit Modal */}
            <Modal
                title={
                    <Space>
                        {editingStudent ? <EditOutlined style={{ color: '#1890ff' }} /> : <PlusOutlined style={{ color: '#1890ff' }} />}
                        <span>{editingStudent ? 'Edit Student' : 'Add New Student'}</span>
                    </Space>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={600}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={handleSave} form={form} autoComplete="off">
                    <Form.Item
                        name="rollNo"
                        label="Roll Number"
                        rules={[{ required: true, message: 'Please enter roll number' }]}
                    >
                        <Input 
                            placeholder="e.g. 2024-CS-001" 
                            size="large"
                            prefix={<BookOutlined style={{ color: '#8c8c8c' }} />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="studentName"
                        label="Student Name"
                        rules={[{ required: true, message: 'Please enter student name' }]}
                    >
                        <Input 
                            placeholder="Enter full name" 
                            size="large"
                            prefix={<UserOutlined style={{ color: '#8c8c8c' }} />}
                            autoComplete="new-name"
                        />
                    </Form.Item>

                    {!editingStudent && (
                        <>
                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[
                                    { required: true, message: 'Please enter email' },
                                    { type: 'email', message: 'Please enter a valid email' },
                                ]}
                            >
                                <Input 
                                    placeholder="student@school.edu" 
                                    size="large"
                                    prefix={<MailOutlined style={{ color: '#8c8c8c' }} />}
                                    autoComplete="new-email"
                                />
                            </Form.Item>

                            <Form.Item
                                name="password"
                                label="Password"
                                rules={[
                                    { required: true, message: 'Please enter a password' },
                                    { min: 6, message: 'Password must be at least 6 characters' }
                                ]}
                            >
                                <Input.Password placeholder="Temporary password" size="large"
                                autoComplete='new-password'
                                />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item
                        name="classId"
                        label="Class"
                        rules={[{ required: true, message: 'Please select a class' }]}
                    >
                        <Select 
                            placeholder="Select a class" 
                            loading={classes.length === 0}
                            showSearch
                            optionFilterProp="children"
                            size="large"
                        >
                            {classes.map((cls) => (
                                <Option key={cls._id} value={cls._id}>
                                    <BookOutlined /> {cls.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="address" label="Address">
                        <Input.TextArea rows={2} placeholder="Enter student address" />
                    </Form.Item>

                    <Form.Item
                        name="dateOfJoining"
                        label="Date of Joining"
                        rules={[{ required: true, message: 'Please enter date of joining' }]}
                    >
                        <Input 
                            type="date" 
                            size="large"
                            prefix={<CalendarOutlined style={{ color: '#8c8c8c' }} />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="status"
                        label="Status"
                        rules={[{ required: true, message: 'Please select status' }]}
                    >
                        <Select placeholder="Select status" size="large">
                            <Option value="ACTIVE">
                                <Space>
                                    <Tag color="green">ACTIVE</Tag>
                                    <span>Active Student</span>
                                </Space>
                            </Option>
                            <Option value="INACTIVE">
                                <Space>
                                    <Tag color="red">INACTIVE</Tag>
                                    <span>Inactive Student</span>
                                </Space>
                            </Option>
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
                            {editingStudent ? 'Update Student' : 'Add Student'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Students;