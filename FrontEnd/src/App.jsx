import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import StudentLayout from './components/StudentLayout';
import TeacherLayout from './components/TeacherLayout';
import ParentLayout from './components/ParentLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Parents from './pages/Parents';
import Attendance from './pages/Attendance';
import Fees from './pages/Fees';
import Timetable from './pages/Timetable';
import Results from './pages/Results';
import AcademicWarnings from './pages/AcademicWarnings';
import StudentTimetable from './pages/StudentTimetable';
import StudentAttendance from './pages/StudentAttendance';
import StudentFees from './pages/StudentFees';
import StudentResults from './pages/StudentResults';
import StudentNews from './pages/StudentNews';
import StudentProfile from './pages/StudentProfile';
import TeacherClasses from './pages/TeacherClasses';
import TeacherClassAttendance from './pages/TeacherClassAttendance';
import TeacherClassResults from './pages/TeacherClassResults';
import TeacherClassTimetable from './pages/TeacherClassTimetable';
import ParentOverview from './pages/ParentOverview';
import ParentAttendance from './pages/ParentAttendance';
import ParentFees from './pages/ParentFees';
import ParentResults from './pages/ParentResults';
import ParentTimetable from './pages/ParentTimetable';
import Classes from './pages/Classes';
import RegisterOrganization from './pages/RegisterOrganization';
import './App.css';

const RoleBasedRedirect = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { replace: true });
            return;
        }
        if (!loading && user) {
            const role = user.role?.toUpperCase();
            let redirectPath = '/dashboard';
            if (role === 'STUDENT') redirectPath = '/student/profile'; // ← changed
            else if (role === 'TEACHER') redirectPath = '/teacher/classes';
            else if (role === 'PARENT') redirectPath = '/parent/overview';
            navigate(redirectPath, { replace: true });
        }
    }, [user, loading, navigate]);

    return null;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}

const AppRoutes = () => {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
            }}>
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register-organization" element={<RegisterOrganization />} />
            <Route path="/" element={<RoleBasedRedirect />} />

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']}><MainLayout /></ProtectedRoute>}>
                <Route path="dashboard"  element={<Dashboard />} />
                <Route path="students"   element={<Students />} />
                <Route path="teachers"   element={<Teachers />} />
                <Route path="parents"    element={<Parents />} />
                <Route path="classes"    element={<Classes />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="fees"       element={<Fees />} />
                <Route path="timetable"  element={<Timetable />} />
                <Route path="results"    element={<Results />} />
                <Route path="warnings"   element={<AcademicWarnings />} />
            </Route>

            {/* Teacher */}
            <Route element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherLayout /></ProtectedRoute>}>
                <Route path="teacher" element={<Navigate to="/teacher/classes" replace />} />
                <Route path="teacher/classes" element={<TeacherClasses />} />
                <Route path="teacher/classes/:classId/attendance" element={<TeacherClassAttendance />} />
                <Route path="teacher/classes/:classId/results"    element={<TeacherClassResults />} />
                <Route path="teacher/classes/:classId/timetable"  element={<TeacherClassTimetable />} />
            </Route>

            {/* Student */}
            <Route element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentLayout /></ProtectedRoute>}>
                <Route path="student" element={<Navigate to="/student/profile" replace />} />
                <Route path="student/profile"    element={<StudentProfile />} />
                <Route path="student/timetable"  element={<StudentTimetable />} />
                <Route path="student/attendance" element={<StudentAttendance />} />
                <Route path="student/fees"       element={<StudentFees />} />
                <Route path="student/results"    element={<StudentResults />} />
                <Route path="student/news"       element={<StudentNews />} />
            </Route>

            {/* Parent */}
            <Route element={<ProtectedRoute allowedRoles={['PARENT']}><ParentLayout /></ProtectedRoute>}>
                <Route path="parent" element={<Navigate to="/parent/overview" replace />} />
                <Route path="parent/overview"    element={<ParentOverview />} />
                <Route path="parent/attendance"  element={<ParentAttendance />} />
                <Route path="parent/fees"        element={<ParentFees />} />
                <Route path="parent/results"     element={<ParentResults />} />
                <Route path="parent/timetable"   element={<ParentTimetable />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default App;