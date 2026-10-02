import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    CalendarOutlined,
    LogoutOutlined,
    FileDoneOutlined,
    DollarOutlined,
    ReadOutlined,
    NotificationOutlined,
    IdcardOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const StudentLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userMenu = [
        {
            key: 'logout',
            label: 'Logout',
            icon: <LogoutOutlined />,
            onClick: handleLogout,
        },
    ];

    const items = [
        { key: '/student/profile', icon: <IdcardOutlined />, label: 'My profile' },
        { key: '/student/timetable', icon: <CalendarOutlined />, label: 'Timetable' },
        { key: '/student/attendance', icon: <FileDoneOutlined />, label: 'Attendance' },
        { key: '/student/fees', icon: <DollarOutlined />, label: 'Fees' },
        { key: '/student/results', icon: <ReadOutlined />, label: 'Results & grades' },
        // { key: '/student/news', icon: <NotificationOutlined />, label: 'News' }, TODO: Add news page later
    ];

    return (
        <Layout style={{ height: '100dvh', overflow: 'hidden' }}>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <div
                    style={{
                        margin: 16,
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.12)',
                        borderRadius: 8,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                    }}
                >
                    {user?.username || 'Student'}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={items}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <Layout style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <Header
                    style={{
                        padding: '0 24px 0 0',
                        background: colorBgContainer,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            fontSize: '16px',
                            width: 64,
                            height: 64,
                        }}
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
                            <span>{user?.username || user?.email || 'Student'}</span>
                        </Space>
                    </Dropdown>
                </Header>
                <Content
                    style={{
                        margin: '16px 12px',
                        padding: 16,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                        overflowY: 'auto',
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default StudentLayout;
