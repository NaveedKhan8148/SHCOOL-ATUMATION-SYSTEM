import React, { useMemo, useState } from 'react';
import {
    Layout, Menu, Button, theme, Avatar,
    Dropdown, Space, Typography,
} from 'antd';
import {
    MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined,
    LogoutOutlined, FileDoneOutlined, ReadOutlined,
    CalendarOutlined, BookOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const TeacherLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

    const navigate = useNavigate();
    const location = useLocation();

    // ✅ classId (MongoDB _id) not classKey
    const { classId } = useParams();
    const { user, profile, logout } = useAuth();

    const isClassScreen = Boolean(classId);
    const base = classId ? `/teacher/classes/${classId}` : '/teacher';

    const userMenu = useMemo(() => [
        {
            key: 'logout',
            label: 'Logout',
            icon: <LogoutOutlined />,
            onClick: () => { logout(); navigate('/login'); },
        },
    ], [logout, navigate]);

    const items = useMemo(() => {
        const homeKey = '/teacher/classes';
        if (!isClassScreen) {
            return [{ key: homeKey, icon: <BookOutlined />, label: 'Classes' }];
        }
        return [
            { key: homeKey,              icon: <BookOutlined />,    label: 'Classes'    },
            { key: `${base}/attendance`, icon: <FileDoneOutlined />,label: 'Attendance' },
            { key: `${base}/results`,    icon: <ReadOutlined />,    label: 'Results'    },
            { key: `${base}/timetable`,  icon: <CalendarOutlined />,label: 'Timetable'  },
        ];
    }, [base, isClassScreen]);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <div style={{
                    margin: 16, padding: '12px 14px',
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: 8, color: '#fff',
                    fontWeight: 600, fontSize: 14,
                }}>
                    {/* Show teacher name from profile, fallback to email */}
                    {collapsed ? '👨‍🏫' : (profile?.name || user?.email || 'Teacher')}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={items}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>

            <Layout>
                <Header style={{
                    padding: '0 24px 0 0',
                    background: colorBgContainer,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: 16, width: 64, height: 64 }}
                    />
                    <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                        <Space style={{ cursor: 'pointer' }}>
                            {user?.organizationId && (
                                <span style={{
                                    padding: '4px 10px',
                                    background: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid rgba(102, 126, 234, 0.2)',
                                    marginRight: '8px'
                                }}>
                                    🏫 {user.organizationId}
                                </span>
                            )}
                            <Avatar icon={<UserOutlined />} />
                            <span>{profile?.name || user?.email || 'Teacher'}</span>
                        </Space>
                    </Dropdown>
                </Header>

                <Content style={{
                    margin: '24px 16px',
                    padding: 24,
                    minHeight: 280,
                    background: colorBgContainer,
                    borderRadius: borderRadiusLG,
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default TeacherLayout;
