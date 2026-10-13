import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Input, Space, Tag, Card, Row, Col, Typography,
    Timeline, Avatar, Modal, Tooltip, Badge, Statistic, Empty
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, HistoryOutlined, CrownOutlined,
    TeamOutlined, BookOutlined, CalendarOutlined, IdcardOutlined,
    TrophyOutlined, UserOutlined, PartitionOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const AlumniDirectory = () => {
    const [alumni, setAlumni] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);

    const extractErrorMessage = (error) => {
        if (error.response?.data?.message) return error.response.data.message;
        return error.message || 'Operation failed';
    };

    useEffect(() => {
        fetchAlumni();
    }, []);

    const fetchAlumni = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/students/alumni', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) {
                setAlumni(res.data.data);
            }
        } catch (error) {
            console.error(extractErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const filteredAlumni = useMemo(() => {
        if (!searchText.trim()) return alumni;
        const q = searchText.toLowerCase();
        return alumni.filter(a =>
            (a.studentName || '').toLowerCase().includes(q) ||
            (a.rollNo || '').toLowerCase().includes(q) ||
            (a.classId?.name || '').toLowerCase().includes(q) ||
            (a.status || '').toLowerCase().includes(q) ||
            (a.userId?.email || '').toLowerCase().includes(q)
        );
    }, [alumni, searchText]);

    // Stats
    const totalAlumni = alumni.length;
    const graduated = alumni.filter(a => a.status === 'GRADUATED').length;
    const alumni_ = alumni.filter(a => a.status === 'ALUMNI').length;

    const columns = [
        {
            title: '#',
            key: 'index',
            width: 50,
            align: 'center',
            render: (_, __, index) => (
                <Text type="secondary" style={{ fontSize: 12 }}>{index + 1}</Text>
            ),
        },
        {
            title: 'Roll No',
            dataIndex: 'rollNo',
            key: 'rollNo',
            width: 90,
            sorter: (a, b) => {
                const nA = parseInt(a.rollNo || '0', 10);
                const nB = parseInt(b.rollNo || '0', 10);
                return nA - nB;
            },
            render: rollNo => (
                <Tag color="purple" icon={<IdcardOutlined />}>
                    {rollNo || '—'}
                </Tag>
            ),
        },
        {
            title: 'Student Name',
            dataIndex: 'studentName',
            key: 'studentName',
            sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || ''),
            render: (name, record) => (
                <Space>
                    <Avatar
                        icon={<CrownOutlined />}
                        style={{ backgroundColor: '#722ed1' }}
                        size="small"
                    />
                    <div>
                        <div style={{ fontWeight: 600, color: '#1f1f1f' }}>{name || '—'}</div>
                        {record.userId?.email && (
                            <div style={{ fontSize: 11, color: '#8c8c8c' }}>{record.userId.email}</div>
                        )}
                    </div>
                </Space>
            ),
        },
        {
            title: 'Last Class',
            key: 'classId',
            render: (_, record) => record.classId ? (
                <Space size={4}>
                    <BookOutlined style={{ color: '#1890ff' }} />
                    <span>{record.classId.name}</span>
                    {record.classId.section && (
                        <Tag color="blue" icon={<PartitionOutlined />}>{record.classId.section}</Tag>
                    )}
                </Space>
            ) : <Text type="secondary">—</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            filters: [
                { text: 'Graduated', value: 'GRADUATED' },
                { text: 'Alumni', value: 'ALUMNI' },
            ],
            onFilter: (value, record) => record.status === value,
            render: status => (
                <Badge
                    color={status === 'GRADUATED' ? '#722ed1' : '#531dab'}
                    text={
                        <Tag color="purple" style={{ margin: 0 }}>
                            {status}
                        </Tag>
                    }
                />
            ),
        },
        {
            title: 'Date of Joining',
            dataIndex: 'dateOfJoining',
            key: 'dateOfJoining',
            width: 130,
            render: d => d ? (
                <Space size={4}>
                    <CalendarOutlined style={{ color: '#8c8c8c' }} />
                    <span>{dayjs(d).format('DD MMM YYYY')}</span>
                </Space>
            ) : <Text type="secondary">—</Text>,
        },
        {
            title: 'Sessions',
            key: 'sessions',
            width: 80,
            align: 'center',
            render: (_, record) => (
                <Tag color="geekblue">
                    {record.sessionHistory?.length || 0}
                </Tag>
            ),
        },
        {
            title: 'Academic Journey',
            key: 'history',
            width: 160,
            render: (_, record) => (
                <Tooltip title="View full academic journey">
                    <Button
                        type="link"
                        icon={<HistoryOutlined />}
                        size="small"
                        style={{ padding: 0, color: '#722ed1' }}
                        onClick={() => setSelectedStudentHistory(record)}
                    >
                        View History
                    </Button>
                </Tooltip>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space size="middle" align="center">
                            <div
                                style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <TrophyOutlined style={{ fontSize: 24, color: '#fff' }} />
                            </div>
                            <div>
                                <Title level={2} style={{ margin: 0 }}>
                                    Alumni & Graduation Archival
                                </Title>
                                <Text type="secondary">
                                    Dedicated archive for graduated students. Active students are listed in Student Management.
                                </Text>
                            </div>
                        </Space>
                    </Col>
                    <Col>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchAlumni}
                            loading={loading}
                        >
                            Refresh
                        </Button>
                    </Col>
                </Row>
            </div>

            {/* Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card
                        style={{ borderTop: '4px solid #722ed1', borderRadius: 10, background: '#f9f0ff' }}
                    >
                        <Space>
                            <TrophyOutlined style={{ fontSize: 36, color: '#722ed1' }} />
                            <Statistic
                                title="Total Alumni"
                                value={totalAlumni}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card
                        style={{ borderTop: '4px solid #531dab', borderRadius: 10, background: '#efdbff' }}
                    >
                        <Space>
                            <TeamOutlined style={{ fontSize: 36, color: '#531dab' }} />
                            <Statistic
                                title="Graduated"
                                value={graduated}
                                valueStyle={{ color: '#531dab' }}
                            />
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card
                        style={{ borderTop: '4px solid #9254de', borderRadius: 10, background: '#f4f0ff' }}
                    >
                        <Space>
                            <UserOutlined style={{ fontSize: 36, color: '#9254de' }} />
                            <Statistic
                                title="Alumni (Historical)"
                                value={alumni_}
                                valueStyle={{ color: '#9254de' }}
                            />
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* Search & Table */}
            <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ marginBottom: 16 }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Input
                                placeholder="Search by name, roll no, class, email, or status..."
                                prefix={<SearchOutlined />}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                style={{ width: 380 }}
                                allowClear
                            />
                        </Col>
                        <Col>
                            <Text type="secondary">
                                {filteredAlumni.length} record{filteredAlumni.length !== 1 ? 's' : ''} found
                            </Text>
                        </Col>
                    </Row>
                </div>

                {filteredAlumni.length === 0 && !loading ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            searchText
                                ? `No alumni matching "${searchText}"`
                                : 'No graduated students found. Students appear here after being graduated via the Student Promotion page.'
                        }
                    />
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredAlumni}
                        rowKey="_id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '25', '50'],
                            showTotal: total => `Total ${total} alumni`,
                        }}
                        scroll={{ x: 900 }}
                        rowClassName={() => 'alumni-row'}
                    />
                )}
            </Card>

            {/* Academic Journey Modal */}
            <Modal
                title={
                    selectedStudentHistory
                        ? (
                            <Space>
                                <Avatar icon={<CrownOutlined />} style={{ backgroundColor: '#722ed1' }} />
                                <span>Academic Journey — {selectedStudentHistory.studentName}</span>
                            </Space>
                        )
                        : 'Session History'
                }
                open={Boolean(selectedStudentHistory)}
                onCancel={() => setSelectedStudentHistory(null)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setSelectedStudentHistory(null)}>
                        Close
                    </Button>
                ]}
                width={600}
            >
                {selectedStudentHistory && (
                    <div>
                        {/* Summary */}
                        <Card
                            size="small"
                            style={{ marginBottom: 16, background: '#f9f0ff', borderColor: '#d3adf7' }}
                        >
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Text type="secondary">Roll No</Text>
                                    <div>
                                        <Tag color="purple">{selectedStudentHistory.rollNo || '—'}</Tag>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <Text type="secondary">Final Class</Text>
                                    <div>
                                        <Tag color="cyan">{selectedStudentHistory.classId?.name || '—'}</Tag>
                                    </div>
                                </Col>
                                <Col span={12} style={{ marginTop: 8 }}>
                                    <Text type="secondary">Status</Text>
                                    <div>
                                        <Tag color="purple">{selectedStudentHistory.status}</Tag>
                                    </div>
                                </Col>
                                <Col span={12} style={{ marginTop: 8 }}>
                                    <Text type="secondary">Date of Joining</Text>
                                    <div>
                                        <Text>
                                            {selectedStudentHistory.dateOfJoining
                                                ? dayjs(selectedStudentHistory.dateOfJoining).format('DD MMM YYYY')
                                                : '—'}
                                        </Text>
                                    </div>
                                </Col>
                            </Row>
                        </Card>

                        {selectedStudentHistory.sessionHistory?.length > 0 ? (
                            <Timeline mode="left" style={{ marginTop: 20 }}>
                                {selectedStudentHistory.sessionHistory.map((item, idx) => (
                                    <Timeline.Item
                                        key={idx}
                                        color={
                                            item.status === 'GRADUATE' || item.status === 'GRADUATED'
                                                ? 'purple'
                                                : item.status === 'PROMOTE' || item.status === 'PROMOTED'
                                                    ? 'green'
                                                    : 'blue'
                                        }
                                    >
                                        <Text strong>
                                            {item.sessionName || 'Academic Session'}
                                        </Text>
                                        {' — Class: '}
                                        <Text strong>{item.className || '—'}</Text>
                                        <div>
                                            <Text type="secondary">
                                                Roll No: {item.rollNo || '—'} |{' '}
                                                Status: <Tag color="blue">{item.status}</Tag>
                                            </Text>
                                        </div>
                                        {item.promotedAt && (
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Date: {dayjs(item.promotedAt).format('DD MMM YYYY')}
                                                </Text>
                                            </div>
                                        )}
                                        {item.remarks && (
                                            <div>
                                                <Text type="secondary" style={{ fontStyle: 'italic' }}>
                                                    Note: {item.remarks}
                                                </Text>
                                            </div>
                                        )}
                                    </Timeline.Item>
                                ))}
                            </Timeline>
                        ) : (
                            <Text type="secondary">
                                No archived session history found for this student.
                            </Text>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AlumniDirectory;
