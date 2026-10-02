export const teacherClassStudents = {
    nursery: [
        { key: 'n1', rollNo: '01', name: 'John Smit' },
        { key: 'n2', rollNo: '02', name: 'Ali Khan' },
        { key: 'n3', rollNo: '03', name: 'Sara Ahmed' },
    ],
    playgroup: [
        { key: 'p1', rollNo: '01', name: 'Maryam Noor' },
        { key: 'p2', rollNo: '02', name: 'David Lee' },
    ],
    class1: [
        { key: 'c1-1', rollNo: '01', name: 'John Smit' },
        { key: 'c1-2', rollNo: '02', name: 'Ayesha Malik' },
        { key: 'c1-3', rollNo: '03', name: 'Hamza Shah' },
    ],
    class2: [
        { key: 'c2-1', rollNo: '01', name: 'Jane Smith' },
        { key: 'c2-2', rollNo: '02', name: 'Bilal Hussain' },
    ],
    class3: [
        { key: 'c3-1', rollNo: '01', name: 'Alice Johnson' },
        { key: 'c3-2', rollNo: '02', name: 'Zain Ali' },
    ],
    class4: [
        { key: 'c4-1', rollNo: '01', name: 'Bob Brown' },
        { key: 'c4-2', rollNo: '02', name: 'Hina Tariq' },
    ],
    class5: [
        { key: 'c5-1', rollNo: '01', name: 'Charlie Davis' },
        { key: 'c5-2', rollNo: '02', name: 'Sana Riaz' },
    ],
    class6: [
        { key: 'c6-1', rollNo: '01', name: 'Omar Farooq' },
        { key: 'c6-2', rollNo: '02', name: 'Noor Fatima' },
    ],
    class7: [
        { key: 'c7-1', rollNo: '01', name: 'Arham Khan' },
        { key: 'c7-2', rollNo: '02', name: 'Mahnoor Ali' },
    ],
    class8: [
        { key: 'c8-1', rollNo: '01', name: 'Usman Iqbal' },
        { key: 'c8-2', rollNo: '02', name: 'Laiba Aslam' },
    ],
    class9: [
        { key: 'c9-1', rollNo: '01', name: 'Hassan Raza' },
        { key: 'c9-2', rollNo: '02', name: 'Maham Saeed' },
    ],
    class10: [
        { key: 'c10-1', rollNo: '01', name: 'Eman Khan' },
        { key: 'c10-2', rollNo: '02', name: 'Abdullah Noor' },
    ],
};

export function getStudentsForTeacherClass(classKey) {
    return teacherClassStudents[classKey] || [];
}

