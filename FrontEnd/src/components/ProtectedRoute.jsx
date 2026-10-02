// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading } = useAuth();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh' 
            }}>
                <Spin size="large" />
            </div>
        );
    }

    // Not logged in - redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check role authorization
    if (allowedRoles.length > 0) {
        const userRole = user.role?.toLowerCase();
        const hasAccess = allowedRoles.some(role => 
            role.toLowerCase() === userRole
        );
        
        if (!hasAccess) {
            // Redirect to appropriate dashboard based on role
            let redirectPath = '/dashboard';
            if (userRole === 'student') redirectPath = '/student/timetable';
            else if (userRole === 'teacher') redirectPath = '/teacher/attendance';
            else if (userRole === 'parent') redirectPath = '/parent/overview';
            
            return <Navigate to={redirectPath} replace />;
        }
    }

    return children;
};

export default ProtectedRoute;