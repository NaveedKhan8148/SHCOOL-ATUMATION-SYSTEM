import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Input, Space, Tag, Modal, Form, Select,
    message, Card, Row, Col, Popconfirm, Tooltip, Avatar, Typography, Badge, DatePicker,
    Drawer, Spin, Empty
} from 'antd';
import {
    PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, BookOutlined, UserOutlined, TeamOutlined,
    SaveOutlined, ClockCircleOutlined, CalendarOutlined, PartitionOutlined,
    IdcardOutlined, PhoneOutlined, ManOutlined, WomanOutlined, SolutionOutlined,
    EyeOutlined, CheckCircleOutlined, HomeOutlined, MailOutlined
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

    // Students Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerClass, setDrawerClass] = useState(null);  // the class record
    const [drawerStudents, setDrawerStudents] = useState([]);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [drawerSearchText, setDrawerSearchText] = useState('');

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

    const GRADUATED_STATUSES = ['GRADUATED', 'ALUMNI'];

    const openStudentsDrawer = async (classRecord) => {
        setDrawerClass(classRecord);
        setDrawerOpen(true);
        setDrawerSearchText('');
        setDrawerStudents([]);
        setDrawerLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            let list = [];

            // Primary: fetch active students by class (backend excludes GRADUATED/ALUMNI by default)
            try {
                const res = await axios.get(`/api/v1/students/class/${classRecord._id}`, { headers });
                list = res.data.data || [];
            } catch {
                // Fallback: fetch all active students and filter locally
                const res = await axios.get('/api/v1/students/', { headers });
                const all = res.data.data?.students || res.data.data || [];
                list = all.filter(s => {
                    const cId = s.classId?._id || s.classId;
                    return cId === classRecord._id;
                });
            }

            // Guard: also exclude graduated on the frontend side
            list = list.filter(s => !GRADUATED_STATUSES.includes(s.status));

            // Natural sort by roll number
            if (Array.isArray(list)) {
                list.sort((a, b) => {
                    const numA = parseInt(a.rollNo || a.rollNumber || '0', 10);
                    const numB = parseInt(b.rollNo || b.rollNumber || '0', 10);
                    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                        return numA - numB;
                    }
                    return (a.studentName || '').localeCompare(b.studentName || '');
                });
            }
            setDrawerStudents(list);
        } catch (err) {
            message.error('Failed to load students: ' + extractErrorMessage(err));
        } finally {
            setDrawerLoading(false);
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

    // Filtered students for Drawer
    const filteredDrawerStudents = useMemo(() => {
        if (!drawerSearchText.trim()) return drawerStudents;
        const q = drawerSearchText.toLowerCase();
        return drawerStudents.filter(s =>
            (s.studentName || '').toLowerCase().includes(q) ||
            (s.rollNo || s.rollNumber || '').toLowerCase().includes(q) ||
            (s.userId?.email || '').toLowerCase().includes(q) ||
            (s.address || '').toLowerCase().includes(q)
        );
    }, [drawerStudents, drawerSearchText]);

    // Students drawer columns
    const studentColumns = [
        {
            title: '#',
            key: 'index',
            width: 50,
            align: 'center',
            render: (_, __, index) => (
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>{index + 1}</span>
            ),
        },
        {
            title: 'Roll No',
            key: 'rollNo',
            width: 100,
            sorter: (a, b) => {
                const numA = parseInt(a.rollNo || a.rollNumber || '0', 10);
                const numB = parseInt(b.rollNo || b.rollNumber || '0', 10);
                return numA - numB;
            },
            render: (_, record) => {
                const roll = record.rollNo || record.rollNumber;
                return roll ? (
                    <Tag color="blue" icon={<BookOutlined style={{ marginRight: 4 }} />}>
                        {roll}
                    </Tag>
                ) : (
                    <Text type="secondary">—</Text>
                );
            },
        },
        {
            title: 'Student Name',
            key: 'studentName',
            sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || ''),
            render: (_, record) => (
                <Space>
                    <Avatar
                        size="small"
                        icon={<UserOutlined />}
                        style={{ backgroundColor: '#1890ff' }}
                    />
                    <div>
                        <div style={{ fontWeight: 600, color: '#1f1f1f' }}>{record.studentName || '—'}</div>
                        {record.userId?.email && (
                            <div style={{ fontSize: 11, color: '#8c8c8c' }}>{record.userId.email}</div>
                        )}
                    </div>
                </Space>
            ),
        },
        {
            title: 'Date of Joining',
            key: 'dateOfJoining',
            width: 130,
            render: (_, record) => (
                record.dateOfJoining ? (
                    <Space size={4}>
                        <CalendarOutlined style={{ color: '#8c8c8c' }} />
                        <span>{dayjs(record.dateOfJoining).format('YYYY-MM-DD')}</span>
                    </Space>
                ) : <Text type="secondary">—</Text>
            ),
        },
        {
            title: 'Address',
            key: 'address',
            ellipsis: true,
            render: (_, record) => (
                record.address ? (
                    <Tooltip title={record.address}>
                        <Space size={4}>
                            <HomeOutlined style={{ color: '#8c8c8c' }} />
                            <span>{record.address}</span>
                        </Space>
                    </Tooltip>
                ) : <Text type="secondary">—</Text>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 100,
            render: (_, record) => {
                const status = record.status || record.userId?.status || 'ACTIVE';
                const color = status === 'ACTIVE' ? '#52c41a' : status === 'GRADUATED' ? '#722ed1' : '#faad14';
                return (
                    <Badge color={color} text={status} />
                );
            },
        },
    ];

    // Table columns
    const columns = [
        {
            title: 'Class Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (name, record) => (
                <Tooltip title="Click to view all students in this class">
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            openStudentsDrawer(record);
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#f0f5ff',
                            border: '1px solid #adc6ff',
                            color: '#1d39c4',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#d6e4ff';
                            e.currentTarget.style.borderColor = '#85a5ff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f0f5ff';
                            e.currentTarget.style.borderColor = '#adc6ff';
                        }}
                    >
                        <BookOutlined style={{ color: '#2f54eb' }} />
                        <span>{name}</span>
                        <TeamOutlined style={{ fontSize: 12, color: '#597ef7', marginLeft: 2 }} />
                    </span>
                </Tooltip>
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
            width: 140,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="View Students">
                        <Button
                            type="primary"
                            ghost
                            icon={<TeamOutlined />}
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                openStudentsDrawer(record);
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Class">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(record);
                            }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Class"
                        description="Are you sure you want to delete this class? This will also affect all students in this class."
                        onConfirm={(e) => {
                            e?.stopPropagation?.();
                            handleDelete(record._id);
                        }}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Class">
                            <Button
                                icon={<DeleteOutlined />}
                                size="small"
                                danger
                                onClick={(e) => e.stopPropagation()}
                            />
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
                onRow={(record) => ({
                    onClick: (e) => {
                        // Prevent triggering if clicked inside buttons or popconfirm
                        if (
                            e.target.closest('button') ||
                            e.target.closest('.ant-btn') ||
                            e.target.closest('.ant-popover') ||
                            e.target.closest('.ant-popconfirm')
                        ) {
                            return;
                        }
                        openStudentsDrawer(record);
                    },
                    style: { cursor: 'pointer' },
                })}
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
                        label="Class Teacher (Optional)"
                    >
                        <Select
                            placeholder="Select class teacher (can be assigned later)"
                            showSearch
                            optionFilterProp="children"
                            loading={teachers.length === 0}
                            size="large"
                            allowClear
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

            {/* Students in Class Drawer */}
            <Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 }}>
                        <Space size="middle">
                            <Avatar
                                shape="square"
                                size={44}
                                style={{ backgroundColor: '#1890ff', borderRadius: 8 }}
                                icon={<BookOutlined style={{ fontSize: 22 }} />}
                            />
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#1f1f1f', lineHeight: 1.3 }}>
                                    {drawerClass?.name || 'Class Students'}
                                </div>
                                <Space size={8} style={{ marginTop: 4 }} wrap>
                                    <Tag color="blue" icon={<PartitionOutlined />}>
                                        Section: {drawerClass?.section || '—'}
                                    </Tag>
                                    {drawerClass?.academicYear && (
                                        <Tag color="purple" icon={<CalendarOutlined />}>
                                            Year: {dayjs(drawerClass.academicYear).format('YYYY')}
                                        </Tag>
                                    )}
                                    {drawerClass?.classTeacherId?.name && (
                                        <Tag color="cyan" icon={<UserOutlined />}>
                                            Teacher: {drawerClass.classTeacherId.name}
                                        </Tag>
                                    )}
                                </Space>
                            </div>
                        </Space>
                    </div>
                }
                placement="right"
                width={800}
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setDrawerClass(null);
                    setDrawerStudents([]);
                    setDrawerSearchText('');
                }}
                destroyOnClose
            >
                {/* Stats & Search Toolbar */}
                <div style={{ marginBottom: 16 }}>
                    <Row gutter={[12, 12]} align="middle" justify="space-between">
                        <Col xs={24} sm={14}>
                            <Space size="middle" wrap>
                                <Card size="small" style={{ borderRadius: 8, background: '#f0f5ff', border: '1px solid #d6e4ff' }}>
                                    <Space>
                                        <TeamOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                                        <div>
                                            <div style={{ fontSize: 11, color: '#8c8c8c' }}>Total Enrolled</div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#1890ff' }}>
                                                {drawerStudents.length}
                                            </div>
                                        </div>
                                    </Space>
                                </Card>
                                <Card size="small" style={{ borderRadius: 8, background: '#f6ffed', border: '1px solid #d9f7be' }}>
                                    <Space>
                                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                                        <div>
                                            <div style={{ fontSize: 11, color: '#8c8c8c' }}>Active</div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>
                                                {drawerStudents.filter(s => (s.status || s.userId?.status) === 'ACTIVE').length}
                                            </div>
                                        </div>
                                    </Space>
                                </Card>
                            </Space>
                        </Col>
                        <Col xs={24} sm={10} style={{ textAlign: 'right' }}>
                            <Input
                                placeholder="Search by name, roll no, email..."
                                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                                value={drawerSearchText}
                                onChange={(e) => setDrawerSearchText(e.target.value)}
                                allowClear
                                style={{ width: '100%', borderRadius: 6 }}
                            />
                        </Col>
                    </Row>
                </div>

                {drawerLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Spin size="large" tip="Loading enrolled students..." />
                    </div>
                ) : filteredDrawerStudents.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <Empty
                            description={
                                drawerSearchText
                                    ? `No students matching "${drawerSearchText}"`
                                    : `No students enrolled in ${drawerClass?.name || 'this class'} yet.`
                            }
                        />
                    </div>
                ) : (
                    <Table
                        columns={studentColumns}
                        dataSource={filteredDrawerStudents}
                        rowKey="_id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '25', '50', '100'],
                            showTotal: (total) => `Total ${total} student${total === 1 ? '' : 's'}`,
                        }}
                        size="middle"
                    />
                )}
            </Drawer>
        </div>
    );
};

export default Classes;