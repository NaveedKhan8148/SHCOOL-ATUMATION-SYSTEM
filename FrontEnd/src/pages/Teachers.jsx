import React, { useState, useEffect, useMemo } from 'react';
import { 
    Table, Button, Input, Space, Tag, Modal, Form, Select, 
    message, Card, Row, Col, Spin, Popconfirm, Tooltip, 
    Avatar, Typography, Badge 
} from 'antd';
import { 
    PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, 
    ReloadOutlined, UserOutlined, MailOutlined, PhoneOutlined,
    BookOutlined, IdcardOutlined, CalendarOutlined, SaveOutlined,
    TeamOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Teachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [editingTeacher, setEditingTeacher] = useState(null);
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
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
    setLoading(true);
    try {
        const res = await axios.get('/api/v1/teachers/');
        const teachersData = res.data.data?.teachers || res.data.data || [];
        
        const formattedTeachers = teachersData.map((teacher) => ({
            key: teacher._id,
            _id: teacher._id,
            name: teacher.name || '',
            contactNumber: teacher.contactNumber || '',
            email: teacher.userId?.email || '',
            subject: teacher.subject || '',
            dateOfJoining: teacher.dateOfJoining || '',
            cnicNumber: teacher.cnicNumber || '',
            address: teacher.address || '',
            // FIX: Check teacher.status first, then fallback to userId.status
            status: teacher.status || teacher.userId?.status || 'ACTIVE',
            userId: teacher.userId,
            createdAt: teacher.createdAt,
            updatedAt: teacher.updatedAt,
        }));
        
        setTeachers(formattedTeachers);
    } catch (err) {
        const errorMsg = extractErrorMessage(err);
        console.error('Error fetching teachers:', errorMsg);
        message.error(errorMsg);
        setTeachers([]);
    } finally {
        setLoading(false);
    }
};

    // Filter teachers based on search
    const filteredTeachers = useMemo(() => {
        if (!searchText) return teachers;
        
        return teachers.filter((record) =>
            (record.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.email || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.subject || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.contactNumber || '').toLowerCase().includes(searchText.toLowerCase())
        );
    }, [teachers, searchText]);

    // Statistics
    const totalTeachers = teachers.length;
    const activeTeachers = teachers.filter(t => t.status === 'ACTIVE').length;
    const inactiveTeachers = totalTeachers - activeTeachers;

    // Stats Cards (removed static fee and attendance data)
    const statsCards = [
        { 
            title: 'Total Teachers', 
            value: totalTeachers, 
            color: '#1890ff', 
            bgColor: '#e6f7ff',
            icon: <TeamOutlined />,
            subtitle: 'Registered teachers'
        },
        { 
            title: 'Active Teachers', 
            value: activeTeachers, 
            color: '#52c41a', 
            bgColor: '#f6ffed',
            icon: <CheckCircleOutlined />,
            subtitle: 'Currently active'
        },
        { 
            title: 'Inactive Teachers', 
            value: inactiveTeachers, 
            color: '#ff4d4f', 
            bgColor: '#fff2f0',
            icon: <CloseCircleOutlined />,
            subtitle: 'Inactive accounts'
        },
    ];

    // Table columns
    const columns = [
        {
            title: 'Teacher Name',
            key: 'name',
            sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
            render: (_, record) => (
                <Tooltip title={`ID: ${record._id}`}>
                    <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                            <div style={{ fontWeight: 500 }}>{record.name}</div>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.subject}</div>
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
                    <span>{record.email || '-'}</span>
                </Space>
            ),
            sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
        },
        {
            title: 'Contact Number',
            key: 'contactNumber',
            render: (_, record) => (
                <Space>
                    <PhoneOutlined style={{ color: '#8c8c8c' }} />
                    <span>{record.contactNumber || '-'}</span>
                </Space>
            ),
            sorter: (a, b) => (a.contactNumber || '').localeCompare(b.contactNumber || ''),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            render: (subject) => (
                <Tag color="cyan" icon={<BookOutlined />}>
                    {subject || '-'}
                </Tag>
            ),
            filters: [
                { text: 'Mathematics', value: 'Mathematics' },
                { text: 'Physics', value: 'Physics' },
                { text: 'Chemistry', value: 'Chemistry' },
                { text: 'Biology', value: 'Biology' },
                { text: 'English', value: 'English' },
                { text: 'Computer Science', value: 'Computer Science' },
            ],
            onFilter: (value, record) => record.subject === value,
            sorter: (a, b) => (a.subject || '').localeCompare(b.subject || ''),
        },
        {
            title: 'CNIC Number',
            key: 'cnicNumber',
            render: (_, record) => (
                <Space>
                    <IdcardOutlined style={{ color: '#8c8c8c' }} />
                    <span>{record.cnicNumber || '-'}</span>
                </Space>
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
            sorter: (a, b) => {
                if (!a.dateOfJoining) return 1;
                if (!b.dateOfJoining) return -1;
                return new Date(a.dateOfJoining) - new Date(b.dateOfJoining);
            },
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Badge 
                    color={record.status === 'ACTIVE' ? '#52c41a' : '#ff4d4f'}
                    text={record.status || 'ACTIVE'}
                />
            ),
            filters: [
                { text: 'Active', value: 'ACTIVE' },
                { text: 'Inactive', value: 'INACTIVE' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Edit Teacher">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Teacher"
                        description={`Are you sure you want to delete ${record.name}?`}
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Teacher">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Handlers
    const handleEdit = (record) => {
        setEditingTeacher(record);
        form.setFieldsValue({
            name: record.name,
            contactNumber: record.contactNumber,
            email: record.email,
            subject: record.subject,
            dateOfJoining: record.dateOfJoining ? dayjs(record.dateOfJoining).format('YYYY-MM-DD') : '',
            cnicNumber: record.cnicNumber,
            address: record.address,
            status: record.status,
        });
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/v1/teachers/${id}`);
            message.success('Teacher deleted successfully');
            fetchTeachers();
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
                contactNumber: values.contactNumber,
                email: values.email,
                subject: values.subject,
                dateOfJoining: values.dateOfJoining,
                cnicNumber: values.cnicNumber,
                address: values.address,
                status: values.status,
            };

            if (values.password && values.password.trim() !== '') {
                payload.password = values.password;
            }

            if (editingTeacher) {
                const cleanPayload = {};
                Object.keys(payload).forEach(key => {
                    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
                        cleanPayload[key] = payload[key];
                    }
                });
                
                await axios.patch(`/api/v1/teachers/${editingTeacher._id}`, cleanPayload);
                message.success('Teacher updated successfully');
            } else {
                if (!payload.password) {
                    message.error('Password is required for new teachers');
                    setSubmitLoading(false);
                    return;
                }
                
                await axios.post('/api/v1/teachers/', payload);
                message.success('Teacher added successfully');
            }

            fetchTeachers();
            handleCancel();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Error in handleSave:', err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingTeacher(null);
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
                    Teacher Management
                </Title>
                <Text type="secondary">
                    Manage teacher profiles, assign subjects, and track teacher information
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
                            placeholder="Search by name, email, subject or contact number..."
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
                            onClick={fetchTeachers}
                            loading={loading}
                        >
                            Refresh
                        </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setEditingTeacher(null);
                                form.resetFields();
                                form.setFieldsValue({ status: 'ACTIVE' });
                                setIsModalVisible(true);
                            }}
                        >
                            Add Teacher
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredTeachers}
                rowKey="_id"
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} teachers`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                }}
                scroll={{ x: 1200 }}
            />

            {/* Add/Edit Modal */}
            <Modal
                title={
                    <Space>
                        {editingTeacher ? <EditOutlined style={{ color: '#1890ff' }} /> : <PlusOutlined style={{ color: '#1890ff' }} />}
                        <span>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</span>
                    </Space>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={600}
                destroyOnClose
            >
                <Form
                    layout="vertical"
                    onFinish={handleSave}
                    form={form}
                    autoComplete='off'
                    initialValues={{
                        status: 'ACTIVE',
                    }}
                >
                    <Form.Item
                        name="name"
                        label="Teacher Name"
                        rules={[{ required: true, message: 'Please enter teacher name' }]}
                    >
                        <Input 
                            placeholder="e.g. Prof. John Smith" 
                            size="large"
                            prefix={<UserOutlined style={{ color: '#8c8c8c' }} />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Please enter a valid email' },
                        ]}
                        extra="This email will be used for login"
                    >
                        <Input 
                            placeholder="teacher@school.edu" 
                            size="large"
                            prefix={<MailOutlined style={{ color: '#8c8c8c' }} />}
                            autoComplete="new-email"
                        />
                    </Form.Item>

                    {!editingTeacher && (
                        <Form.Item
                            name="password"
                            label="Password"
                            rules={[
                                { required: true, message: 'Please enter a password' },
                                { min: 6, message: 'Password must be at least 6 characters' }
                            ]}
                            extra="Minimum 6 characters"
                        >
                            <Input.Password 
                            placeholder="Enter login password" 
                            size="large"
                            autoComplete='new-password'
                            />
                        </Form.Item>
                    )}

                    {editingTeacher && (
                        <Form.Item
                            name="password"
                            label="Password"
                            extra="Leave blank to keep current password"
                        >
                            <Input.Password placeholder="Enter new password (optional)" size="large" />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="contactNumber"
                        label="Contact Number"
                        rules={[{ required: true, message: 'Please enter contact number' }]}
                    >
                        <Input 
                            placeholder="e.g. 0300-1234567" 
                            size="large"
                            prefix={<PhoneOutlined style={{ color: '#8c8c8c' }} />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="subject"
                        label="Subject"
                        rules={[{ required: true, message: 'Please select subject' }]}
                    >
                        <Select 
                            placeholder="Select subject"
                            showSearch
                            optionFilterProp="children"
                            size="large"
                        >
                            <Option value="Mathematics">📐 Mathematics</Option>
                            <Option value="Physics">⚡ Physics</Option>
                            <Option value="Chemistry">🧪 Chemistry</Option>
                            <Option value="Biology">🧬 Biology</Option>
                            <Option value="English">📖 English</Option>
                            <Option value="Urdu">📝 Urdu</Option>
                            <Option value="Computer Science">💻 Computer Science</Option>
                            <Option value="Business Administration">📊 Business Administration</Option>
                            <Option value="Economics">💰 Economics</Option>
                            <Option value="History">🏛️ History</Option>
                            <Option value="Geography">🌍 Geography</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="cnicNumber"
                        label="CNIC Number"
                        rules={[{ required: true, message: 'Please enter CNIC number' }]}
                        extra="Format: 12345-6789012-3"
                    >
                        <Input 
                            placeholder="12345-6789012-3" 
                            size="large"
                            prefix={<IdcardOutlined style={{ color: '#8c8c8c' }} />}
                        />
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
                        name="address"
                        label="Address"
                        rules={[{ required: true, message: 'Please enter address' }]}
                    >
                        <Input.TextArea rows={3} placeholder="Complete address" />
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
                                    <span>Active Teacher</span>
                                </Space>
                            </Option>
                            <Option value="INACTIVE">
                                <Space>
                                    <Tag color="red">INACTIVE</Tag>
                                    <span>Inactive Teacher</span>
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
                            {editingTeacher ? 'Update Teacher' : 'Add Teacher'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Teachers;