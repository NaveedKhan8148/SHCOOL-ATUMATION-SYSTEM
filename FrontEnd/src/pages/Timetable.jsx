import React, { useState, useEffect } from 'react';
import {
    Modal, Form, Input, Select, Button,
    message, Table, Tag, Space, Popconfirm, Card, Row, Col, Spin,
    Typography, Tooltip, Avatar
} from 'antd';
import { 
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, 
    BookOutlined, UserOutlined, ClockCircleOutlined, EnvironmentOutlined,
    CalendarOutlined, TableOutlined, AppstoreOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const TIME_SLOTS = [
    '08:00-09:00',
    '09:00-10:00',
    '10:00-11:00',
    '11:00-12:00',
    '12:00-13:00',
    '13:00-14:00',
    '14:00-15:00',
    '15:00-16:00',
];

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Subject color mapping
const SUBJECT_COLORS = {
    'Mathematics': '#1890ff',
    'Physics': '#52c41a',
    'Chemistry': '#faad14',
    'Biology': '#eb2f96',
    'English': '#722ed1',
    'Urdu': '#13c2c2',
    'Computer Science': '#2f54eb',
    'Business Administration': '#f5222d',
    'Economics': '#fa8c16',
    'History': '#a0d911',
    'Geography': '#389e0d',
};

const Timetable = () => {
    const [timetable, setTimetable] = useState([]);
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [view, setView] = useState('grid');
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    useEffect(() => {
        fetchClasses();
        fetchTeachers();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchTimetable(selectedClass);
        } else {
            setTimetable([]);
        }
    }, [selectedClass]);

    // Helper function to extract error message from HTML response
    const extractErrorMessage = (error) => {
        // Try to get JSON response first
        if (error.response?.data) {
            // Check if it's JSON
            if (typeof error.response.data === 'object') {
                return error.response.data.message || error.response.data.error || 'Operation failed';
            }
            
            // Check if it's HTML/string
            if (typeof error.response.data === 'string') {
                // Try to extract error message from HTML
                const htmlMatch = error.response.data.match(/Error:\s*([^<]+)/);
                if (htmlMatch) {
                    return htmlMatch[1].trim();
                }
                // If no HTML pattern, return the string if it's short
                if (error.response.data.length < 200) {
                    return error.response.data;
                }
            }
        }
        
        // Fallback to error message
        return error.message || 'Operation failed';
    };

    // Fetch helpers
    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/v1/classes/');
            setClasses(res.data.data?.classes || res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
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

    const fetchTimetable = async (classId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v1/timetable/class/${classId}`);
            setTimetable(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleCreate = async (values) => {
        setSubmitLoading(true);
        
        try {
            await axios.post('/api/v1/timetable/', {
                classId: selectedClass,
                teacherId: values.teacherId,
                dayOfWeek: values.dayOfWeek,
                timeSlot: values.timeSlot,
                subject: values.subject,
                roomLocation: values.roomLocation,
            });
            message.success('Timetable entry created successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchTimetable(selectedClass);
        } catch (err) {
            // Extract and show only the specific error reason
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEditOpen = (record) => {
        setEditingEntry(record);
        editForm.setFieldsValue({
            teacherId: record.teacherId?._id,
            dayOfWeek: record.dayOfWeek,
            timeSlot: record.timeSlot,
            subject: record.subject,
            roomLocation: record.roomLocation,
        });
        setIsEditModalVisible(true);
    };

    const handleEditSave = async (values) => {
        setSubmitLoading(true);
        
        try {
            await axios.patch(`/api/v1/timetable/${editingEntry._id}`, {
                teacherId: values.teacherId,
                dayOfWeek: values.dayOfWeek,
                timeSlot: values.timeSlot,
                subject: values.subject,
                roomLocation: values.roomLocation,
            });
            message.success('Timetable entry updated successfully');
            setIsEditModalVisible(false);
            editForm.resetFields();
            setEditingEntry(null);
            fetchTimetable(selectedClass);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/v1/timetable/${id}`);
            message.success('Timetable entry deleted successfully');
            fetchTimetable(selectedClass);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    // Table view columns
    const columns = [
        {
            title: 'Day',
            dataIndex: 'dayOfWeek',
            key: 'dayOfWeek',
            sorter: (a, b) =>
                DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
            render: (day) => <Tag color="blue" icon={<CalendarOutlined />}>{day}</Tag>,
        },
        {
            title: 'Time Slot',
            dataIndex: 'timeSlot',
            key: 'timeSlot',
            render: (time) => <Tag icon={<ClockCircleOutlined />}>{time}</Tag>,
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            render: (subject) => (
                <Tag color={SUBJECT_COLORS[subject] || '#1890ff'} icon={<BookOutlined />}>
                    {subject}
                </Tag>
            ),
        },
        {
            title: 'Teacher',
            key: 'teacher',
            render: (_, record) => (
                <Space>
                    <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                    <span>{record.teacherId?.name || '-'}</span>
                </Space>
            ),
        },
        {
            title: 'Room',
            dataIndex: 'roomLocation',
            key: 'roomLocation',
            render: (room) => (
                <Tag icon={<EnvironmentOutlined />}>{room}</Tag>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Edit">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEditOpen(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this timetable entry?"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Weekly grid view
    const WeeklyGrid = () => (
        <Row gutter={[16, 16]}>
            {DAY_ORDER.map((day) => {
                const dayEntries = timetable
                    .filter((t) => t.dayOfWeek === day)
                    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

                return (
                    <Col xs={24} sm={12} lg={8} xl={4} key={day}>
                        <Card
                            size="small"
                            title={
                                <span style={{ fontWeight: 700 }}>
                                    <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                    {day}
                                </span>
                            }
                            style={{ 
                                minHeight: 200, 
                                borderRadius: '10px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                            }}
                            headStyle={{ 
                                backgroundColor: '#f0f5ff', 
                                borderBottom: '2px solid #1890ff',
                                borderRadius: '10px 10px 0 0'
                            }}
                        >
                            {dayEntries.length === 0 ? (
                                <div style={{ 
                                    color: '#bbb', 
                                    fontSize: 12, 
                                    textAlign: 'center', 
                                    paddingTop: 30,
                                    paddingBottom: 30
                                }}>
                                    <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                                    No classes scheduled
                                </div>
                            ) : (
                                dayEntries.map((entry) => (
                                    <div
                                        key={entry._id}
                                        style={{
                                            background: SUBJECT_COLORS[entry.subject] ? `${SUBJECT_COLORS[entry.subject]}10` : '#e6f7ff',
                                            borderLeft: `4px solid ${SUBJECT_COLORS[entry.subject] || '#1890ff'}`,
                                            borderRadius: 8,
                                            padding: '10px 12px',
                                            marginBottom: 10,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                        }}
                                        onClick={() => handleEditOpen(entry)}
                                    >
                                        <div style={{ fontWeight: 600, color: SUBJECT_COLORS[entry.subject] || '#1890ff', marginBottom: 6 }}>
                                            <BookOutlined style={{ marginRight: 6 }} />
                                            {entry.subject}
                                        </div>
                                        <div style={{ color: '#555', marginBottom: 4 }}>
                                            <ClockCircleOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                                            {entry.timeSlot}
                                        </div>
                                        <div style={{ color: '#666', marginBottom: 4 }}>
                                            <UserOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                                            {entry.teacherId?.name || '-'}
                                        </div>
                                        <div style={{ color: '#888', marginBottom: 8 }}>
                                            <EnvironmentOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                                            {entry.roomLocation}
                                        </div>
                                        <Space size={4}>
                                            <Button
                                                size="small"
                                                icon={<EditOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditOpen(entry);
                                                }}
                                            />
                                            <Popconfirm
                                                title="Delete this entry?"
                                                onConfirm={(e) => {
                                                    e?.stopPropagation();
                                                    handleDelete(entry._id);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                                            </Popconfirm>
                                        </Space>
                                    </div>
                                ))
                            )}
                            <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                size="small"
                                block
                                style={{ marginTop: 8 }}
                                onClick={() => {
                                    form.setFieldsValue({ dayOfWeek: day });
                                    setIsModalVisible(true);
                                }}
                            >
                                Add Class
                            </Button>
                        </Card>
                    </Col>
                );
            })}
        </Row>
    );

    // Stats
    const totalEntries = timetable.length;
    const uniqueSubjects = new Set(timetable.map(t => t.subject)).size;
    const uniqueTeachers = new Set(timetable.map(t => t.teacherId?._id)).size;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Class Timetable
                </Title>
                <Text type="secondary">
                    Manage weekly class schedules, assign teachers, and track subjects
                </Text>
            </div>

            {/* Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card 
                        hoverable 
                        style={{ 
                            borderTop: '4px solid #1890ff',
                            borderRadius: '10px',
                            backgroundColor: '#e6f7ff'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
                                    Total Classes
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                                    {totalEntries}
                                </div>
                            </div>
                            <BookOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card 
                        hoverable 
                        style={{ 
                            borderTop: '4px solid #52c41a',
                            borderRadius: '10px',
                            backgroundColor: '#f6ffed'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
                                    Unique Subjects
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                                    {uniqueSubjects}
                                </div>
                            </div>
                            <BookOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card 
                        hoverable 
                        style={{ 
                            borderTop: '4px solid #faad14',
                            borderRadius: '10px',
                            backgroundColor: '#fff7e6'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
                                    Assigned Teachers
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#faad14' }}>
                                    {uniqueTeachers}
                                </div>
                            </div>
                            <UserOutlined style={{ fontSize: '48px', color: '#faad14' }} />
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Controls Card */}
            <Card style={{ marginBottom: 16, borderRadius: '10px' }}>
                <Space wrap size="middle" style={{ width: '100%' }}>
                    <div style={{ minWidth: 200 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            <BookOutlined /> Select Class
                        </div>
                        <Select
                            placeholder="Choose a class"
                            style={{ width: '100%' }}
                            onChange={(val) => setSelectedClass(val)}
                            value={selectedClass}
                            size="large"
                            allowClear
                        >
                            {classes.map((cls) => (
                                <Option key={cls._id} value={cls._id}>
                                    {cls.name}
                                </Option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            View Mode
                        </div>
                        <Select
                            value={view}
                            onChange={setView}
                            style={{ width: 140 }}
                            size="large"
                        >
                            <Option value="grid">
                                <AppstoreOutlined /> Weekly Grid
                            </Option>
                            <Option value="table">
                                <TableOutlined /> Table View
                            </Option>
                        </Select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => selectedClass && fetchTimetable(selectedClass)}
                            disabled={!selectedClass}
                            size="large"
                        >
                            Refresh
                        </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsModalVisible(true)}
                            disabled={!selectedClass}
                            size="large"
                        >
                            Add Entry
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* No class selected */}
            {!selectedClass && (
                <Card style={{ borderRadius: '10px' }}>
                    <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
                        <BookOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                        <div style={{ fontSize: 16 }}>Please select a class to view its timetable</div>
                    </div>
                </Card>
            )}

            {/* Table view */}
            {selectedClass && view === 'table' && (
                <Table
                    columns={columns}
                    dataSource={timetable}
                    rowKey="_id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} entries`,
                        pageSizeOptions: ['10', '20', '50'],
                    }}
                    scroll={{ x: 800 }}
                />
            )}

            {/* Weekly grid view */}
            {selectedClass && view === 'grid' && (
                loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    <WeeklyGrid />
                )
            )}

            {/* Create Modal */}
            <Modal
                title={
                    <Space>
                        <PlusOutlined style={{ color: '#1890ff' }} />
                        <span>Add Timetable Entry</span>
                    </Space>
                }
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                destroyOnClose
                width={500}
            >
                <Form layout="vertical" onFinish={handleCreate} form={form}>
                    <Form.Item
                        name="dayOfWeek"
                        label="Day of Week"
                        rules={[{ required: true, message: 'Please select day' }]}
                    >
                        <Select placeholder="Select day" size="large">
                            {DAY_ORDER.map((d) => (
                                <Option key={d} value={d}>{d}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="timeSlot"
                        label="Time Slot"
                        rules={[{ required: true, message: 'Please select time slot' }]}
                    >
                        <Select placeholder="Select time slot" size="large">
                            {TIME_SLOTS.map((t) => (
                                <Option key={t} value={t}>{t}</Option>
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

                    <Form.Item
                        name="teacherId"
                        label="Teacher"
                        rules={[{ required: true, message: 'Please select teacher' }]}
                    >
                        <Select
                            placeholder="Select teacher"
                            showSearch
                            optionFilterProp="children"
                            size="large"
                        >
                            {teachers.map((t) => (
                                <Option key={t._id} value={t._id}>
                                    <Space>
                                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                                        <span>{t.name}</span>
                                        <Tag color="cyan">{t.subject}</Tag>
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="roomLocation"
                        label="Room / Location"
                        rules={[{ required: true, message: 'Please enter room' }]}
                    >
                        <Input placeholder="e.g. Room 101" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={submitLoading} size="large">
                            Add Entry
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title={
                    <Space>
                        <EditOutlined style={{ color: '#1890ff' }} />
                        <span>Edit Timetable Entry</span>
                    </Space>
                }
                open={isEditModalVisible}
                onCancel={() => {
                    setIsEditModalVisible(false);
                    editForm.resetFields();
                    setEditingEntry(null);
                }}
                footer={null}
                destroyOnClose
                width={500}
            >
                <Form layout="vertical" onFinish={handleEditSave} form={editForm}>
                    <Form.Item
                        name="dayOfWeek"
                        label="Day of Week"
                        rules={[{ required: true, message: 'Please select day' }]}
                    >
                        <Select placeholder="Select day" size="large">
                            {DAY_ORDER.map((d) => (
                                <Option key={d} value={d}>{d}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="timeSlot"
                        label="Time Slot"
                        rules={[{ required: true, message: 'Please select time slot' }]}
                    >
                        <Select placeholder="Select time slot" size="large">
                            {TIME_SLOTS.map((t) => (
                                <Option key={t} value={t}>{t}</Option>
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

                    <Form.Item
                        name="teacherId"
                        label="Teacher"
                        rules={[{ required: true, message: 'Please select teacher' }]}
                    >
                        <Select
                            placeholder="Select teacher"
                            showSearch
                            optionFilterProp="children"
                            size="large"
                        >
                            {teachers.map((t) => (
                                <Option key={t._id} value={t._id}>
                                    <Space>
                                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                                        <span>{t.name}</span>
                                        <Tag color="cyan">{t.subject}</Tag>
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="roomLocation"
                        label="Room / Location"
                        rules={[{ required: true, message: 'Please enter room' }]}
                    >
                        <Input placeholder="e.g. Room 101" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={submitLoading} size="large">
                            Update Entry
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Timetable;