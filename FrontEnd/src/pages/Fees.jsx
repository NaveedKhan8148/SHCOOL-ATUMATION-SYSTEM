import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Card, Statistic, Row, Col, Tag, Modal,
    Form, Input, Select, DatePicker, message, Space, Popconfirm,
    Tooltip, Avatar, Typography, Badge, Divider, InputNumber, Tabs, Alert
} from 'antd';
import {
    PlusOutlined, PrinterOutlined, ReloadOutlined,
    CheckOutlined, EditOutlined, DeleteOutlined,
    DollarOutlined, ClockCircleOutlined, WarningOutlined,
    UserOutlined, FileTextOutlined, SaveOutlined, SearchOutlined,
    MinusCircleOutlined, DollarCircleOutlined, BankOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

const Fees = () => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [fees, setFees] = useState([]);
    const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
    const [isPayModalVisible, setIsPayModalVisible] = useState(false);
    const [selectedFeeRecord, setSelectedFeeRecord] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [tableLoading, setTableLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [voucherForm] = Form.useForm();
    const [payForm] = Form.useForm();

    const extractErrorMessage = (error) => {
        if (error.response?.data?.message) return error.response.data.message;
        return error.message || 'Operation failed';
    };

    useEffect(() => {
        fetchInitialData();
        fetchFees();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [studentRes, classRes, sessionRes] = await Promise.all([
                axios.get('/api/v1/students', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/v1/classes', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/v1/academic-sessions', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (studentRes.data?.data) setStudents(studentRes.data.data);
            if (classRes.data?.data) setClasses(classRes.data.data);
            if (sessionRes.data?.data) setSessions(sessionRes.data.data);
        } catch (err) {
            console.error(extractErrorMessage(err));
        }
    };

    const fetchFees = async () => {
        setTableLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/fees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) setFees(res.data.data);
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setTableLoading(false);
        }
    };

    // Filter fees
    const filteredFees = useMemo(() => {
        return fees.filter((f) => {
            const studentName = f.studentId?.studentName || '';
            const rollNo = f.studentId?.rollNo || '';
            const voucherNo = f.voucherNo || '';
            const matchesSearch =
                studentName.toLowerCase().includes(searchText.toLowerCase()) ||
                rollNo.toLowerCase().includes(searchText.toLowerCase()) ||
                voucherNo.toLowerCase().includes(searchText.toLowerCase());

            const matchesStatus = statusFilter ? f.status === statusFilter : true;
            return matchesSearch && matchesStatus;
        });
    }, [fees, searchText, statusFilter]);

    // Financial Overview Counters
    const totalCollected = useMemo(() => {
        return fees
            .filter(f => f.status === 'PAID' || f.status === 'PARTIAL')
            .reduce((sum, f) => sum + (Number(f.paidAmount) || Number(f.netPayable) || 0), 0);
    }, [fees]);

    const totalPending = useMemo(() => {
        return fees
            .filter(f => f.status === 'PENDING' || f.status === 'PARTIAL' || f.status === 'OVERDUE')
            .reduce((sum, f) => sum + (Number(f.netPayable) - (Number(f.paidAmount) || 0)), 0);
    }, [fees]);

    const overdueCount = useMemo(() => {
        return fees.filter(f => f.status === 'OVERDUE').length;
    }, [fees]);

    // Official Printable Fee Voucher PDF Generator
    const generateVoucherPDF = (record) => {
        const doc = new jsPDF();
        const student = record.studentId || {};
        const className = student.classId?.name ? `${student.classId.name} (${student.classId.section || 'A'})` : '-';

        // Primary Header Band
        doc.setFillColor(24, 144, 255);
        doc.rect(0, 0, 210, 32, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('OFFICIAL STUDENT FEE VOUCHER', 105, 16, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('SCHOOL AUTOMATION SYSTEM - OFFICIAL PAYMENT VOUCHER & RECEIPT', 105, 24, { align: 'center' });

        // Voucher Summary Meta
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Voucher No: ${record.voucherNo || record._id}`, 14, 44);
        doc.text(`Fee Month: ${record.feeMonth || 'Current Month'}`, 14, 52);
        doc.text(`Issue Date: ${dayjs(record.createdAt).format('DD MMM YYYY')}`, 130, 44);
        doc.text(`Due Date: ${dayjs(record.dueDate).format('DD MMM YYYY')}`, 130, 52);

        // Status Badge Box
        const statusText = record.status || 'PENDING';
        if (statusText === 'PAID') {
            doc.setFillColor(82, 196, 26);
        } else if (statusText === 'PARTIAL') {
            doc.setFillColor(250, 173, 20);
        } else {
            doc.setFillColor(255, 77, 79);
        }
        doc.rect(130, 58, 65, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(`STATUS: ${statusText}`, 162, 65, { align: 'center' });

        // Student Info Block
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(248, 249, 250);
        doc.rect(14, 58, 110, 26, 'FD');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Student Name: ${student.studentName || 'Student'}`, 18, 65);
        doc.setFont('helvetica', 'normal');
        doc.text(`Roll Number: ${student.rollNo || '-'}`, 18, 72);
        doc.text(`Class & Section: ${className}`, 18, 79);

        // Itemized Fee Heads Table
        const feeHeadsRows = (record.feeHeads && record.feeHeads.length > 0)
            ? record.feeHeads.map(h => [h.headName, `Rs ${Number(h.amount).toLocaleString()}`])
            : [['Tuition Fee', `Rs ${Number(record.netPayable || 0).toLocaleString()}`]];

        autoTable(doc, {
            startY: 92,
            head: [['Fee Head / Particulars', 'Amount (PKR)']],
            body: feeHeadsRows,
            theme: 'grid',
            headStyles: { fillColor: [24, 144, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { fontSize: 10 },
            columnStyles: { 0: { cellWidth: 135 }, 1: { cellWidth: 45, halign: 'right' } }
        });

        let finalY = doc.lastAutoTable.finalY + 8;

        // Subtotal, Concessions, Net Payable Summary Block
        doc.setFont('helvetica', 'normal');
        doc.text(`Sub Total:`, 120, finalY);
        doc.text(`Rs ${Number(record.subTotal || record.netPayable).toLocaleString()}`, 180, finalY, { align: 'right' });

        if (record.totalConcession > 0) {
            finalY += 6;
            doc.setTextColor(235, 47, 6);
            doc.text(`Discount / Concession:`, 120, finalY);
            doc.text(`- Rs ${Number(record.totalConcession).toLocaleString()}`, 180, finalY, { align: 'right' });
        }

        finalY += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(24, 144, 255);
        doc.text(`NET PAYABLE AMOUNT:`, 120, finalY);
        doc.text(`Rs ${Number(record.netPayable).toLocaleString()}`, 180, finalY, { align: 'right' });

        // Payment Info Block if Paid
        if (record.status === 'PAID' || record.status === 'PARTIAL') {
            finalY += 14;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            doc.text(`Paid Amount: Rs ${Number(record.paidAmount || record.netPayable).toLocaleString()}`, 14, finalY);
            doc.text(`Payment Method: ${record.paymentMethod || 'CASH'}`, 14, finalY + 6);
            doc.text(`Paid Date: ${record.paidDate ? dayjs(record.paidDate).format('DD MMM YYYY') : '-'}`, 14, finalY + 12);
            doc.text(`Received By: ${record.receivedBy || 'Accounts Officer'}`, 14, finalY + 18);
        }

        // Footer Instructions & Signatures
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Note: Please pay dues on or before the due date to avoid late fine surcharge.', 14, 260);
        doc.line(14, 270, 70, 270);
        doc.text('Parent Signature', 30, 275);
        doc.line(130, 270, 190, 270);
        doc.text('Accounts / Cashier Seal', 145, 275);

        doc.save(`FeeVoucher_${record.voucherNo || record._id}.pdf`);
        message.success('Official Fee Voucher PDF generated successfully!');
    };

    // Open Voucher Creation Modal
    const openVoucherModal = () => {
        voucherForm.resetFields();
        voucherForm.setFieldsValue({
            feeMonth: dayjs().format('MMMM YYYY'),
            dueDate: dayjs().add(10, 'day'),
            feeHeads: [
                { headName: 'Tuition Fee', amount: 5000 },
                { headName: 'Lab & Computer Fee', amount: 1000 }
            ],
            concessions: []
        });
        setIsVoucherModalVisible(true);
    };

    // Handle Create Fee Voucher
    const handleCreateVoucher = async (values) => {
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                studentId: values.issueTarget === 'STUDENT' ? values.studentId : null,
                classId: values.issueTarget === 'CLASS' ? values.classId : null,
                academicSessionId: values.academicSessionId || null,
                feeMonth: values.feeMonth,
                dueDate: values.dueDate.format('YYYY-MM-DD'),
                feeHeads: values.feeHeads,
                concessions: values.concessions || [],
                remarks: values.remarks || ''
            };

            await axios.post('/api/v1/fees/voucher', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Fee Voucher(s) issued successfully!');
            setIsVoucherModalVisible(false);
            fetchFees();
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setSubmitLoading(false);
        }
    };

    // Open Mark Paid Modal
    const openPayModal = (record) => {
        setSelectedFeeRecord(record);
        payForm.setFieldsValue({
            paidAmount: record.netPayable,
            paymentMethod: 'CASH',
            remarks: ''
        });
        setIsPayModalVisible(true);
    };

    // Handle Submit Payment
    const handlePaySubmit = async (values) => {
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/v1/fees/${selectedFeeRecord._id}/pay`, {
                paidAmount: values.paidAmount,
                paymentMethod: values.paymentMethod,
                remarks: values.remarks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Payment recorded successfully!');
            setIsPayModalVisible(false);
            fetchFees();
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteFee = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/fees/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Fee record deleted');
            fetchFees();
        } catch (err) {
            message.error(extractErrorMessage(err));
        }
    };

    const columns = [
        {
            title: 'Voucher No',
            dataIndex: 'voucherNo',
            key: 'voucherNo',
            render: (text, record) => <Text strong style={{ color: '#1890ff' }}>{text || record._id?.substring(0, 8)}</Text>
        },
        {
            title: 'Student Details',
            dataIndex: 'studentId',
            key: 'student',
            render: (student) => student ? (
                <div>
                    <Text strong style={{ fontSize: '14px' }}>{student.studentName}</Text>
                    <div><Text type="secondary" style={{ fontSize: '12px' }}>Roll: {student.rollNo} | Class: {student.classId?.name || '-'}</Text></div>
                </div>
            ) : <Text type="secondary">-</Text>
        },
        {
            title: 'Fee Month',
            dataIndex: 'feeMonth',
            key: 'feeMonth',
            render: text => text || 'Current Month'
        },
        {
            title: 'Net Payable',
            dataIndex: 'netPayable',
            key: 'netPayable',
            render: (amount) => <Text strong style={{ fontSize: '15px', color: '#262626' }}>Rs {Number(amount).toLocaleString()}</Text>
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: date => dayjs(date).format('DD MMM YYYY')
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: status => {
                let color = 'gold';
                if (status === 'PAID') color = 'green';
                if (status === 'OVERDUE') color = 'red';
                if (status === 'PARTIAL') color = 'orange';
                return <Tag color={color}>{status || 'PENDING'}</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    {record.status !== 'PAID' && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<DollarCircleOutlined />}
                            onClick={() => openPayModal(record)}
                        >
                            Pay Cash/Bank
                        </Button>
                    )}
                    <Tooltip title="Print / Download PDF Voucher">
                        <Button
                            icon={<PrinterOutlined />}
                            size="small"
                            onClick={() => generateVoucherPDF(record)}
                        >
                            PDF
                        </Button>
                    </Tooltip>
                    <Popconfirm
                        title="Delete fee record?"
                        onConfirm={() => handleDeleteFee(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
            <div style={{ marginBottom: '24px' }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={2} style={{ margin: 0 }}>
                            <DollarOutlined style={{ marginRight: '10px', color: '#52c41a' }} />
                            Fee & Voucher Management Engine
                        </Title>
                        <Text type="secondary">Issue itemized student fee vouchers, manage concessions, record cash/bank collections, and export printable PDF receipts.</Text>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchFees}>Refresh</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={openVoucherModal}>
                                Issue Itemized Fee Voucher
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #52c41a' }}>
                        <Statistic
                            title="Total Fees Collected"
                            value={`Rs ${totalCollected.toLocaleString()}`}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #faad14' }}>
                        <Statistic
                            title="Total Pending Dues"
                            value={`Rs ${totalPending.toLocaleString()}`}
                            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #ff4d4f' }}>
                        <Statistic
                            title="Overdue Vouchers"
                            value={overdueCount}
                            prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                    <Col>
                        <Space>
                            <Input
                                placeholder="Search student, roll no, or voucher no..."
                                prefix={<SearchOutlined />}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                style={{ width: '320px' }}
                                allowClear
                            />
                            <Select
                                placeholder="Filter Status"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                style={{ width: '160px' }}
                                allowClear
                            >
                                <Option value="PENDING">PENDING</Option>
                                <Option value="PAID">PAID</Option>
                                <Option value="PARTIAL">PARTIAL</Option>
                                <Option value="OVERDUE">OVERDUE</Option>
                            </Select>
                        </Space>
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={filteredFees}
                    rowKey="_id"
                    loading={tableLoading}
                    pagination={{ pageSize: 8 }}
                />
            </Card>

            {/* Issue Voucher Modal */}
            <Modal
                title="Issue Itemized Student Fee Voucher"
                open={isVoucherModalVisible}
                onCancel={() => setIsVoucherModalVisible(false)}
                onOk={() => voucherForm.submit()}
                confirmLoading={submitLoading}
                width={700}
                destroyOnClose
            >
                <Form
                    form={voucherForm}
                    layout="vertical"
                    onFinish={handleCreateVoucher}
                    initialValues={{ issueTarget: 'STUDENT' }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="issueTarget" label="Issue Fee Voucher To">
                                <Select>
                                    <Option value="STUDENT">Single Student</Option>
                                    <Option value="CLASS">Entire Class Batch</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                noStyle
                                shouldUpdate={(prevValues, currentValues) => prevValues.issueTarget !== currentValues.issueTarget}
                            >
                                {({ getFieldValue }) =>
                                    getFieldValue('issueTarget') === 'STUDENT' ? (
                                        <Form.Item name="studentId" label="Select Student" rules={[{ required: true }]}>
                                            <Select showSearch placeholder="Search student name" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                                                {students.map(s => (
                                                    <Option key={s._id} value={s._id}>{s.studentName} ({s.rollNo})</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    ) : (
                                        <Form.Item name="classId" label="Select Class" rules={[{ required: true }]}>
                                            <Select placeholder="Select Class">
                                                {classes.map(c => (
                                                    <Option key={c._id} value={c._id}>{c.name} ({c.section || 'A'})</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    )
                                }
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="feeMonth" label="Fee Month" rules={[{ required: true }]}>
                                <Input placeholder="e.g. October 2025" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="dueDate" label="Due Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider textPlacement="left">Itemized Fee Particulars (Heads)</Divider>
                    <Form.List name="feeHeads">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'headName']}
                                            rules={[{ required: true, message: 'Missing head name' }]}
                                        >
                                            <Input placeholder="Fee Head (e.g. Tuition Fee, Lab Fee)" style={{ width: 340 }} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'amount']}
                                            rules={[{ required: true, message: 'Missing amount' }]}
                                        >
                                            <InputNumber placeholder="Amount (PKR)" style={{ width: 180 }} min={0} />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Add Fee Head
                                </Button>
                            </>
                        )}
                    </Form.List>

                    <Divider textPlacement="left">Concessions / Discounts (Optional)</Divider>
                    <Form.List name="concessions">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item {...restField} name={[name, 'concessionType']}>
                                            <Input placeholder="Concession (e.g., Sibling Discount, Financial Aid)" style={{ width: 340 }} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'amount']}>
                                            <InputNumber placeholder="Discount Amount" style={{ width: 180 }} min={0} />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Add Concession / Discount
                                </Button>
                            </>
                        )}
                    </Form.List>

                    <Form.Item name="remarks" label="Remarks" style={{ marginTop: '16px' }}>
                        <Input placeholder="Optional notes for voucher" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Pay Fee Modal */}
            <Modal
                title={`Record Fee Payment (Voucher: ${selectedFeeRecord?.voucherNo || ''})`}
                open={isPayModalVisible}
                onCancel={() => setIsPayModalVisible(false)}
                onOk={() => payForm.submit()}
                confirmLoading={submitLoading}
            >
                <Form
                    form={payForm}
                    layout="vertical"
                    onFinish={handlePaySubmit}
                >
                    <Alert
                        message={`Total Net Payable: Rs ${Number(selectedFeeRecord?.netPayable || 0).toLocaleString()}`}
                        type="info"
                        style={{ marginBottom: '16px' }}
                    />

                    <Form.Item name="paidAmount" label="Payment Amount (PKR)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>

                    <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
                        <Select>
                            <Option value="CASH">CASH (Counter Payment)</Option>
                            <Option value="BANK_TRANSFER">DIRECT BANK TRANSFER</Option>
                            <Option value="CHEQUE">CHEQUE</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="remarks" label="Payment Notes / Transaction Ref">
                        <Input placeholder="Receipt or bank transaction reference" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Fees;