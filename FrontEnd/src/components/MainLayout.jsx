import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    DashboardOutlined,
    TeamOutlined,
    DollarOutlined,
    CalendarOutlined,
    FileDoneOutlined,
    LogoutOutlined,
    WarningOutlined,
    ReadOutlined,
    BookOutlined,
    SolutionOutlined,
    CrownOutlined,
    BankOutlined,
    AccountBookOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
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
        { key: '/dashboard',         icon: <DashboardOutlined />,   label: 'Analytics Dashboard' },
        { key: '/academic-sessions', icon: <CalendarOutlined />,    label: 'Academic Sessions' },
        { key: '/students',          icon: <TeamOutlined />,        label: 'Students' },
        { key: '/student-promotion', icon: <SolutionOutlined />,    label: 'Student Promotion' },
        { key: '/alumni-directory',  icon: <CrownOutlined />,       label: 'Alumni Directory' },
        { key: '/teachers',          icon: <TeamOutlined />,        label: 'Teachers' },
        { key: '/parents',           icon: <TeamOutlined />,        label: 'Parents' },
        { key: '/classes',           icon: <BookOutlined />,        label: 'Classes' },
        { key: '/attendance',        icon: <FileDoneOutlined />,    label: 'Attendance' },
        { key: '/fees',              icon: <DollarOutlined />,      label: 'Fees & Vouchers' },
        { key: '/payroll',           icon: <BankOutlined />,        label: 'Staff Payroll' },
        { key: '/expenses',          icon: <AccountBookOutlined />, label: 'Expense Ledger' },
        { key: '/timetable',         icon: <CalendarOutlined />,    label: 'Timetable' },
        { key: '/results',           icon: <ReadOutlined />,        label: 'Results' },
        { key: '/warnings',          icon: <WarningOutlined />,     label: 'Academic Warnings' },
    ];

    return (
        /*
         * height:100dvh + overflow:hidden keeps the body from scrolling.
         * Scrolling happens ONLY inside the <Content> below.
         */
        <Layout style={{ height: '100dvh', overflow: 'hidden' }}>

            {/* ── Sidebar ─────────────────────────────────────────── */}
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={200}
                style={{ height: '100dvh', overflow: 'auto' }}
            >
                {/* Brand badge */}
                <div style={{
                    margin: '12px',
                    padding: '7px 10px',
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 12,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {collapsed ? '🏫' : (user?.username || 'School Admin')}
                </div>

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={items}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>

            {/* ── Right panel ─────────────────────────────────────── */}
            <Layout style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

                {/* Header */}
                <Header style={{
                    padding: '0 32px 0 0',
                    background: colorBgContainer,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                }}>
                    {/* Sidebar toggle */}
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(v => !v)}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />

                    {/* Right: org badge + avatar + username */}
                    <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                        <Space style={{ cursor: 'pointer' }}>
                            {user?.organizationId && (
                                <span style={{
                                    padding: '4px 10px',
                                    background: 'rgba(102,126,234,0.1)',
                                    color: '#667eea',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid rgba(102,126,234,0.2)',
                                    marginRight: 8,
                                    maxWidth: 140,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-block',
                                }}>
                                    🏫 {user.organizationId}
                                </span>
                            )}
                            <Avatar icon={<UserOutlined />} />
                            <span style={{
                                maxWidth: 150,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                                fontSize: 13,
                            }}>
                                {user?.username || user?.email || 'Admin'}
                            </span>
                        </Space>
                    </Dropdown>
                </Header>

                {/* Content — this is the only element that scrolls */}
                <Content style={{
                    margin: '16px 12px',
                    padding: 16,
                    background: colorBgContainer,
                    borderRadius: borderRadiusLG,
                    overflowY: 'auto',   /* scroll happens here, not on body */
                    flex: 1,
                    minHeight: 0,        /* critical for flex scroll to work */
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;