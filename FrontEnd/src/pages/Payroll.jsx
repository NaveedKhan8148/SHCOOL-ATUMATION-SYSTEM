import React, { useState, useEffect } from 'react';
import {
    Table, Button, Input, Space, Tag, Modal, Form, Select,
    message, Card, Row, Col, Typography, InputNumber, Divider, Popconfirm, Tooltip, Alert
} from 'antd';
import {
    PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, BankOutlined, PrinterOutlined, CheckCircleOutlined, DollarOutlined
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Payroll = () => {
    const [teachers, setTeachers] = useState([]);
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();

    const extractErrorMessage = (error) => {
        if (error.response?.data?.message) return error.response.data.message;
        return error.message || 'Operation failed';
    };

    useEffect(() => {
        fetchTeachers();
        fetchPayrolls();
    }, []);

    const fetchTeachers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/teachers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) setTeachers(res.data.data);
        } catch (err) {
            console.error(extractErrorMessage(err));
        }
    };

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/payroll', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) setPayrolls(res.data.data);
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePayroll = async (values) => {
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                teacherId: values.teacherId,
                month: values.month,
                basicSalary: values.basicSalary,
                allowances: values.allowances || [],
                deductions: values.deductions || [],
                remarks: values.remarks || ''
            };

            await axios.post('/api/v1/payroll', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Staff Payslip generated successfully!');
            setIsModalVisible(false);
            fetchPayrolls();
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDisburse = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/v1/payroll/${id}/disburse`, { paymentMethod: 'BANK_TRANSFER' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Salary marked as DISBURSED');
            fetchPayrolls();
        } catch (err) {
            message.error(extractErrorMessage(err));
        }
    };

    const generatePayslipPDF = (record) => {
        const doc = new jsPDF();
        const teacher = record.teacherId || {};

        doc.setFillColor(114, 46, 209);
        doc.rect(0, 0, 210, 32, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('OFFICIAL STAFF PAYSLIP', 105, 16, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('SCHOOL AUTOMATION SYSTEM - SALARY DISBURSEMENT SLIP', 105, 24, { align: 'center' });

        doc.setTextColor(40, 40, 40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Payslip No: ${record.payslipNo || record._id}`, 14, 44);
        doc.text(`Salary Month: ${record.month || 'Current Month'}`, 14, 52);
        doc.text(`Staff Name: ${teacher.name || 'Teacher'}`, 130, 44);
        doc.text(`Status: ${record.status || 'PENDING'}`, 130, 52);

        const tableBody = [
            ['Basic Salary', `Rs ${Number(record.basicSalary).toLocaleString()}`],
            ['Total Allowances', `+ Rs ${Number(record.totalAllowance || 0).toLocaleString()}`],
            ['Total Deductions', `- Rs ${Number(record.totalDeduction || 0).toLocaleString()}`],
            ['Net Disbursed Salary', `Rs ${Number(record.netSalary).toLocaleString()}`]
        ];

        autoTable(doc, {
            startY: 65,
            head: [['Salary Component', 'Amount (PKR)']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [114, 46, 209], textColor: [255, 255, 255], fontStyle: 'bold' }
        });

        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.text(`Disbursed Date: ${record.disbursedDate ? dayjs(record.disbursedDate).format('DD MMM YYYY') : '-'}`, 14, finalY);
        doc.text(`Payment Method: ${record.paymentMethod || 'BANK_TRANSFER'}`, 14, finalY + 6);

        doc.line(130, finalY + 15, 190, finalY + 15);
        doc.text('Authorized Signature', 145, finalY + 20);

        doc.save(`Payslip_${record.payslipNo || record._id}.pdf`);
        message.success('Payslip PDF downloaded');
    };

    const columns = [
        {
            title: 'Payslip No',
            dataIndex: 'payslipNo',
            key: 'payslipNo',
            render: text => <Text strong style={{ color: '#722ed1' }}>{text}</Text>
        },
        {
            title: 'Teacher Name',
            dataIndex: 'teacherId',
            key: 'teacher',
            render: teacher => teacher ? teacher.name : '-'
        },
        {
            title: 'Salary Month',
            dataIndex: 'month',
            key: 'month'
        },
        {
            title: 'Basic Salary',
            dataIndex: 'basicSalary',
            key: 'basicSalary',
            render: val => `Rs ${Number(val).toLocaleString()}`
        },
        {
            title: 'Net Salary',
            dataIndex: 'netSalary',
            key: 'netSalary',
            render: val => <Text strong style={{ fontSize: '15px' }}>Rs {Number(val).toLocaleString()}</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: status => {
                let color = status === 'DISBURSED' ? 'green' : 'gold';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    {record.status !== 'DISBURSED' && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleDisburse(record._id)}
                        >
                            Disburse
                        </Button>
                    )}
                    <Button
                        size="small"
                        icon={<PrinterOutlined />}
                        onClick={() => generatePayslipPDF(record)}
                    >
                        Payslip PDF
                    </Button>
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
                            <BankOutlined style={{ marginRight: '10px', color: '#722ed1' }} />
                            Staff Payroll & Salary Management
                        </Title>
                        <Text type="secondary">Manage monthly teacher salaries, allowances, deductions, and print staff payslips.</Text>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchPayrolls}>Refresh</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setIsModalVisible(true); }}>
                                Generate Staff Payslip
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Table
                    columns={columns}
                    dataSource={payrolls}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                />
            </Card>

            <Modal
                title="Generate Staff Payslip"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={submitLoading}
            >
                <Form form={form} layout="vertical" onFinish={handleCreatePayroll}>
                    <Form.Item name="teacherId" label="Select Staff / Teacher" rules={[{ required: true }]}>
                        <Select placeholder="Select Teacher">
                            {teachers.map(t => (
                                <Option key={t._id} value={t._id}>{t.name} ({t.subject || 'Teacher'})</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="month" label="Salary Month" rules={[{ required: true }]}>
                        <Input placeholder="e.g. October 2025" />
                    </Form.Item>

                    <Form.Item name="basicSalary" label="Basic Salary (PKR)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} placeholder="50000" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Payroll;
