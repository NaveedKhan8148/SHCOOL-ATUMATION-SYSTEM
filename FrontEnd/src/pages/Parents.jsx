import React, { useState, useEffect, useMemo } from 'react';
import { 
    Table, Button, Input, Space, Tag, Modal, Form, Select, 
    message, Card, Row, Col, Popconfirm, Tooltip, Avatar, Typography, Badge 
} from 'antd';
import { 
    PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, 
    LinkOutlined, ReloadOutlined, UserOutlined, MailOutlined,
    PhoneOutlined, IdcardOutlined, SaveOutlined, TeamOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const Parents = () => {
    const [parents, setParents] = useState([]);
    const [students, setStudents] = useState([]);
    const [linkedStudentsMap, setLinkedStudentsMap] = useState({});
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [editingParent, setEditingParent] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [form] = Form.useForm();
    const [linkForm] = Form.useForm();

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
        fetchParents();
        fetchStudents();
    }, []);

    const fetchParents = async () => {
        setTableLoading(true);
        try {
            const res = await axios.get('/api/v1/parents/');
            const parentsData = res.data.data || [];
            setParents(parentsData);
            fetchAllLinkedStudents(parentsData);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setTableLoading(false);
        }
    };

    const fetchAllLinkedStudents = async (parentsData) => {
        try {
            const results = await Promise.all(
                parentsData.map((parent) =>
                    axios
                        .get(`/api/v1/parents/${parent._id}/students`)
                        .then((res) => ({ id: parent._id, count: res.data.data?.length || 0 }))
                        .catch((err) => {
                            console.error(`Failed to fetch linked students for parent ${parent._id}:`, extractErrorMessage(err));
                            return { id: parent._id, count: 0 };
                        })
                )
            );
            const map = {};
            results.forEach(({ id, count }) => {
                map[id] = count;
            });
            setLinkedStudentsMap(map);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Failed to fetch linked students:', errorMsg);
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

    // Filter parents based on search
    const filteredParents = useMemo(() => {
        if (!searchText) return parents;
        
        return parents.filter((record) =>
            (record.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.userId?.email || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.cnicNo || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.contactNumber || '').toLowerCase().includes(searchText.toLowerCase())
        );
    }, [parents, searchText]);

    // Stats
    const totalParents = parents.length;
    const activeParents = parents.filter(p => p.userId?.status === 'ACTIVE').length;
    const inactiveParents = totalParents - activeParents;
    const totalLinkedStudents = Object.values(linkedStudentsMap).reduce((sum, count) => sum + count, 0);

    // Stats Cards
    const statsCards = [
        { 
            title: 'Total Parents', 
            value: totalParents, 
            color: '#1890ff', 
            bgColor: '#e6f7ff',
            icon: <UserOutlined />,
            subtitle: 'Registered parents'
        },
        { 
            title: 'Active Parents', 
            value: activeParents, 
            color: '#52c41a', 
            bgColor: '#f6ffed',
            icon: <UserOutlined />,
            subtitle: 'Active accounts'
        },
        { 
            title: 'Inactive Parents', 
            value: inactiveParents, 
            color: '#ff4d4f', 
            bgColor: '#fff2f0',
            icon: <UserOutlined />,
            subtitle: 'Inactive accounts'
        },
        { 
            title: 'Linked Students', 
            value: totalLinkedStudents, 
            color: '#faad14', 
            bgColor: '#fff7e6',
            icon: <TeamOutlined />,
            subtitle: 'Total student links'
        },
    ];

    // Table columns
    const columns = [
        {
            title: 'Parent Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
            render: (name, record) => (
                <Tooltip title={`CNIC: ${record.cnicNo}`}>
                    <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                            <div style={{ fontWeight: 500 }}>{name}</div>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.cnicNo}</div>
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
            title: 'Contact Number',
            dataIndex: 'contactNumber',
            key: 'contactNumber',
            render: (phone) => (
                <Space>
                    <PhoneOutlined style={{ color: '#8c8c8c' }} />
                    <span>{phone || '-'}</span>
                </Space>
            ),
        },
        {
            title: 'Linked Students',
            key: 'linkedStudents',
            render: (_, record) => {
                const count = linkedStudentsMap[record._id];
                if (count === undefined) return <span style={{ color: '#aaa' }}>Loading...</span>;
                return (
                    <Tag color={count > 0 ? 'blue' : 'default'} icon={<TeamOutlined />}>
                        {count} {count === 1 ? 'Student' : 'Students'}
                    </Tag>
                );
            },
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Badge 
                    color={record.userId?.status === 'ACTIVE' ? '#52c41a' : '#ff4d4f'}
                    text={record.userId?.status || 'ACTIVE'}
                />
            ),
            filters: [
                { text: 'Active', value: 'ACTIVE' },
                { text: 'Inactive', value: 'INACTIVE' },
            ],
            onFilter: (value, record) => (record.userId?.status || 'ACTIVE') === value,
        },
        {
            title: 'Action',
            key: 'action',
            width: 180,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Link Student">
                        <Button
                            icon={<LinkOutlined />}
                            size="small"
                            onClick={() => handleOpenLinkModal(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Parent">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Parent"
                        description="This will also delete the parent login account and unlink all associated students."
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Parent">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Handlers
    const handleEdit = (record) => {
        setEditingParent(record);
        form.setFieldsValue({
            name: record.name,
            cnicNo: record.cnicNo,
            contactNumber: record.contactNumber,
        });
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/v1/parents/${id}`);
            message.success('Parent deleted successfully');
            fetchParents();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const handleSave = async (values) => {
        setSubmitLoading(true);
        try {
            if (editingParent) {
                await axios.patch(`/api/v1/parents/${editingParent._id}`, {
                    name: values.name,
                    cnicNo: values.cnicNo,
                    contactNumber: values.contactNumber,
                });
                message.success('Parent updated successfully');
            } else {
                await axios.post('/api/v1/parents/', {
                    email: values.email,
                    password: values.password,
                    name: values.name,
                    cnicNo: values.cnicNo,
                    contactNumber: values.contactNumber,
                });
                message.success('Parent created successfully');
            }
            fetchParents();
            handleCancel();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingParent(null);
        form.resetFields();
    };

    const handleOpenLinkModal = (record) => {
        linkForm.setFieldsValue({ parentId: record._id });
        setIsLinkModalVisible(true);
    };

    const handleLinkSave = async (values) => {
        setSubmitLoading(true);
        try {
            await axios.post('/api/v1/parents/link-student', {
                parentId: values.parentId,
                studentId: values.studentId,
                relationship: values.relationship,
            });
            message.success('Student linked to parent successfully');
            setIsLinkModalVisible(false);
            linkForm.resetFields();
            fetchParents();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const clearFilters = () => {
        setSearchText('');
    };

    // Get unlinked students (students without a parent)
    const unlinkedStudents = students.filter(s => !s.parentId);

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Parent Management
                </Title>
                <Text type="secondary">
                    Manage parent accounts, link students, and track parent-student relationships
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
                            placeholder="Search by name, email, CNIC or contact number..."
                            prefix={<SearchOutlined />}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                            value={searchText}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {searchText && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button onClick={clearFilters}>
                                Clear Search
                            </Button>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchParents}
                        >
                            Refresh
                        </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setEditingParent(null);
                                form.resetFields();
                                setIsModalVisible(true);
                            }}
                        >
                            Add Parent
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredParents}
                rowKey="_id"
                loading={tableLoading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} parents`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                }}
                scroll={{ x: 1000 }}
            />

            {/* Add/Edit Parent Modal */}
            <Modal
                title={
                    <Space>
                        {editingParent ? <EditOutlined style={{ color: '#1890ff' }} /> : <PlusOutlined style={{ color: '#1890ff' }} />}
                        <span>{editingParent ? 'Edit Parent' : 'Add New Parent'}</span>
                    </Space>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={550}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={handleSave} form={form} autoComplete="off">
                    <Form.Item
                        name="name"
                        label="Parent Name"
                        rules={[{ required: true, message: 'Please enter parent name' }]}
                    >
                        <Input 
                            placeholder="e.g., John Doe" 
                            size="large"
                            prefix={<UserOutlined style={{ color: '#8c8c8c' }} />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="cnicNo"
                        label="CNIC Number"
                        rules={[
                            { required: true, message: 'Please enter CNIC number' },
                            {
                                pattern: /^\d{5}-\d{7}-\d{1}$/,
                                message: 'Format: XXXXX-XXXXXXX-X (e.g., 12345-6789012-3)',
                            },
                        ]}
                    >
                        <Input 
                            placeholder="12345-6789012-3" 
                            size="large"
                            prefix={<IdcardOutlined style={{ color: '#8c8c8c' }} />}
                        />
                    </Form.Item>

                    {!editingParent && (
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
                                    placeholder="parent@example.com" 
                                    size="large"
                                    prefix={<MailOutlined style={{ color: '#8c8c8c' }} />}
                                    autoComplete='new-email'
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
                                <Input.Password 
                                    placeholder="Temporary password" 
                                    size="large"
                                    autoComplete='new-password'
                                />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item
                        name="contactNumber"
                        label="Contact Number"
                        rules={[{ required: true, message: 'Please enter contact number' }]}
                    >
                        <Input 
                            placeholder="0321-9876543" 
                            size="large"
                            prefix={<PhoneOutlined style={{ color: '#8c8c8c' }} />}
                        />
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
                            {editingParent ? 'Update Parent' : 'Add Parent'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Link Student Modal */}
            <Modal
                title={
                    <Space>
                        <LinkOutlined style={{ color: '#1890ff' }} />
                        <span>Link Student to Parent</span>
                    </Space>
                }
                open={isLinkModalVisible}
                onCancel={() => {
                    setIsLinkModalVisible(false);
                    linkForm.resetFields();
                }}
                footer={null}
                width={500}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={handleLinkSave} form={linkForm}>
                    <Form.Item name="parentId" hidden>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="studentId"
                        label="Select Student"
                        rules={[{ required: true, message: 'Please select a student' }]}
                    >
                        <Select
                            placeholder="Select student to link"
                            showSearch
                            optionFilterProp="children"
                            size="large"
                        >
                            {unlinkedStudents.map((s) => (
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
                        name="relationship"
                        label="Relationship"
                        rules={[{ required: true, message: 'Please select relationship' }]}
                    >
                        <Select placeholder="Select relationship" size="large">
                            <Option value="Father">👨 Father</Option>
                            <Option value="Mother">👩 Mother</Option>
                            <Option value="Guardian">👨‍👩‍👧 Guardian</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={submitLoading}
                            size="large"
                            icon={<LinkOutlined />}
                        >
                            Link Student
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Parents;