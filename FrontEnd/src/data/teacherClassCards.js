export const teacherClassCards = [
    // These are static demo classes for the teacher portal UI.
    // Numbers represent attendance snapshot for the selected class (no backend).
    { key: 'nursery', label: 'Nursery', total: 20, present: 18, absent: 2 },
    { key: 'playgroup', label: 'palygroup', total: 20, present: 19, absent: 1 },
    { key: 'class1', label: 'Class1', total: 20, present: 18, absent: 2 },
    { key: 'class2', label: 'Class 2', total: 20, present: 17, absent: 3 },
    { key: 'class3', label: 'class 3', total: 20, present: 16, absent: 4 },
    { key: 'class4', label: 'class 4', total: 20, present: 18, absent: 2 },
    { key: 'class5', label: 'class 5', total: 20, present: 15, absent: 5 },
    { key: 'class6', label: 'class 6', total: 20, present: 18, absent: 2 },
    { key: 'class7', label: 'class 7', total: 20, present: 19, absent: 1 },
    { key: 'class8', label: 'class 8', total: 20, present: 17, absent: 3 },
    { key: 'class9', label: 'class 9', total: 20, present: 16, absent: 4 },
    { key: 'class10', label: 'class 10', total: 20, present: 18, absent: 2 },
];

export function getTeacherClassCard(classKey) {
    return teacherClassCards.find((c) => c.key === classKey) || null;
}

