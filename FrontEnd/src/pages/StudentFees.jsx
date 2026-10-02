import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Card, Statistic, Row, Col, Tag,
    Typography, Button, message, Input,
    DatePicker, Spin, Space, Avatar, Progress,
    Tooltip, Badge, Select
} from 'antd';
import { 
    DollarOutlined, HistoryOutlined, PrinterOutlined, 
    CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
    UserOutlined, SearchOutlined, ReloadOutlined, CalendarOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAuth } from '../context/AuthContext';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;

const StudentFees = () => {
    const { profile, loading: authLoading } = useAuth();
    const [fees, setFees] = useState([]);
    const [loadingFees, setLoadingFees] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState(null);
    const [dateRange, setDateRange] = useState(null);

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
        if (profile?._id) fetchFees(profile._id);
    }, [profile]);

    const fetchFees = async (studentId) => {
        setLoadingFees(true);
        try {
            const res = await axios.get(`/api/v1/fees/student/${studentId}`);
            setFees(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Fees fetch error:', errorMsg);
            // Silent fail for student view - don't show error message to avoid confusion
            setFees([]);
        } finally {
            setLoadingFees(false);
        }
    };

    // Helper function to extract amount from Decimal128
    const extractAmount = (amount) => {
        if (!amount) return 0;
        if (typeof amount === 'object' && amount.$numberDecimal) {
            return parseFloat(amount.$numberDecimal);
        }
        return parseFloat(amount) || 0;
    };

    // Process fees to extract amount from Decimal128
    const processedFees = useMemo(() => {
        return fees.map(fee => ({
            ...fee,
            amount: extractAmount(fee.amount)
        }));
    }, [fees]);

    // Filter fees
    const filteredFees = useMemo(() => {
        let filtered = processedFees;
        
        if (searchText) {
            filtered = filtered.filter((f) =>
                f.feeType?.toLowerCase().includes(searchText.toLowerCase())
            );
        }
        
        if (statusFilter) {
            filtered = filtered.filter((f) => f.status === statusFilter);
        }
        
        if (dateRange && dateRange[0] && dateRange[1]) {
            filtered = filtered.filter((f) => {
                const due = dayjs(f.dueDate).format('YYYY-MM-DD');
                return due >= dateRange[0].format('YYYY-MM-DD') &&
                       due <= dateRange[1].format('YYYY-MM-DD');
            });
        }
        
        return filtered;
    }, [processedFees, searchText, statusFilter, dateRange]);

    // Stats
    const totalPaid = processedFees
        .filter((f) => f.status === 'Paid')
        .reduce((s, f) => s + (Number(f.amount) || 0), 0);

    const totalPending = processedFees
        .filter((f) => f.status === 'Pending')
        .reduce((s, f) => s + (Number(f.amount) || 0), 0);

    const totalOverdue = processedFees
        .filter((f) => f.status === 'Overdue')
        .reduce((s, f) => s + (Number(f.amount) || 0), 0);

    const paidCount = processedFees.filter((f) => f.status === 'Paid').length;
    const pendingCount = processedFees.filter((f) => f.status === 'Pending').length;
    const overdueCount = processedFees.filter((f) => f.status === 'Overdue').length;
    
    const totalFees = totalPaid + totalPending + totalOverdue;
    const paymentRate = totalFees > 0 ? ((totalPaid / totalFees) * 100).toFixed(1) : 0;

    // Stats Cards Data
    const statsCards = [
        {
            title: 'Total Paid',
            value: `Rs ${totalPaid.toLocaleString()}`,
            icon: <CheckCircleOutlined />,
            color: '#52c41a',
            bgColor: '#f6ffed',
            subtitle: `${paidCount} payment${paidCount !== 1 ? 's' : ''} completed`
        },
        {
            title: 'Pending Dues',
            value: `Rs ${totalPending.toLocaleString()}`,
            icon: <ClockCircleOutlined />,
            color: '#faad14',
            bgColor: '#fff7e6',
            subtitle: `${pendingCount} pending payment${pendingCount !== 1 ? 's' : ''}`
        },
        {
            title: 'Overdue Amount',
            value: `Rs ${totalOverdue.toLocaleString()}`,
            icon: <CloseCircleOutlined />,
            color: '#ff4d4f',
            bgColor: '#fff2f0',
            subtitle: `${overdueCount} overdue record${overdueCount !== 1 ? 's' : ''}`
        },
        {
            title: 'Payment Rate',
            value: `${paymentRate}%`,
            icon: <DollarOutlined />,
            color: '#1890ff',
            bgColor: '#e6f7ff',
            progress: true,
            progressValue: paymentRate,
            subtitle: `${processedFees.length} total records`
        }
    ];

    // PDF receipt
    const generateReceipt = (record) => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Fee Receipt', 105, 20, null, null, 'center');
        doc.setFontSize(12);
        doc.text(`Student: ${profile?.studentName || '-'}`, 20, 40);
        doc.text(`Roll No: ${profile?.rollNo || '-'}`, 20, 50);
        doc.text(`Fee Type: ${record.feeType}`, 20, 60);
        doc.text(`Amount: Rs ${Number(record.amount).toLocaleString()}`, 20, 70);
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
            'Thank you for your payment!',
            105, doc.lastAutoTable.finalY + 20,
            null, null, 'center'
        );
        doc.save(`Receipt_${record._id}.pdf`);
        message.success('Receipt downloaded');
    };

    // Table columns
    const columns = [
        {
            title: 'Fee Type',
            dataIndex: 'feeType',
            key: 'feeType',
            sorter: (a, b) => (a.feeType || '').localeCompare(b.feeType || ''),
            render: (type) => (
                <Space>
                    <FileTextOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontWeight: 500 }}>{type}</span>
                </Space>
            ),
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
            sorter: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0),
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (date) => (
                <Tooltip title={date ? dayjs(date).fromNow() : 'No due date'}>
                    <Space>
                        <CalendarOutlined style={{ color: '#8c8c8c' }} />
                        <span>{date ? dayjs(date).format('YYYY-MM-DD') : '—'}</span>
                        {date && dayjs().isAfter(dayjs(date)) && (
                            <Tag color="red" size="small">Overdue</Tag>
                        )}
                    </Space>
                </Tooltip>
            ),
            sorter: (a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix(),
        },
        {
            title: 'Paid On',
            dataIndex: 'paidDate',
            key: 'paidDate',
            render: (date) => (
                date ? (
                    <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <span>{dayjs(date).format('YYYY-MM-DD')}</span>
                    </Space>
                ) : (
                    <Text type="secondary">—</Text>
                )
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const config = {
                    'Paid': { color: '#52c41a', bgColor: '#f6ffed', icon: <CheckCircleOutlined /> },
                    'Pending': { color: '#faad14', bgColor: '#fff7e6', icon: <ClockCircleOutlined /> },
                    'Overdue': { color: '#ff4d4f', bgColor: '#fff2f0', icon: <CloseCircleOutlined /> }
                };
                const { color, bgColor, icon } = config[status] || config['Pending'];
                return (
                    <Tag 
                        color={color}
                        style={{ 
                            backgroundColor: bgColor,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontWeight: 500
                        }}
                        icon={icon}
                    >
                        {status}
                    </Tag>
                );
            },
        },
        {
            title: 'Receipt',
            key: 'receipt',
            render: (_, record) =>
                record.status === 'Paid' ? (
                    <Button
                        icon={<PrinterOutlined />}
                        size="small"
                        onClick={() => generateReceipt(record)}
                        type="link"
                    >
                        Download
                    </Button>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
    ];

    const clearFilters = () => {
        setSearchText('');
        setStatusFilter(null);
        setDateRange(null);
    };

    if (authLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!profile) {
        return <Text type="danger">Profile not found.</Text>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Fee Management
                </Title>
                <Text type="secondary">
                    Track your fee payments and dues for <strong>{profile.studentName}</strong> ({profile.rollNo})
                </Text>
            </div>

            {/* Student Info Card */}
            <Card style={{ marginBottom: 24, borderRadius: '10px' }} className="hover-card">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={3} style={{ textAlign: 'center' }}>
                        <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                    </Col>
                    <Col xs={24} sm={21}>
                        <Row gutter={[16, 8]}>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Student Name</Text>
                                <div style={{ fontWeight: 600 }}>{profile.studentName}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Roll Number</Text>
                                <div style={{ fontWeight: 600 }}>{profile.rollNo}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Class</Text>
                                <div style={{ fontWeight: 600 }}>{profile.classId?.name || '-'}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Total Fee Records</Text>
                                <div style={{ fontWeight: 600 }}>{processedFees.length}</div>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>

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
                                {card.progress ? (
                                    <Progress 
                                        type="circle" 
                                        percent={card.progressValue} 
                                        width={60} 
                                        strokeColor={card.color}
                                        format={(percent) => `${percent}%`}
                                    />
                                ) : (
                                    <div style={{ fontSize: '48px', color: card.color }}>
                                        {card.icon}
                                    </div>
                                )}
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
                            placeholder="Search by fee type..."
                            prefix={<SearchOutlined />}
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            size="large"
                        />
                    </div>

                    <div style={{ minWidth: 150 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            Status
                        </div>
                        <Select
                            placeholder="All Status"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={(val) => setStatusFilter(val)}
                            value={statusFilter}
                            size="large"
                        >
                            <Option value="Paid">
                                <CheckCircleOutlined style={{ color: '#52c41a' }} /> Paid
                            </Option>
                            <Option value="Pending">
                                <ClockCircleOutlined style={{ color: '#faad14' }} /> Pending
                            </Option>
                            <Option value="Overdue">
                                <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Overdue
                            </Option>
                        </Select>
                    </div>

                    <div style={{ minWidth: 280 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                            <CalendarOutlined /> Due Date Range
                        </div>
                        <DatePicker.RangePicker
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates)}
                            style={{ width: '100%' }}
                            placeholder={['Due From', 'Due To']}
                            size="large"
                        />
                    </div>

                    {(searchText || statusFilter || dateRange) && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={() => fetchFees(profile._id)}
                            size="large"
                        >
                            Refresh
                        </Button>
                    </div>
                </Space>
            </Card>

            {/* Fees Table */}
            <Card style={{ borderRadius: '10px' }}>
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={filteredFees}
                    loading={loadingFees}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} records`,
                        pageSizeOptions: ['10', '20', '50'],
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>
        </div>
    );
};

export default StudentFees;