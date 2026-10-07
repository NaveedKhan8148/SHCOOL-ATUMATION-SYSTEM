import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

/**
 * Calculates grade based on percentage (School standard)
 */
export const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
};

/**
 * Generates an official complete Student Academic Transcript PDF
 */
export const generateStudentTranscriptPDF = ({
    studentName = 'Student',
    rollNo = '-',
    fatherName = '-',
    className = '-',
    semester = 'Academic Term',
    results = [],
    schoolName = 'SCHOOL AUTOMATION SYSTEM'
}) => {
    const doc = new jsPDF();

    // 1. Primary Header Banner
    doc.setFillColor(30, 58, 138); // Deep Navy Blue
    doc.rect(0, 0, 210, 36, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(schoolName.toUpperCase(), 105, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL ACADEMIC TRANSCRIPT & PERFORMANCE REPORT', 105, 25, { align: 'center' });

    // Decorative line below header
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(1.5);
    doc.line(0, 36, 210, 36);

    // 2. Student Info & Meta Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, 42, 182, 34, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);

    // Column 1 (Left)
    doc.setFont('helvetica', 'bold');
    doc.text('Student Name:', 18, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(String(studentName), 48, 50);

    doc.setFont('helvetica', 'bold');
    doc.text('Roll Number:', 18, 57);
    doc.setFont('helvetica', 'normal');
    doc.text(String(rollNo), 48, 57);

    doc.setFont('helvetica', 'bold');
    doc.text('Father Name:', 18, 64);
    doc.setFont('helvetica', 'normal');
    doc.text(String(fatherName), 48, 64);

    doc.setFont('helvetica', 'bold');
    doc.text('Class & Sec:', 18, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(String(className), 48, 71);

    // Column 2 (Right)
    doc.setFont('helvetica', 'bold');
    doc.text('Exam Term/Session:', 115, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(String(semester), 158, 50);

    doc.setFont('helvetica', 'bold');
    doc.text('Date of Issue:', 115, 57);
    doc.setFont('helvetica', 'normal');
    doc.text(dayjs().format('DD MMMM YYYY'), 158, 57);

    // Calculate aggregated totals
    let totalObtained = 0;
    let totalMax = 0;
    let failCount = 0;

    const tableRows = results.map((r, index) => {
        const marks = Number(r.marks) || 0;
        const maxMarks = Number(r.maxMarks) || 100;
        const pct = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
        const grade = r.grade || calculateGrade(pct);
        const status = grade === 'F' ? 'FAIL' : 'PASS';

        totalObtained += marks;
        totalMax += maxMarks;
        if (status === 'FAIL') failCount++;

        return [
            index + 1,
            r.subject || 'Subject',
            maxMarks,
            marks,
            `${pct.toFixed(1)}%`,
            grade,
            status
        ];
    });

    const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const avgMarks = results.length > 0 ? (totalObtained / results.length).toFixed(1) : 0;
    const finalGrade = calculateGrade(overallPct);

    let resultStatus = 'PASSED';
    if (failCount > 0) {
        resultStatus = 'NEEDS IMPROVEMENT';
    } else if (overallPct >= 80) {
        resultStatus = 'PASSED WITH DISTINCTION';
    }

    // Status Badge in Meta Box
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Status:', 115, 66);
    if (failCount === 0) {
        doc.setTextColor(22, 101, 52); // Green
    } else {
        doc.setTextColor(185, 28, 28); // Red
    }
    doc.text(resultStatus, 148, 66);

    // Reset Text Color
    doc.setTextColor(15, 23, 42);

    // 3. Itemized Subject Marks Table
    autoTable(doc, {
        startY: 82,
        head: [['S.#', 'Subject Name', 'Max Marks', 'Obtained', 'Percentage', 'Grade', 'Status']],
        body: tableRows.length > 0 ? tableRows : [['-', 'No Subject Marks Entered', '-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: {
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 68 },
            2: { cellWidth: 24, halign: 'center' },
            3: { cellWidth: 24, halign: 'center' },
            4: { cellWidth: 26, halign: 'center' },
            5: { cellWidth: 18, halign: 'center' },
            6: { cellWidth: 16, halign: 'center' }
        },
        bodyStyles: {
            fontSize: 9.5,
            textColor: [30, 41, 59]
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 6) {
                if (data.cell.raw === 'PASS') {
                    data.cell.styles.textColor = [22, 101, 52];
                    data.cell.styles.fontStyle = 'bold';
                } else if (data.cell.raw === 'FAIL') {
                    data.cell.styles.textColor = [185, 28, 28];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    let currentY = doc.lastAutoTable.finalY + 8;

    // 4. Aggregated Summary & Final Performance Block
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 182, 32, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('ACADEMIC SUMMARY', 18, currentY + 8);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);

    // Left Column Summary
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Maximum Marks: `, 18, currentY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalMax}`, 65, currentY + 16);

    doc.setFont('helvetica', 'normal');
    doc.text(`Total Obtained Marks: `, 18, currentY + 24);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalObtained}`, 65, currentY + 24);

    // Middle Column Summary
    doc.setFont('helvetica', 'normal');
    doc.text(`Overall Percentage: `, 95, currentY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${overallPct.toFixed(1)}%`, 140, currentY + 16);

    doc.setFont('helvetica', 'normal');
    doc.text(`Average Subject Marks: `, 95, currentY + 24);
    doc.setFont('helvetica', 'bold');
    doc.text(`${avgMarks}`, 140, currentY + 24);

    // Right Box - Final Grade & Status
    doc.setFillColor(30, 58, 138);
    doc.rect(155, currentY + 4, 37, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('FINAL GRADE', 173.5, currentY + 11, { align: 'center' });
    doc.setFontSize(14);
    doc.text(finalGrade, 173.5, currentY + 22, { align: 'center' });

    currentY += 40;

    // 5. Grading Policy Scale Legend Table
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Grading Scale & Policy:', 14, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('A+ (90-100%) | A (80-89%) | B+ (70-79%) | B (60-69%) | C+ (50-59%) | C (40-49%) | F (Below 40% - Fail)', 14, currentY + 5);

    // 6. Signatures & Remarks Footer Section
    currentY += 22;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Class Teacher Remarks: __________________________________________________________________________', 14, currentY);

    currentY += 25;
    doc.setDrawColor(148, 163, 184);
    doc.line(20, currentY, 75, currentY);
    doc.line(135, currentY, 190, currentY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Class Teacher Signature', 47.5, currentY + 5, { align: 'center' });
    doc.text('Controller of Examinations / Principal', 162.5, currentY + 5, { align: 'center' });

    // Download file
    const safeStudentName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeSemester = semester.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Transcript_${safeStudentName}_${safeSemester}.pdf`);
};
