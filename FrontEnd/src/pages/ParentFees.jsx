import React, { useState, useEffect, useMemo } from 'react';
import { 
    Card, Row, Col, Statistic, Table, Tag, Typography, Spin, 
    Space, Avatar, Progress, Tooltip, Button, Input, Select
} from 'antd';
import { 
    DollarOutlined, HistoryOutlined, CheckCircleOutlined, 
    CloseCircleOutlined, ClockCircleOutlined, UserOutlined,
    SearchOutlined, ReloadOutlined, CalendarOutlined, FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useChildStudent } from '../hooks/useChildStudent';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;

const ParentFees = () => {
    const { child, loading: childLoading, error: childError } = useChildStudent();
    const [fees, setFees] = useState([]);
    const [loadingFees, setLoadingFees] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState(null);

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
        if (child?._id) fetchFees(child._id);
    }, [child]);

    const fetchFees = async (studentId) => {
        setLoadingFees(true);
        try {
            const res = await axios.get(`/api/v1/fees/student/${studentId}`);
            // Normalize Decimal128 → plain number
            const normalized = (res.data.data || []).map((fee) => ({
                ...fee,
                amount: fee.amount?.$numberDecimal
                    ? Number(fee.amount.$numberDecimal)
                    : Number(fee.amount),
            }));
            setFees(normalized);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Fees fetch error:', errorMsg);
            // Silent fail for parent view - don't show error message to avoid confusion
            setFees([]);
        } finally {
            setLoadingFees(false);
        }
    };

    // Filter fees
    const filteredFees = useMemo(() => {
        let filtered = fees;
        
        if (searchText) {
            filtered = filtered.filter((f) =>
                f.feeType.toLowerCase().includes(searchText.toLowerCase())
            );
        }
        
        if (statusFilter) {
            filtered = filtered.filter((f) => f.status === statusFilter);
        }
        
        return filtered;
    }, [fees, searchText, statusFilter]);

    // Stats
    const totalPaid = fees
        .filter((f) => f.status === 'Paid')
        .reduce((s, f) => s + Number(f.amount), 0);

    const totalPending = fees
        .filter((f) => f.status === 'Pending')
        .reduce((s, f) => s + Number(f.amount), 0);

    const totalOverdue = fees
        .filter((f) => f.status === 'Overdue')
        .reduce((s, f) => s + Number(f.amount), 0);

    const paidCount = fees.filter((f) => f.status === 'Paid').length;
    const pendingCount = fees.filter((f) => f.status === 'Pending').length;
    const overdueCount = fees.filter((f) => f.status === 'Overdue').length;
    
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
            subtitle: `${fees.length} total records`
        }
    ];

    // Table columns
    const columns = [
        {
            title: 'Fee Type',
            dataIndex: 'feeType',
            key: 'feeType',
            sorter: (a, b) => a.feeType.localeCompare(b.feeType),
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
            sorter: (a, b) => Number(a.amount) - Number(b.amount),
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
            filters: [
                { text: 'Paid', value: 'Paid' },
                { text: 'Pending', value: 'Pending' },
                { text: 'Overdue', value: 'Overdue' },
            ],
            onFilter: (value, record) => record.status === value,
        },
    ];

    const clearFilters = () => {
        setSearchText('');
        setStatusFilter(null);
    };

    if (childLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (childError || !child) {
        return <Text type="danger">{childError || 'No linked student found.'}</Text>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Fee Management
                </Title>
                <Text type="secondary">
                    Track fee payments and dues for <strong>{child.studentName}</strong> ({child.rollNo})
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
                                <div style={{ fontWeight: 600 }}>{child.studentName}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Roll Number</Text>
                                <div style={{ fontWeight: 600 }}>{child.rollNo}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Class</Text>
                                <div style={{ fontWeight: 600 }}>{child.classId?.name || '-'}</div>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Total Fee Records</Text>
                                <div style={{ fontWeight: 600 }}>{fees.length}</div>
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

                    {(searchText || statusFilter) && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={() => fetchFees(child._id)}
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
                    scroll={{ x: 900 }}
                />
            </Card>
        </div>
    );
};

export default ParentFees;