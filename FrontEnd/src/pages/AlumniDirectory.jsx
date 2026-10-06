import React, { useState, useEffect } from 'react';
import {
    Table, Button, Input, Space, Tag, Card, Row, Col, Typography, Timeline, Avatar, Modal
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, HistoryOutlined, IdcardOutlined, CrownOutlined
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

    const filteredAlumni = alumni.filter(a =>
        a.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
        a.rollNo.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'Roll No',
            dataIndex: 'rollNo',
            key: 'rollNo',
            render: text => <Text strong>{text}</Text>
        },
        {
            title: 'Student Name',
            dataIndex: 'studentName',
            key: 'studentName',
            render: (text) => (
                <Space>
                    <Avatar icon={<CrownOutlined />} style={{ backgroundColor: '#722ed1' }} />
                    <Text strong style={{ fontSize: '15px' }}>{text}</Text>
                </Space>
            )
        },
        {
            title: 'Last Class',
            dataIndex: 'classId',
            key: 'classId',
            render: cls => cls ? cls.name : <Text type="secondary">-</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: status => <Tag color="purple">{status}</Tag>
        },
        {
            title: 'Date of Joining',
            dataIndex: 'dateOfJoining',
            key: 'dateOfJoining',
            render: d => d ? dayjs(d).format('DD MMM YYYY') : '-'
        },
        {
            title: 'Academic Journey',
            key: 'history',
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<HistoryOutlined />}
                    onClick={() => setSelectedStudentHistory(record)}
                >
                    View History ({record.sessionHistory?.length || 0} Sessions)
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
            <div style={{ marginBottom: '24px' }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={2} style={{ margin: 0 }}>
                            <CrownOutlined style={{ marginRight: '10px', color: '#722ed1' }} />
                            Alumni & Graduation Archival
                        </Title>
                        <Text type="secondary">Archived directory of graduated batches and historical academic journey verification.</Text>
                    </Col>
                    <Col>
                        <Button icon={<ReloadOutlined />} onClick={fetchAlumni}>Refresh</Button>
                    </Col>
                </Row>
            </div>

            <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ marginBottom: '16px' }}>
                    <Input
                        placeholder="Search alumni student name or roll number..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: '360px' }}
                        allowClear
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredAlumni}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                />
            </Card>

            <Modal
                title={selectedStudentHistory ? `Academic Journey History - ${selectedStudentHistory.studentName}` : 'Session History'}
                open={Boolean(selectedStudentHistory)}
                onCancel={() => setSelectedStudentHistory(null)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setSelectedStudentHistory(null)}>
                        Close
                    </Button>
                ]}
            >
                {selectedStudentHistory && selectedStudentHistory.sessionHistory?.length > 0 ? (
                    <Timeline mode="left" style={{ marginTop: '20px' }}>
                        {selectedStudentHistory.sessionHistory.map((item, idx) => (
                            <Timeline.Item key={idx} color={item.status === 'GRADUATE' ? 'purple' : 'green'}>
                                <Text strong>{item.sessionName || 'Academic Session'}</Text> - Class: <Text strong>{item.className}</Text>
                                <div><Text type="secondary">Roll No: {item.rollNo} | Status: <Tag color="blue">{item.status}</Tag></Text></div>
                                {item.promotedAt && (
                                    <div><Text type="secondary" style={{ fontSize: '12px' }}>Date: {dayjs(item.promotedAt).format('DD MMM YYYY')}</Text></div>
                                )}
                                {item.remarks && (
                                    <div><Text type="secondary" style={{ fontStyle: 'italic' }}>Note: {item.remarks}</Text></div>
                                )}
                            </Timeline.Item>
                        ))}
                    </Timeline>
                ) : (
                    <Text type="secondary">No archived session history found for this student.</Text>
                )}
            </Modal>
        </div>
    );
};

export default AlumniDirectory;
