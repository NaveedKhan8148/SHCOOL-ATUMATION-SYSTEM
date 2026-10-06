import React, { useState, useEffect } from 'react';
import {
    Table, Button, Input, Space, Tag, Modal, Form, Select,
    message, Card, Row, Col, Typography, InputNumber, DatePicker, Statistic, Popconfirm
} from 'antd';
import {
    PlusOutlined, SearchOutlined, DeleteOutlined, ReloadOutlined,
    DollarOutlined, ArrowUpOutlined, ArrowDownOutlined, AccountBookOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({
        totalFeeIncome: 0,
        totalPayrollExpense: 0,
        totalOperationalExpense: 0,
        totalExpense: 0,
        netProfit: 0
    });
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
        fetchExpenses();
        fetchSummary();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/expenses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) setExpenses(res.data.data);
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/expenses/summary', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) setSummary(res.data.data);
        } catch (err) {
            console.error(extractErrorMessage(err));
        }
    };

    const handleCreateExpense = async (values) => {
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                title: values.title,
                category: values.category || 'OTHER',
                amount: values.amount,
                expenseDate: values.expenseDate ? values.expenseDate.format('YYYY-MM-DD') : new Date(),
                paymentMethod: values.paymentMethod || 'CASH',
                paidTo: values.paidTo || '',
                notes: values.notes || ''
            };

            await axios.post('/api/v1/expenses', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Expense recorded successfully');
            setIsModalVisible(false);
            fetchExpenses();
            fetchSummary();
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteExpense = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/expenses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Expense record deleted');
            fetchExpenses();
            fetchSummary();
        } catch (err) {
            message.error(extractErrorMessage(err));
        }
    };

    const filteredExpenses = expenses.filter(e =>
        e.title.toLowerCase().includes(searchText.toLowerCase()) ||
        e.receiptNo.toLowerCase().includes(searchText.toLowerCase()) ||
        (e.paidTo && e.paidTo.toLowerCase().includes(searchText.toLowerCase()))
    );

    const columns = [
        {
            title: 'Receipt No',
            dataIndex: 'receiptNo',
            key: 'receiptNo',
            render: text => <Text strong style={{ color: '#1890ff' }}>{text}</Text>
        },
        {
            title: 'Title / Description',
            dataIndex: 'title',
            key: 'title',
            render: text => <Text strong>{text}</Text>
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: cat => <Tag color="blue">{cat}</Tag>
        },
        {
            title: 'Amount (PKR)',
            dataIndex: 'amount',
            key: 'amount',
            render: amt => <Text strong style={{ fontSize: '15px', color: '#ff4d4f' }}>- Rs {Number(amt).toLocaleString()}</Text>
        },
        {
            title: 'Expense Date',
            dataIndex: 'expenseDate',
            key: 'expenseDate',
            render: d => dayjs(d).format('DD MMM YYYY')
        },
        {
            title: 'Payment Method',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: m => <Tag>{m}</Tag>
        },
        {
            title: 'Paid To',
            dataIndex: 'paidTo',
            key: 'paidTo',
            render: text => text || '-'
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Popconfirm
                    title="Delete expense record?"
                    onConfirm={() => handleDeleteExpense(record._id)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
            <div style={{ marginBottom: '24px' }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={2} style={{ margin: 0 }}>
                            <AccountBookOutlined style={{ marginRight: '10px', color: '#ff4d4f' }} />
                            School Expense Ledger & Financial Summary
                        </Title>
                        <Text type="secondary">Monitor operational expenses (Utilities, Maintenance, Vendor bills) and balance sheet net balance.</Text>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={() => { fetchExpenses(); fetchSummary(); }}>Refresh</Button>
                            <Button type="primary" danger icon={<PlusOutlined />} onClick={() => { form.resetFields(); setIsModalVisible(true); }}>
                                Record New Expense
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={6}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #52c41a' }}>
                        <Statistic
                            title="Total Fee Revenue"
                            value={`Rs ${summary.totalFeeIncome.toLocaleString()}`}
                            prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #722ed1' }}>
                        <Statistic
                            title="Staff Payroll Expenses"
                            value={`Rs ${summary.totalPayrollExpense.toLocaleString()}`}
                            prefix={<ArrowDownOutlined style={{ color: '#722ed1' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #ff4d4f' }}>
                        <Statistic
                            title="Operational Expenses"
                            value={`Rs ${summary.totalOperationalExpense.toLocaleString()}`}
                            prefix={<ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: summary.netProfit >= 0 ? '4px solid #52c41a' : '4px solid #ff4d4f' }}>
                        <Statistic
                            title="Net Income Balance"
                            value={`Rs ${summary.netProfit.toLocaleString()}`}
                            valueStyle={{ color: summary.netProfit >= 0 ? '#52c41a' : '#ff4d4f' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ marginBottom: '16px' }}>
                    <Input
                        placeholder="Search title, receipt number, or vendor name..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: '360px' }}
                        allowClear
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredExpenses}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                />
            </Card>

            <Modal
                title="Record School Operational Expense"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={submitLoading}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateExpense} initialValues={{ category: 'UTILITIES', paymentMethod: 'CASH' }}>
                    <Form.Item name="title" label="Expense Title / Description" rules={[{ required: true }]}>
                        <Input placeholder="e.g., Electric Bill, Lab Chemical Order" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="category" label="Category">
                                <Select>
                                    <Option value="UTILITIES">UTILITIES</Option>
                                    <Option value="MAINTENANCE">MAINTENANCE</Option>
                                    <Option value="STATIONERY">STATIONERY</Option>
                                    <Option value="VENDOR_PAYMENT">VENDOR PAYMENT</Option>
                                    <Option value="EVENT">EVENT & SPORTS</Option>
                                    <Option value="OTHER">OTHER</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="amount" label="Amount (PKR)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={1} placeholder="15000" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="paymentMethod" label="Payment Method">
                                <Select>
                                    <Option value="CASH">CASH</Option>
                                    <Option value="BANK_TRANSFER">BANK TRANSFER</Option>
                                    <Option value="CHEQUE">CHEQUE</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="paidTo" label="Paid To / Vendor">
                                <Input placeholder="Vendor or Service provider name" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default Expenses;
