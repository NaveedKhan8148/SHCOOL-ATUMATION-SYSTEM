/**
 * Rule-based academic warnings (predefined criteria — no ML).
 * Teachers see rows assigned to their teacherId; admins see all.
 */
export const academicWarningsData = [
    {
        key: '1',
        studentId: 'STU003',
        studentName: 'Alice Johnson',
        program: 'Engineering',
        classLabel: 'ENG-201',
        rule: 'Attendance below 75%',
        detail: 'Overall attendance is 68% for the semester.',
        severity: 'high',
        teacherId: 'TCH001',
    },
    {
        key: '2',
        studentId: 'STU005',
        studentName: 'Charlie Davis',
        program: 'Arts',
        classLabel: 'ART-101',
        rule: 'Failure in multiple subjects',
        detail: 'Grades below pass in 2 subjects in Midterm.',
        severity: 'high',
        teacherId: 'TCH002',
    },
    {
        key: '3',
        studentId: 'STU004',
        studentName: 'Bob Brown',
        program: 'Computer Science',
        classLabel: 'CS-101',
        rule: 'Declining performance trend',
        detail: 'Average dropped by 12% compared to previous term.',
        severity: 'medium',
        teacherId: 'TCH001',
    },
];
