import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Space, Typography, Spin, message } from 'antd';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const { Title, Paragraph } = Typography;

const TeacherClasses = () => {
    const navigate = useNavigate();
    const { profile, loading: authLoading } = useAuth();
    const [classes, setClasses] = useState([]);
    const [studentCounts, setStudentCounts] = useState({});
    const [loading, setLoading] = useState(false);

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
        fetchClasses(); 
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/classes/');
            const all = res.data.data?.classes || res.data.data || [];
            setClasses(all);
            if (all.length > 0) {
                fetchStudentCounts(all);
            }
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentCounts = async (classList) => {
        try {
            const results = await Promise.all(
                classList.map((cls) =>
                    axios.get(`/api/v1/students/class/${cls._id}`)
                        .then((r) => ({ 
                            id: cls._id, 
                            count: r.data.data?.length || 0 
                        }))
                        .catch((err) => {
                            console.error(`Failed to fetch student count for class ${cls._id}:`, extractErrorMessage(err));
                            return { id: cls._id, count: 0 };
                        })
                )
            );
            const map = {};
            results.forEach(({ id, count }) => { map[id] = count; });
            setStudentCounts(map);
        } catch (err) {
            const errorMsg = extractErrorMessage(err);
            console.error('Failed to fetch student counts:', errorMsg);
            // Don't show error message to user - just set empty counts
            const emptyMap = {};
            classList.forEach(cls => { emptyMap[cls._id] = 0; });
            setStudentCounts(emptyMap);
        }
    };

    // Filter classes based on teacher's assigned classes if needed
    const filteredClasses = classes;

    if (authLoading || loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 0' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 8 }}>Class Dashboard</Title>
                <Paragraph type="secondary" style={{ maxWidth: 560 }}>
                    Select a class to view attendance, results and timetable.
                </Paragraph>
                {profile && (
                    <Paragraph type="secondary">
                        Teacher: <strong>{profile.name}</strong> — {profile.subject || 'Teacher'}
                    </Paragraph>
                )}
            </div>

            {filteredClasses.length === 0 ? (
                <Card style={{ borderRadius: '10px', textAlign: 'center', padding: 40 }}>
                    <div style={{ color: '#8c8c8c' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
                        <div style={{ fontSize: 16 }}>No classes assigned to you yet.</div>
                        <Paragraph type="secondary" style={{ marginTop: 8 }}>
                            Please contact the administrator to assign classes.
                        </Paragraph>
                    </div>
                </Card>
            ) : (
                <Row gutter={[20, 20]}>
                    {filteredClasses.map((cls) => (
                        <Col key={cls._id} xs={24} sm={12} md={12} lg={8} xl={6}>
                            <Card
                                hoverable
                                className="hover-card"
                                onClick={() => navigate(`/teacher/classes/${cls._id}/attendance`)}
                                bodyStyle={{ padding: 20 }}
                                style={{ borderRadius: 18, boxShadow: '0 12px 24px rgba(0,0,0,0.08)', minHeight: 200 }}
                                headStyle={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0', borderRadius: '18px 18px 0 0' }}
                                title={<div style={{ fontWeight: 700, fontSize: 18 }}>{cls.name}</div>}
                            >
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    <Row gutter={12} style={{ textAlign: 'center' }}>
                                        <Col span={12}>
                                            <div style={{ color: '#8c8c8c', fontSize: 12 }}>Students</div>
                                            <div style={{ fontSize: 20, fontWeight: 700 }}>
                                                {studentCounts[cls._id] !== undefined ? studentCounts[cls._id] : '...'}
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{ color: '#8c8c8c', fontSize: 12 }}>Class Teacher</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1890ff' }}>
                                                {cls.classTeacherId?.name || 'Not Assigned'}
                                            </div>
                                        </Col>
                                    </Row>
                                    <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
                                        Tap to open attendance and results for this class.
                                    </Paragraph>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

export default TeacherClasses;