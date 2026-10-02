import React, { useState, useEffect } from 'react';
import {
    Badge, Calendar, Typography, Spin, Card,
    Table, Tag, Row, Col, Select
} from 'antd';
import axios from 'axios';
import { useChildStudent } from '../hooks/useChildStudent';

const { Title, Text } = Typography;
const { Option } = Select;

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ParentTimetable = () => {
    const { child, loading: childLoading, error: childError } = useChildStudent();
    const [timetable, setTimetable] = useState([]);
    const [loadingTimetable, setLoadingTimetable] = useState(false);
    const [view, setView] = useState('grid'); // 'grid' | 'calendar' | 'table'

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
        if (child?.classId?._id) {
            fetchTimetable(child.classId._id);
        }
    }, [child]);

    const fetchTimetable = async (classId) => {
        setLoadingTimetable(true);
        try {
            const res = await axios.get(`/api/v1/timetable/class/${classId}`);
            setTimetable(res.data.data || []);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Timetable fetch error:', errorMsg);
            // Silent fail for parent view - don't show error message to avoid confusion
            setTimetable([]);
        } finally {
            setLoadingTimetable(false);
        }
    };

    // ── Calendar cell render ──────────────────────────────────────────────────
    const dateCellRender = (value) => {
        const dayName = value.format('dddd');
        const entries = timetable.filter((t) => t.dayOfWeek === dayName);
        return (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {entries.map((item) => (
                    <li key={item._id}>
                        <Badge
                            status="success"
                            text={
                                <span style={{ fontSize: 11 }}>
                                    {item.timeSlot} — {item.subject} ({item.roomLocation})
                                </span>
                            }
                        />
                    </li>
                ))}
            </ul>
        );
    };

    // ── Weekly grid ───────────────────────────────────────────────────────────
    const WeeklyGrid = () => (
        <Row gutter={[8, 8]}>
            {DAY_ORDER.map((day) => {
                const dayEntries = timetable
                    .filter((t) => t.dayOfWeek === day)
                    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

                return (
                    <Col xs={24} sm={12} lg={8} xl={4} key={day}>
                        <Card
                            size="small"
                            title={<span style={{ fontWeight: 700 }}>{day}</span>}
                            style={{ minHeight: 180 }}
                            headStyle={{
                                backgroundColor: '#f0f5ff',
                                borderBottom: '2px solid #1890ff',
                            }}
                        >
                            {dayEntries.length === 0 ? (
                                <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center', paddingTop: 16 }}>
                                    No classes
                                </div>
                            ) : (
                                dayEntries.map((entry) => (
                                    <div
                                        key={entry._id}
                                        style={{
                                            background: '#e6f7ff',
                                            border: '1px solid #91d5ff',
                                            borderRadius: 6,
                                            padding: '6px 8px',
                                            marginBottom: 6,
                                            fontSize: 12,
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, color: '#1890ff' }}>
                                            {entry.subject}
                                        </div>
                                        <div style={{ color: '#555' }}>{entry.timeSlot}</div>
                                        <div style={{ color: '#888' }}>
                                            {entry.teacherId?.name || '-'}
                                        </div>
                                        <div style={{ color: '#aaa' }}>{entry.roomLocation}</div>
                                    </div>
                                ))
                            )}
                        </Card>
                    </Col>
                );
            })}
        </Row>
    );

    // ── Table view columns ────────────────────────────────────────────────────
    const tableColumns = [
        {
            title: 'Day',
            dataIndex: 'dayOfWeek',
            key: 'dayOfWeek',
            sorter: (a, b) =>
                DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
            render: (day) => <Tag color="blue">{day}</Tag>,
        },
        { title: 'Time Slot', dataIndex: 'timeSlot', key: 'timeSlot' },
        { title: 'Subject', dataIndex: 'subject', key: 'subject' },
        {
            title: 'Teacher',
            key: 'teacher',
            render: (_, r) => r.teacherId?.name || '-',
        },
        { title: 'Room', dataIndex: 'roomLocation', key: 'roomLocation' },
    ];

    // ── Loading / error ───────────────────────────────────────────────────────
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

    if (!child.classId?._id) {
        return <Text type="warning">Student is not assigned to a class yet.</Text>;
    }

    return (
        <div>
            <Title level={2}>Timetable</Title>
            <Text type="secondary">
                Read-only schedule for <strong>{child.studentName}</strong> — {child.classId?.name}
            </Text>

            {/* ── View toggle ── */}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
                <Select
                    value={view}
                    onChange={setView}
                    style={{ width: 160 }}
                >
                    <Option value="grid">Weekly Grid</Option>
                    <Option value="table">Table View</Option>
                </Select>
            </div>

            {/* ── Content ── */}
            {loadingTimetable ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : timetable.length === 0 ? (
                <Card>
                    <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
                        No timetable entries found for this class
                    </div>
                </Card>
            ) : (
                <>
                    {view === 'grid' && <WeeklyGrid />}

                    {view === 'table' && (
                        <Table
                            rowKey="_id"
                            columns={tableColumns}
                            dataSource={timetable}
                            pagination={false}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default ParentTimetable;