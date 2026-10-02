import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Card, Statistic, Row, Col, Tag, Modal,
    Form, Input, Select, DatePicker, message, Space, Popconfirm,
    Tooltip, Avatar, Typography, Badge
} from 'antd';
import {
    PlusOutlined, PrinterOutlined, ReloadOutlined,
    CheckOutlined, EditOutlined, DeleteOutlined,
    DollarOutlined, ClockCircleOutlined, WarningOutlined,
    UserOutlined, FileTextOutlined, SaveOutlined, SearchOutlined  
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Option } = Select;
const { Title, Text } = Typography;

const Fees = () => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [fees, setFees] = useState([]);
    const [allFees, setAllFees] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingFee, setEditingFee] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
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
        if (selectedStudent) {
            fetchFeesByStudent(selectedStudent);
        } else {
            setFees([]);
        }
    }, [selectedStudent]);

    // Helper function to extract amount from Decimal128
    const extractAmount = (amount) => {
        if (!amount) return 0;
        if (typeof amount === 'object' && amount.$numberDecimal) {
            return parseFloat(amount.$numberDecimal);
        }
        return parseFloat(amount) || 0;
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

    const fetchFeesByStudent = async (studentId) => {
        setTableLoading(true);
        try {
            const res = await axios.get(`/api/v1/fees/student/${studentId}`);
            const feesData = res.data.data || [];
            const processedFees = feesData.map(fee => ({
                ...fee,
                amount: extractAmount(fee.amount)
            }));
            setFees(processedFees);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setTableLoading(false);
        }
    };

    const fetchAllFees = async () => {
        setTableLoading(true);
        try {
            const results = await Promise.all(
                students.map((s) =>
                    axios
                        .get(`/api/v1/fees/student/${s._id}`)
                        .then((r) => {
                            const feesData = r.data.data || [];
                            return feesData.map((f) => ({
                                ...f,
                                amount: extractAmount(f.amount),
                                studentName: s.studentName,
                                rollNo: s.rollNo,
                            }));
                        })
                        .catch((err) => {
                            console.error(`Failed to fetch fees for student ${s._id}:`, extractErrorMessage(err));
                            return [];
                        })
                )
            );
            setAllFees(results.flat());
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setTableLoading(false);
        }
    };

    useEffect(() => {
        if (students.length > 0) fetchAllFees();
    }, [students]);

    // Filter fees based on search text
    const filteredFees = useMemo(() => {
        const displayFees = selectedStudent ? fees : allFees;
        
        let filtered = displayFees;
        
        // Apply search filter
        if (searchText) {
            filtered = filtered.filter((record) =>
                (record.feeType || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (record.status || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (record.studentName || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (record.rollNo || '').toLowerCase().includes(searchText.toLowerCase())
            );
        }
        
        // Apply date range filter
        if (dateRange && dateRange[0] && dateRange[1]) {
            filtered = filtered.filter((record) => {
                const due = dayjs(record.dueDate).format('YYYY-MM-DD');
                return due >= dateRange[0].format('YYYY-MM-DD') &&
                       due <= dateRange[1].format('YYYY-MM-DD');
            });
        }
        
        return filtered;
    }, [selectedStudent, fees, allFees, searchText, dateRange]);

    // Stats from filtered fees
    const totalCollected = filteredFees
        .filter((f) => f.status === 'Paid')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

    const totalPending = filteredFees
        .filter((f) => f.status === 'Pending')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

    const totalOverdue = filteredFees
        .filter((f) => f.status === 'Overdue')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

    const overdueCount = filteredFees.filter((f) => f.status === 'Overdue').length;

    // Stats Cards Data
    const statsCards = [
        {
            title: 'Total Collected',
            value: `Rs ${totalCollected.toLocaleString()}`,
            icon: <DollarOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed'
        },
        {
            title: 'Pending Dues',
            value: `Rs ${totalPending.toLocaleString()}`,
            icon: <ClockCircleOutlined />,
            color: '#faad14',
            bgColor: '#fff7e6'
        },
        {
            title: 'Overdue Amount',
            value: `Rs ${totalOverdue.toLocaleString()}`,
            icon: <WarningOutlined />,
            color: '#ff4d4f',
            bgColor: '#fff2f0',
            subtitle: `${overdueCount} records overdue`
        }
    ];

    // PDF receipt
    const generateReceipt = (record) => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Fee Receipt', 105, 20, null, null, 'center');
        doc.setFontSize(12);
        doc.text(`Student: ${record.studentName || '-'}`, 20, 40);
        doc.text(`Roll No: ${record.rollNo || '-'}`, 20, 50);
        doc.text(`Fee Type: ${record.feeType}`, 20, 60);
        doc.text(`Due Date: ${dayjs(record.dueDate).format('YYYY-MM-DD')}`, 20, 70);
        doc.text(
            `Paid Date: ${record.paidDate ? dayjs(record.paidDate).format('YYYY-MM-DD') : '-'}`,
            20, 80
        );
        autoTable(doc, {
            startY: 90,
            head: [['Fee Type', 'Amount', 'Status']],
            body: [[record.feeType, `Rs ${Number(record.amount).toLocaleString()}`, record.status]],
        });
        doc.text(
            'Thank you!',
            105,
            doc.lastAutoTable.finalY + 20,
            null, null, 'center'
        );
        doc.save(`Receipt_${record._id}.pdf`);
        message.success('Receipt downloaded');
    };

    // Handlers
    const handleCreateFee = async (values) => {
        setSubmitLoading(true);
        try {
            await axios.post('/api/v1/fees/', {
                studentId: values.studentId,
                feeType: values.feeType,
                amount: Number(values.amount),
                dueDate: values.dueDate.format('YYYY-MM-DD'),
            });
            message.success('Fee record created successfully');
            setIsModalVisible(false);
            form.resetFields();
            if (selectedStudent === values.studentId) {
                fetchFeesByStudent(selectedStudent);
            }
            fetchAllFees();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleMarkPaid = async (feeId) => {
        try {
            await axios.patch(`/api/v1/fees/${feeId}/pay`);
            message.success('Fee marked as paid successfully');
            if (selectedStudent) fetchFeesByStudent(selectedStudent);
            fetchAllFees();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const handleEditOpen = (record) => {
        setEditingFee(record);
        editForm.setFieldsValue({
            amount: record.amount,
            dueDate: dayjs(record.dueDate),
            status: record.status,
        });
        setIsEditModalVisible(true);
    };

    const handleEditSave = async (values) => {
        setSubmitLoading(true);
        try {
            await axios.patch(`/api/v1/fees/${editingFee._id}`, {
                amount: Number(values.amount),
                dueDate: values.dueDate.format('YYYY-MM-DD'),
                status: values.status,
            });
            message.success('Fee updated successfully');
            setIsEditModalVisible(false);
            editForm.resetFields();
            setEditingFee(null);
            if (selectedStudent) fetchFeesByStudent(selectedStudent);
            fetchAllFees();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (feeId) => {
        try {
            await axios.delete(`/api/v1/fees/${feeId}`);
            message.success('Fee deleted successfully');
            if (selectedStudent) fetchFeesByStudent(selectedStudent);
            fetchAllFees();
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        }
    };

    const clearFilters = () => {
        setSelectedStudent(null);
        setSearchText('');
        setDateRange(null);
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'Paid':
                return { color: '#52c41a', bgColor: '#f6ffed', icon: <CheckOutlined /> };
            case 'Overdue':
                return { color: '#ff4d4f', bgColor: '#fff2f0', icon: <WarningOutlined /> };
            default:
                return { color: '#faad14', bgColor: '#fff7e6', icon: <ClockCircleOutlined /> };
        }
    };

    // Table columns
    const feeColumns = [
        {
            title: 'Student',
            key: 'student',
            sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || ''),
            render: (_, record) => (
                <Tooltip title={`Roll No: ${record.rollNo}`}>
                    <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                            <div style={{ fontWeight: 500 }}>{record.studentName || '-'}</div>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.rollNo || '-'}</div>
                        </div>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: 'Fee Type',
            dataIndex: 'feeType',
            key: 'feeType',
            render: (type) => (
                <Tag color="purple" icon={<FileTextOutlined />}>
                    {type}
                </Tag>
            ),
            filters: [
                { text: 'Tuition', value: 'Tuition' },
                { text: 'Lab', value: 'Lab' },
                { text: 'Library', value: 'Library' },
                { text: 'Exam', value: 'Exam' },
                { text: 'Sports', value: 'Sports' },
            ],
            onFilter: (value, record) => record.feeType === value,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => (
                <span style={{ fontWeight: 600, color: '#1890ff' }}>
                    Rs {Number(amount).toLocaleString()}
                </span>
            ),
            sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (d) => (
                <Tooltip title={dayjs(d).fromNow()}>
                    <Space>
                        <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                        <span>{dayjs(d).format('YYYY-MM-DD')}</span>
                    </Space>
                </Tooltip>
            ),
            sorter: (a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix(),
        },
        {
            title: 'Paid Date',
            dataIndex: 'paidDate',
            key: 'paidDate',
            render: (d) => d ? dayjs(d).format('YYYY-MM-DD') : '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const config = getStatusConfig(status);
                return (
                    <Badge 
                        color={config.color} 
                        text={
                            <span style={{ color: config.color, fontWeight: 500 }}>
                                {config.icon} {status}
                            </span>
                        }
                    />
                );
            },
            filters: [
                { text: 'Paid', value: 'Paid' },
                { text: 'Pending', value: 'Pending' },
                { text: 'Overdue', value: 'Overdue' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Action',
            key: 'action',
            width: 220,
            render: (_, record) => (
                <Space size="small">
                    {record.status !== 'Paid' && (
                        <Tooltip title="Mark as Paid">
                            <Popconfirm
                                title="Mark this fee as paid?"
                                onConfirm={() => handleMarkPaid(record._id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    icon={<CheckOutlined />}
                                    size="small"
                                    type="primary"
                                    ghost
                                    style={{ borderColor: '#52c41a', color: '#52c41a' }}
                                />
                            </Popconfirm>
                        </Tooltip>
                    )}
                    <Tooltip title="Edit Fee">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEditOpen(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Download Receipt">
                        <Button
                            icon={<PrinterOutlined />}
                            size="small"
                            onClick={() => generateReceipt(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this fee record?"
                        description="This action cannot be undone."
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Fee">
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
                    Fee Management
                </Title>
                <Text type="secondary">
                    Track student fees, payments, and generate receipts
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
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: card.color }}>
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

                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Search
                        </div>
                        <Input
                            placeholder="Search by type, status, or student..."
                            prefix={<SearchOutlined />}
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>

                    <div style={{ minWidth: 280 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Due Date Range
                        </div>
                        <DatePicker.RangePicker
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates)}
                            style={{ width: '100%' }}
                            placeholder={['Due From', 'Due To']}
                            format="YYYY-MM-DD"
                        />
                    </div>

                    {(selectedStudent || searchText || dateRange) && (
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
                    <DollarOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                    Transaction History
                </h3>
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            fetchAllFees();
                            if (selectedStudent) fetchFeesByStudent(selectedStudent);
                        }}
                    >
                        Refresh
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                    >
                        Record Payment
                    </Button>
                </Space>
            </div>

            {/* Table */}
            <Table
                columns={feeColumns}
                dataSource={filteredFees}
                rowKey="_id"
                loading={tableLoading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} records`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                }}
                scroll={{ x: 1200 }}
            />

            {/* Create Modal */}
            <Modal
                title={
                    <Space>
                        <PlusOutlined style={{ color: '#1890ff' }} />
                        <span>Record New Fee</span>
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
                <Form layout="vertical" onFinish={handleCreateFee} form={form}>
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
                        >
                            {students.map((s) => (
                                <Option key={s._id} value={s._id}>
                                    {s.studentName} — {s.rollNo}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="feeType"
                        label="Fee Type"
                        rules={[{ required: true, message: 'Please select fee type' }]}
                    >
                        <Select placeholder="Select fee type" size="large">
                            <Option value="Tuition">Tuition Fee</Option>
                            <Option value="Lab">Lab Fee</Option>
                            <Option value="Library">Library Fee</Option>
                            <Option value="Exam">Exam Fee</Option>
                            <Option value="Sports">Sports Fee</Option>
                            <Option value="Transport">Transport Fee</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="amount"
                        label="Amount"
                        rules={[{ required: true, message: 'Please enter amount' }]}
                    >
                        <Input 
                            type="number" 
                            prefix="Rs" 
                            min={0} 
                            step={100} 
                            size="large"
                            placeholder="Enter amount"
                        />
                    </Form.Item>

                    <Form.Item
                        name="dueDate"
                        label="Due Date"
                        rules={[{ required: true, message: 'Please select due date' }]}
                    >
                        <DatePicker 
                            style={{ width: '100%' }} 
                            size="large"
                            format="YYYY-MM-DD"
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
                            Create Fee Record
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title={
                    <Space>
                        <EditOutlined style={{ color: '#1890ff' }} />
                        <span>Update Fee Record</span>
                    </Space>
                }
                open={isEditModalVisible}
                onCancel={() => {
                    setIsEditModalVisible(false);
                    editForm.resetFields();
                    setEditingFee(null);
                }}
                footer={null}
                destroyOnClose
                width={500}
            >
                <Form layout="vertical" onFinish={handleEditSave} form={editForm}>
                    <Form.Item
                        name="amount"
                        label="Amount"
                        rules={[{ required: true, message: 'Please enter amount' }]}
                    >
                        <Input 
                            type="number" 
                            prefix="Rs" 
                            min={0} 
                            step={100} 
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="dueDate"
                        label="Due Date"
                        rules={[{ required: true, message: 'Please select due date' }]}
                    >
                        <DatePicker 
                            style={{ width: '100%' }} 
                            size="large"
                            format="YYYY-MM-DD"
                        />
                    </Form.Item>

                    <Form.Item
                        name="status"
                        label="Status"
                        rules={[{ required: true, message: 'Please select status' }]}
                    >
                        <Select size="large">
                            <Option value="Pending">Pending</Option>
                            <Option value="Paid">Paid</Option>
                            <Option value="Overdue">Overdue</Option>
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
                            Update Fee
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Fees;