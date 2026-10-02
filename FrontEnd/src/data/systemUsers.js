/**
 * Accounts & permission templates for the admin “Users & permissions” screen (static demo).
 * Login credentials remain in teachers.js / parents.js / students.js + admin hardcoded.
 */

export const permissionCatalog = [
    { key: 'students', label: 'Student management' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'fees', label: 'Fees' },
    { key: 'timetable', label: 'Timetable' },
    { key: 'results', label: 'Results' },
    { key: 'warnings', label: 'Academic warnings' },
    { key: 'approvals', label: 'Approval workflows' },
    { key: 'analytics', label: 'Analytics dashboard' },
    { key: 'users', label: 'Users & permissions' },
];

export const systemUsersSeed = [
    {
        key: 'u1',
        name: 'Administrator',
        email: 'admin@school.edu',
        role: 'admin',
        status: 'active',
        permissions: ['students', 'attendance', 'fees', 'timetable', 'results', 'warnings', 'approvals', 'analytics', 'users'],
    },
    {
        key: 'u2',
        name: 'Mr. Robert Smith',
        email: 'teacher@school.edu',
        role: 'teacher',
        status: 'active',
        permissions: ['attendance', 'results'],
    },
    {
        key: 'u3',
        name: 'Ms. Emily Johnson',
        email: 'ejohnson@school.edu',
        role: 'teacher',
        status: 'active',
        permissions: ['attendance', 'results'],
    },
    {
        key: 'u4',
        name: 'Michael Doe',
        email: 'parent.john@example.com',
        role: 'parent',
        status: 'active',
        permissions: ['portal_readonly'],
    },
    {
        key: 'u5',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'student',
        status: 'active',
        permissions: ['portal_readonly'],
    },
];
