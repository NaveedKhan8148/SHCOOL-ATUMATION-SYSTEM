import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Tag, Typography, Button, Modal, Form, Input,
    Select, message, Space, Popconfirm, Card, Row, Col,
    Statistic, DatePicker, Badge, Tooltip, Avatar
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, SearchOutlined, WarningOutlined,
    UserOutlined, ExclamationCircleOutlined, ClockCircleOutlined,
    CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AcademicWarnings = () => {
    const [warnings, setWarnings] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingWarning, setEditingWarning] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

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
    }, []);

    useEffect(() => {
        if (students.length > 0) {
            if (selectedStudent) {
                fetchWarningsByStudent(selectedStudent);
            } else {
                fetchWarnings();
            }
        }
    }, [students, selectedStudent]);

    // Fetch helpers
    const fetchWarnings = async () => {
        setTableLoading(true);
        try {
            const res = await axios.get('/api/v1/warnings/');
            setWarnings(enrichWarnings(res.data.data));
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setTableLoading(false);
        }
    };

    const fetchWarningsByStudent = async (studentId) => {
        setTableLoading(true);
        try {
            const res = await axios.get(`/api/v1/warnings/student/${studentId}`);
            setWarnings(enrichWarnings(res.data.data));
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setTableLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/api/v1/students/');
            setStudents(res.data.data);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    // Attach studentName + rollNo from students list
    const enrichWarnings = (data) => {
        return data.map((w) => {
            let studentId = w.studentId;
            if (typeof w.studentId === 'object' && w.studentId !== null) {
                studentId = w.studentId._id;
            }
            
            const foundStudent = students.find((s) => s._id === studentId);
            
            return {
                ...w,
                studentId: studentId,
                studentName: foundStudent?.studentName || w.studentId?.studentName || 'Unknown Student',
                rollNo: foundStudent?.rollNo || w.studentId?.rollNo || 'N/A',
                warningDate: w.warningDate,
            };
        });
    };

    // Filter warnings based on search text
    const filteredWarnings = useMemo(() => {
        if (!searchText) return warnings;
        
        return warnings.filter((record) =>
            (record.studentName || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.ruleViolated || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.detailDescription || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (record.rollNo || '').toLowerCase().includes(searchText.toLowerCase())
        );
    }, [warnings, searchText]);

    // Stats based on FILTERED warnings
    const totalWarnings = filteredWarnings.length;
    const uniqueStudents = new Set(
        filteredWarnings.map((w) => w.studentId)
    ).size;

    // Stats Cards Data
    const statsCards = [
        {
            title: 'Total Warnings',
            value: totalWarnings,
            icon: <WarningOutlined />,
            color: '#ff4d4f',
            bgColor: '#fff2f0',
            subtitle: searchText ? `From ${warnings.length} total` : null
        },
        {
            title: 'Students with Warnings',
            value: uniqueStudents,
            icon: <UserOutlined />,
            color: '#faad14',
            bgColor: '#fff7e6',
            subtitle: `Out of ${students.length} total students`
        },
        {
            title: 'Total Students',
            value: students.length,
            icon: <UserOutlined />,
            color: '#1890ff',
            bgColor: '#e6f7ff',
            subtitle: 'Enrolled students'
        }
    ];

    // Handlers
    const handleCreate = async (values) => {
        setSubmitLoading(true);
        try {
            await axios.post('/api/v1/warnings/', {
                studentId: values.studentId,
                ruleViolated: values.ruleViolated,
                detailDescription: values.detailDescription,
                warningDate: values.warningDate
                    ? values.warningDate.format('YYYY-MM-DD')
                    : dayjs().format('YYYY-MM-DD'),
            });
            message.success('Warning issued successfully');
            setIsModalVisible(false);
            form.resetFields();
            if (selectedStudent) {
                fetchWarningsByStudent(selectedStudent);
            } else {
                fetchWarnings();
            }
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEditOpen = (record) => {
        setEditingWarning(record);
        editForm.setFieldsValue({
            ruleViolated: record.ruleViolated,
            detailDescription: record.detailDescription,
        });
        setIsEditModalVisible(true);
    };

    const handleEditSave = async (values) => {
        setSubmitLoading(true);
        try {
            await axios.patch(`/api/v1/warnings/${editingWarning._id}`, {
                ruleViolated: values.ruleViolated,
                detailDescription: values.detailDescription,
            });
            message.success('Warning updated successfully');
            setIsEditModalVisible(false);
            editForm.resetFields();
            setEditingWarning(null);
            if (selectedStudent) {
                fetchWarningsByStudent(selectedStudent);
            } else {
                fetchWarnings();
            }
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/v1/warnings/${id}`);
            message.success('Warning deleted successfully');
            if (selectedStudent) {
                fetchWarningsByStudent(selectedStudent);
            } else {
                fetchWarnings();
            }
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const clearFilters = () => {
        setSelectedStudent(null);
        setSearchText('');
    };

    // Table columns
    const columns = [
        {
            title: 'Student',
            dataIndex: 'studentName',
            key: 'studentName',
            sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || ''),
            render: (name, record) => (
                <Tooltip title={`Roll No: ${record.rollNo}`}>
                    <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                            <div style={{ fontWeight: 500 }}>{name}</div>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.rollNo}</div>
                        </div>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: 'Rule Violated',
            dataIndex: 'ruleViolated',
            key: 'ruleViolated',
            render: (rule) => (
                <Tag color="orange" icon={<ExclamationCircleOutlined />} style={{ fontSize: 13, padding: '4px 12px' }}>
                    {rule}
                </Tag>
            ),
            filters: [
                { text: 'Attendance Below 75%', value: 'Attendance Below 75%' },
                { text: 'Failed in Multiple Subjects', value: 'Failed in Multiple Subjects' },
                { text: 'Repeated Misconduct', value: 'Repeated Misconduct' },
                { text: 'Late Submission of Assignments', value: 'Late Submission of Assignments' },
                { text: 'Exam Malpractice', value: 'Exam Malpractice' },
            ],
            onFilter: (value, record) => record.ruleViolated === value,
        },
        {
            title: 'Description',
            dataIndex: 'detailDescription',
            key: 'detailDescription',
            ellipsis: true,
            width: 350,
            render: (text) => (
                <Tooltip title={text}>
                    <Paragraph ellipsis={{ rows: 1 }} style={{ margin: 0 }}>
                        {text}
                    </Paragraph>
                </Tooltip>
            ),
        },
        {
            title: 'Warning Date',
            dataIndex: 'warningDate',
            key: 'warningDate',
            render: (d) => (
                <Tooltip title={dayjs(d).format('YYYY-MM-DD HH:mm:ss')}>
                    <Space>
                        <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                        <span>{dayjs(d).format('YYYY-MM-DD')}</span>
                    </Space>
                </Tooltip>
            ),
            sorter: (a, b) =>
                dayjs(a.warningDate).unix() - dayjs(b.warningDate).unix(),
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Edit Warning">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEditOpen(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this warning?"
                        description="This action cannot be undone."
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Warning">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Academic Warnings
                </Title>
                <Text type="secondary">
                    Track and manage academic warnings issued to students for violations
                </Text>
            </div>

            {/* Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {statsCards.map((card, index) => (
                    <Col xs={24} sm={12} lg={8} key={index}>
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
                            placeholder="Search by student, rule, or description..."
                            prefix={<SearchOutlined />}
                            allowClear
                            style={{ width: '100%' }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>

                    <div style={{ minWidth: 250 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Filter by Student
                        </div>
                        <Select
                            placeholder="All Students"
                            style={{ width: '100%' }}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            onChange={(val) => setSelectedStudent(val)}
                            value={selectedStudent}
                        >
                            {students.map((s) => (
                                <Option key={s._id} value={s._id}>
                                    {s.studentName} — {s.rollNo}
                                </Option>
                            ))}
                        </Select>
                    </div>

                    {(selectedStudent || searchText) && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </Space>
            </Card>

            {/* Action buttons */}
            <div style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, fontWeight: 600 }}>
                    <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                    Warning Records
                </h3>
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            if (selectedStudent) {
                                fetchWarningsByStudent(selectedStudent);
                            } else {
                                fetchWarnings();
                            }
                        }}
                    >
                        Refresh
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                    >
                        Issue Warning
                    </Button>
                </Space>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredWarnings}
                rowKey="_id"
                loading={tableLoading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} warnings`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                }}
                scroll={{ x: 1100 }}
                locale={{
                    emptyText: selectedStudent ? 'No warnings for this student' : 'No warnings found'
                }}
            />

            {/* Create Modal */}
            <Modal
                title={
                    <Space>
                        <WarningOutlined style={{ color: '#ff4d4f' }} />
                        <span>Issue Academic Warning</span>
                    </Space>
                }
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                destroyOnClose
                width={550}
            >
                <Form layout="vertical" onFinish={handleCreate} form={form}>
                    <Form.Item
                        name="studentId"
                        label="Student"
                        rules={[{ required: true, message: 'Please select a student' }]}
                    >
                        <Select
                            placeholder="Select student"
                            showSearch
                            optionFilterProp="children"
                            size="large"
                            filterOption={(input, option) =>
                                option.children.toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {students.map((s) => (
                                <Option key={s._id} value={s._id}>
                                    {s.studentName} — {s.rollNo}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="ruleViolated"
                        label="Rule Violated"
                        rules={[{ required: true, message: 'Please select/enter rule violated' }]}
                    >
                        <Select
                            placeholder="Select or type a rule"
                            showSearch
                            allowClear
                            mode="combobox"
                            size="large"
                            filterOption={(input, option) =>
                                option.children.toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            <Option value="Attendance Below 75%">Attendance Below 75%</Option>
                            <Option value="Failed in Multiple Subjects">Failed in Multiple Subjects</Option>
                            <Option value="Repeated Misconduct">Repeated Misconduct</Option>
                            <Option value="Late Submission of Assignments">Late Submission of Assignments</Option>
                            <Option value="Exam Malpractice">Exam Malpractice</Option>
                            <Option value="Disruptive Behavior">Disruptive Behavior</Option>
                            <Option value="Incomplete Assignments">Incomplete Assignments</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="detailDescription"
                        label="Detail Description"
                        rules={[{ required: true, message: 'Please enter description' }]}
                    >
                        <TextArea
                            rows={4}
                            placeholder="Describe the warning in detail..."
                            maxLength={500}
                            showCount
                        />
                    </Form.Item>

                    <Form.Item
                        name="warningDate"
                        label="Warning Date"
                        initialValue={dayjs()}
                        rules={[{ required: true, message: 'Please select warning date' }]}
                    >
                        <DatePicker
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={submitLoading}
                            size="large"
                            icon={<WarningOutlined />}
                        >
                            Issue Warning
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title={
                    <Space>
                        <EditOutlined style={{ color: '#1890ff' }} />
                        <span>Update Warning</span>
                    </Space>
                }
                open={isEditModalVisible}
                onCancel={() => {
                    setIsEditModalVisible(false);
                    editForm.resetFields();
                    setEditingWarning(null);
                }}
                footer={null}
                destroyOnClose
                width={550}
            >
                <Form layout="vertical" onFinish={handleEditSave} form={editForm}>
                    <Form.Item
                        name="ruleViolated"
                        label="Rule Violated"
                        rules={[{ required: true, message: 'Please enter rule violated' }]}
                    >
                        <Select
                            placeholder="Select or type a rule"
                            showSearch
                            allowClear
                            mode="combobox"
                            size="large"
                        >
                            <Option value="Attendance Below 75%">Attendance Below 75%</Option>
                            <Option value="Failed in Multiple Subjects">Failed in Multiple Subjects</Option>
                            <Option value="Repeated Misconduct">Repeated Misconduct</Option>
                            <Option value="Late Submission of Assignments">Late Submission of Assignments</Option>
                            <Option value="Exam Malpractice">Exam Malpractice</Option>
                            <Option value="Disruptive Behavior">Disruptive Behavior</Option>
                            <Option value="Incomplete Assignments">Incomplete Assignments</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="detailDescription"
                        label="Detail Description"
                        rules={[{ required: true, message: 'Please enter description' }]}
                    >
                        <TextArea 
                            rows={4} 
                            maxLength={500} 
                            showCount 
                            placeholder="Update the warning description..."
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={submitLoading}
                            size="large"
                            icon={<CheckCircleOutlined />}
                        >
                            Update Warning
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AcademicWarnings;