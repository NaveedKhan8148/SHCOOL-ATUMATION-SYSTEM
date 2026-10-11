import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Card, Statistic, Row, Col, Tag, Modal,
    Form, Input, Select, DatePicker, message, Space, Popconfirm,
    Tooltip, Avatar, Typography, Badge, Divider, InputNumber, Tabs, Alert
} from 'antd';
import {
    PlusOutlined, PrinterOutlined, ReloadOutlined,
    CheckOutlined, EditOutlined, DeleteOutlined,
    DollarOutlined, ClockCircleOutlined, WarningOutlined,
    UserOutlined, FileTextOutlined, SaveOutlined, SearchOutlined,
    MinusCircleOutlined, DollarCircleOutlined, BankOutlined, CheckCircleOutlined,
    CarOutlined, FundOutlined, PieChartOutlined, RiseOutlined
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import dayjs from 'dayjs';
import { useOrganization } from '../context/OrganizationContext';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

const Fees = () => {
    const { organizationName } = useOrganization();
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [fees, setFees] = useState([]);
    const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
    const [isPayModalVisible, setIsPayModalVisible] = useState(false);
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
    const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);
    const [selectedFeeRecord, setSelectedFeeRecord] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [tableLoading, setTableLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [voucherForm] = Form.useForm();
    const [payForm] = Form.useForm();
    // Split payment state
    const [tuitionPayAmount, setTuitionPayAmount] = useState(0);
    const [transportPayAmount, setTransportPayAmount] = useState(0);
    const [tuitionError, setTuitionError] = useState('');
    const [transportError, setTransportError] = useState('');
    const [classFilter, setClassFilter] = useState('');

    const extractErrorMessage = (error) => {
        if (error.response?.data?.message) return error.response.data.message;
        return error.message || 'Operation failed';
    };

    useEffect(() => {
        fetchInitialData();
        fetchFees();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [studentRes, classRes, sessionRes] = await Promise.all([
                axios.get('/api/v1/students', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/v1/classes', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/v1/academic-sessions', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (studentRes.data?.data) setStudents(studentRes.data.data);
            if (classRes.data?.data) setClasses(classRes.data.data);
            if (sessionRes.data?.data) setSessions(sessionRes.data.data);
        } catch (err) {
            console.error(extractErrorMessage(err));
        }
    };

    const fetchFees = async () => {
        setTableLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/fees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) setFees(res.data.data);
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setTableLoading(false);
        }
    };

    // Filter fees by Student
    const studentFeeSummary = useMemo(() => {
        const summary = {};
        fees.forEach(f => {
            if (!f.studentId) return;
            const sId = f.studentId._id;
            if (!summary[sId]) {
                summary[sId] = {
                    student: f.studentId,
                    totalFee: 0,
                    totalPaid: 0,
                    academicFee: 0,
                    academicPaid: 0,
                    transportFee: 0,
                    transportPaid: 0,
                    vouchers: []
                };
            }

            const expectedTransport = f.feeHeads.reduce((acc, h) => acc + (h.headName.toLowerCase().includes('transport') ? h.amount : 0), 0);
            const expectedAcademic = Math.max(0, f.netPayable - expectedTransport);

            summary[sId].totalFee += f.netPayable;
            summary[sId].totalPaid += (f.paidAmount || 0);
            summary[sId].academicFee += expectedAcademic;
            summary[sId].academicPaid += (f.academicPaid || 0);
            summary[sId].transportFee += expectedTransport;
            summary[sId].transportPaid += (f.transportPaid || 0);

            summary[sId].vouchers.push(f);
        });

        return Object.values(summary).map(s => {
            s.totalRemaining = s.totalFee - s.totalPaid;
            s.academicRemaining = s.academicFee - s.academicPaid;
            s.transportRemaining = s.transportFee - s.transportPaid;

            let status = 'PAID';
            if (s.totalRemaining === s.totalFee && s.totalFee > 0) status = 'PENDING';
            else if (s.totalRemaining > 0) status = 'PARTIAL';
            
            if (s.vouchers.some(v => v.status === 'OVERDUE' && v.netPayable > (v.paidAmount || 0))) {
                status = 'OVERDUE';
            }
            s.status = status;
            
            // Sort vouchers by dueDate
            s.vouchers.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            return s;
        }).filter(s => {
            const name = s.student.studentName || '';
            const roll = s.student.rollNo || '';
            const matchesSearch = name.toLowerCase().includes(searchText.toLowerCase()) || roll.toLowerCase().includes(searchText.toLowerCase());
            const matchesStatus = statusFilter ? s.status === statusFilter : true;
            const matchesClass = classFilter ? s.student.classId?._id === classFilter : true;
            return matchesSearch && matchesStatus && matchesClass;
        });
    }, [fees, searchText, statusFilter, classFilter]);

    // Financial Overview Counters
    const totalCollected = useMemo(() => {
        return studentFeeSummary.reduce((sum, s) => sum + s.totalPaid, 0);
    }, [studentFeeSummary]);

    const totalPending = useMemo(() => {
        return studentFeeSummary.reduce((sum, s) => sum + s.totalRemaining, 0);
    }, [studentFeeSummary]);

    const overdueCount = useMemo(() => {
        let count = 0;
        studentFeeSummary.forEach(s => {
            count += s.vouchers.filter(v => v.status === 'OVERDUE' && v.netPayable > (v.paidAmount || 0)).length;
        });
        return count;
    }, [studentFeeSummary]);

    // Separate Tuition / Transport breakdown across ALL students
    const totalTuitionFee = useMemo(() => {
        return studentFeeSummary.reduce((sum, s) => sum + (s.academicFee || 0), 0);
    }, [studentFeeSummary]);

    const totalTuitionPaid = useMemo(() => {
        return studentFeeSummary.reduce((sum, s) => sum + (s.academicPaid || 0), 0);
    }, [studentFeeSummary]);

    const remainingTuitionFee = useMemo(() => Math.max(0, totalTuitionFee - totalTuitionPaid), [totalTuitionFee, totalTuitionPaid]);

    const totalTransportFee = useMemo(() => {
        return studentFeeSummary.reduce((sum, s) => sum + (s.transportFee || 0), 0);
    }, [studentFeeSummary]);

    const totalTransportPaid = useMemo(() => {
        return studentFeeSummary.reduce((sum, s) => sum + (s.transportPaid || 0), 0);
    }, [studentFeeSummary]);

    const remainingTransportFee = useMemo(() => Math.max(0, totalTransportFee - totalTransportPaid), [totalTransportFee, totalTransportPaid]);

    const grandTotalFee = useMemo(() => totalTuitionFee + totalTransportFee, [totalTuitionFee, totalTransportFee]);
    const grandTotalRemaining = useMemo(() => remainingTuitionFee + remainingTransportFee, [remainingTuitionFee, remainingTransportFee]);

    // Official Printable Fee Voucher & Receipt PDF Generator
    const generateVoucherPDF = (record, options = {}) => {
        if (!record) return;

        const doc = new jsPDF();
        const student = (record.studentId && typeof record.studentId === 'object' && record.studentId.studentName)
            ? record.studentId
            : (selectedStudentForHistory?.student || record.studentId || {});

        const className = student.classId?.name
            ? `${student.classId.name}${student.classId.section ? ` (${student.classId.section})` : ''}`
            : (student.className || '-');

        // Extract Fee Heads
        let rawTuitionTotal = 0;
        let rawTransportTotal = 0;
        const feeHeadsList = record.feeHeads && record.feeHeads.length > 0 ? record.feeHeads : [];

        if (feeHeadsList.length > 0) {
            feeHeadsList.forEach(h => {
                const name = (h.headName || '').toLowerCase();
                const amt = Number(h.amount) || 0;
                if (name.includes('transport')) {
                    rawTransportTotal += amt;
                } else {
                    rawTuitionTotal += amt;
                }
            });
        } else {
            rawTuitionTotal = Number(record.subTotal || record.netPayable || 0);
        }

        const concession = Number(record.totalConcession || 0);
        const tuitionFee = Math.max(0, rawTuitionTotal - concession);
        const transportFee = rawTransportTotal;
        const subTotal = Number(record.subTotal || (rawTuitionTotal + rawTransportTotal));
        const totalFee = Number(record.netPayable !== undefined ? record.netPayable : (subTotal - concession));
        const totalPaid = Number(record.paidAmount || 0);
        const remainingAmount = Math.max(0, totalFee - totalPaid);

        const tuitionPaid = Number(record.academicPaid || 0);
        const transportPaid = Number(record.transportPaid || 0);

        // Determine Document Type & Transaction Mode
        const isReceipt = options.isReceipt || (options.currentPayment !== undefined) || record.status === 'PAID';
        const currentPayment = options.currentPayment || null;

        let currentPaymentAmount = 0;
        let previouslyPaid = totalPaid;

        if (currentPayment) {
            currentPaymentAmount = Number(currentPayment.amount) || 0;
            // Previously paid is total paid before this current transaction
            previouslyPaid = Math.max(0, totalPaid - currentPaymentAmount);
        }

        const schoolTitle = (organizationName && organizationName.trim()) 
            ? organizationName.trim().toUpperCase() 
            : (typeof window !== 'undefined' && localStorage.getItem('organizationName') ? localStorage.getItem('organizationName').trim().toUpperCase() : 'SCHOOL AUTOMATION SYSTEM');

        let docTitle = 'OFFICIAL STUDENT FEE VOUCHER';
        let docSubtitle = `${schoolTitle} - OFFICIAL FEE VOUCHER & STATEMENT`;
        if (isReceipt && remainingAmount === 0) {
            docTitle = 'OFFICIAL STUDENT FEE PAYMENT RECEIPT';
            docSubtitle = `${schoolTitle} - OFFICIAL PAYMENT RECEIPT`;
        } else if (isReceipt || (record.status === 'PARTIAL' && totalPaid > 0)) {
            docTitle = 'OFFICIAL STUDENT FEE VOUCHER & RECEIPT';
            docSubtitle = `${schoolTitle} - PAYMENT RECEIPT & REMAINING DUES STATEMENT`;
        }

        // Primary Header Band (0 to 32 mm)
        doc.setFillColor(24, 144, 255);
        doc.rect(0, 0, 210, 32, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text(schoolTitle, 105, 13, { align: 'center' });

        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.text(docTitle, 105, 21, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(docSubtitle, 105, 28, { align: 'center' });

        // Voucher Meta Information (y: 38 to 50)
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9.5);

        // Row 1: Voucher No & Issue Date
        doc.setFont('helvetica', 'bold');
        doc.text('Voucher No:', 14, 40);
        doc.setFont('helvetica', 'normal');
        doc.text(`${record.voucherNo || record._id}`, 42, 40);

        doc.setFont('helvetica', 'bold');
        doc.text('Issue Date:', 135, 40);
        doc.setFont('helvetica', 'normal');
        doc.text(`${dayjs(record.createdAt).format('DD MMM YYYY')}`, 160, 40);

        // Row 2: Fee Month & Due Date
        doc.setFont('helvetica', 'bold');
        doc.text('Fee Month:', 14, 47);
        doc.setFont('helvetica', 'normal');
        doc.text(`${record.feeMonth || 'Current Month'}`, 42, 47);

        doc.setFont('helvetica', 'bold');
        doc.text('Due Date:', 135, 47);
        doc.setFont('helvetica', 'normal');
        doc.text(`${dayjs(record.dueDate).format('DD MMM YYYY')}`, 160, 47);

        // Status determination
        const statusText = remainingAmount === 0 && totalFee > 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : (record.status || 'PENDING'));

        // Student Info Block & Status Badge Box (y: 53 to 79)
        // Left Student Card
        doc.setDrawColor(215, 220, 228);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 53, 116, 26, 2, 2, 'FD');

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Student Name:  ${student.studentName || 'Student'}`, 18, 60);
        doc.setFont('helvetica', 'normal');
        doc.text(`Roll Number:   ${student.rollNo || '-'}`, 18, 67);
        doc.text(`Class & Sec:   ${className}`, 18, 74);

        // Right Status Badge Card
        doc.setDrawColor(215, 220, 228);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(135, 53, 61, 26, 2, 2, 'FD');

        // Status Badge Fill
        if (statusText === 'PAID') {
            doc.setFillColor(82, 196, 26);
        } else if (statusText === 'PARTIAL') {
            doc.setFillColor(250, 140, 22);
        } else {
            doc.setFillColor(255, 77, 79);
        }
        doc.roundedRect(140, 57, 51, 9, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(`STATUS: ${statusText}`, 165.5, 63, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        if (statusText === 'PAID') {
            doc.setTextColor(82, 196, 26);
            doc.text('Dues Fully Cleared', 165.5, 73, { align: 'center' });
        } else if (statusText === 'PARTIAL') {
            doc.setTextColor(217, 83, 79);
            doc.text(`Remaining: Rs ${remainingAmount.toLocaleString()}`, 165.5, 73, { align: 'center' });
        } else {
            doc.setTextColor(255, 77, 79);
            doc.text(`Payable: Rs ${remainingAmount.toLocaleString()}`, 165.5, 73, { align: 'center' });
        }

        // Table 1: Itemized Fee Heads (startY: 84)
        const feeHeadsRows = (feeHeadsList.length > 0)
            ? feeHeadsList.map(h => [h.headName, `Rs ${Number(h.amount).toLocaleString()}`])
            : [
                ['Tuition Fee', `Rs ${Number(tuitionFee).toLocaleString()}`],
                ['Transport Fee', `Rs ${Number(transportFee).toLocaleString()}`]
            ];

        autoTable(doc, {
            startY: 84,
            head: [['Fee Head / Particulars', 'Amount (PKR)']],
            body: feeHeadsRows,
            theme: 'grid',
            headStyles: { fillColor: [24, 144, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
            bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
            columnStyles: { 0: { cellWidth: 135 }, 1: { cellWidth: 47, halign: 'right' } },
            margin: { left: 14, right: 14 }
        });

        const table1EndY = doc.lastAutoTable.finalY;
        const summaryStartY = table1EndY + 6;

        // Build Financial Summary Rows
        const summaryRows = [];
        summaryRows.push(['Tuition Fee', `Rs ${tuitionFee.toLocaleString()}`]);
        summaryRows.push(['Transport Fee', `Rs ${transportFee.toLocaleString()}`]);

        if (concession > 0) {
            summaryRows.push(['Discount / Concession', `- Rs ${concession.toLocaleString()}`]);
        }

        summaryRows.push([
            { content: 'Total Fee', styles: { fontStyle: 'bold', textColor: [20, 20, 20] } },
            { content: `Rs ${totalFee.toLocaleString()}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 20, 20] } }
        ]);

        if (currentPayment) {
            summaryRows.push(['Previously Paid', `Rs ${previouslyPaid.toLocaleString()}`]);
            summaryRows.push([
                { content: 'Payment Received', styles: { fontStyle: 'bold', textColor: [38, 154, 76] } },
                { content: `Rs ${currentPaymentAmount.toLocaleString()}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [38, 154, 76] } }
            ]);
            summaryRows.push([
                { content: 'Total Paid So Far', styles: { fontStyle: 'bold' } },
                { content: `Rs ${totalPaid.toLocaleString()}`, styles: { fontStyle: 'bold', halign: 'right' } }
            ]);
        } else {
            summaryRows.push([
                'Previously Paid',
                `Rs ${totalPaid.toLocaleString()}`
            ]);
        }

        // Remaining Amount / Net Payable Row (Highlight with bold and clear background)
        const isFullyPaid = remainingAmount === 0;
        summaryRows.push([
            {
                content: isFullyPaid ? 'Remaining Amount' : 'Remaining Amount / Net Payable',
                styles: {
                    fontStyle: 'bold',
                    fontSize: 10,
                    textColor: isFullyPaid ? [38, 154, 76] : [200, 30, 30],
                    fillColor: isFullyPaid ? [240, 250, 240] : [255, 242, 235]
                }
            },
            {
                content: isFullyPaid ? 'Rs 0 (PAID)' : `Rs ${remainingAmount.toLocaleString()}`,
                styles: {
                    fontStyle: 'bold',
                    fontSize: 10,
                    halign: 'right',
                    textColor: isFullyPaid ? [38, 154, 76] : [200, 30, 30],
                    fillColor: isFullyPaid ? [240, 250, 240] : [255, 242, 235]
                }
            }
        ]);

        // Right side: Financial Summary Table via autoTable (Prevents any text overlap!)
        autoTable(doc, {
            startY: summaryStartY,
            head: [['Fee Summary', 'Amount']],
            body: summaryRows,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
            columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 35, halign: 'right' } },
            margin: { left: 106, right: 14 }
        });

        const summaryEndY = doc.lastAutoTable.finalY;
        const panelHeight = Math.max(summaryEndY - summaryStartY, 46);

        // Left side: Payment & Transaction Details Card
        const leftBoxX = 14;
        const leftBoxWidth = 87;

        doc.setDrawColor(215, 220, 228);
        doc.setFillColor(250, 251, 253);
        doc.roundedRect(leftBoxX, summaryStartY, leftBoxWidth, panelHeight, 2, 2, 'FD');

        // Header strip for Left Card
        doc.setFillColor(235, 242, 250);
        doc.roundedRect(leftBoxX, summaryStartY, leftBoxWidth, 7, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(24, 144, 255);
        doc.text('PAYMENT DETAILS & TRANSACTION LOG', leftBoxX + 4, summaryStartY + 5);

        // Content inside Left Card
        let lineY = summaryStartY + 12;
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);

        if (totalPaid > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Payment Status:', leftBoxX + 4, lineY);
            doc.setFont('helvetica', 'normal');
            doc.text(statusText === 'PAID' ? 'Fully Paid' : `Partially Paid (Rs ${totalPaid.toLocaleString()} paid)`, leftBoxX + 32, lineY);

            lineY += 5.5;
            doc.setFont('helvetica', 'bold');
            doc.text('Tuition Paid:', leftBoxX + 4, lineY);
            doc.setFont('helvetica', 'normal');
            doc.text(`Rs ${tuitionPaid.toLocaleString()}`, leftBoxX + 32, lineY);

            lineY += 5.5;
            doc.setFont('helvetica', 'bold');
            doc.text('Transport Paid:', leftBoxX + 4, lineY);
            doc.setFont('helvetica', 'normal');
            doc.text(`Rs ${transportPaid.toLocaleString()}`, leftBoxX + 32, lineY);

            lineY += 5.5;
            doc.setFont('helvetica', 'bold');
            doc.text('Payment Mode:', leftBoxX + 4, lineY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${record.paymentMethod || currentPayment?.paymentMethod || 'CASH'}`, leftBoxX + 32, lineY);

            lineY += 5.5;
            doc.setFont('helvetica', 'bold');
            doc.text('Last Paid Date:', leftBoxX + 4, lineY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${record.paidDate ? dayjs(record.paidDate).format('DD MMM YYYY') : dayjs().format('DD MMM YYYY')}`, leftBoxX + 32, lineY);

            lineY += 5.5;
            doc.setFont('helvetica', 'bold');
            doc.text('Received By:', leftBoxX + 4, lineY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${record.receivedBy || 'Accounts Officer'}`, leftBoxX + 32, lineY);

            if (record.remarks || currentPayment?.remarks) {
                lineY += 5.5;
                doc.setFont('helvetica', 'bold');
                doc.text('Remarks:', leftBoxX + 4, lineY);
                doc.setFont('helvetica', 'normal');
                const rem = String(record.remarks || currentPayment?.remarks || '');
                doc.text(rem.length > 30 ? rem.substring(0, 30) + '...' : rem, leftBoxX + 32, lineY);
            }
        } else {
            doc.setFont('helvetica', 'bold');
            doc.text('Payment Status:', leftBoxX + 4, lineY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(235, 47, 6);
            doc.text('UNPAID / PENDING', leftBoxX + 32, lineY);
            doc.setTextColor(50, 50, 50);

            lineY += 6;
            doc.text('No payment has been recorded yet.', leftBoxX + 4, lineY);
            lineY += 5.5;
            doc.text(`Please submit Rs ${totalFee.toLocaleString()} on or before`, leftBoxX + 4, lineY);
            lineY += 5.5;
            doc.setFont('helvetica', 'bold');
            doc.text(`Due Date: ${dayjs(record.dueDate).format('DD MMM YYYY')}`, leftBoxX + 4, lineY);
        }

        // Bottom Footer Instructions & Signatures
        const bottomY = Math.min(Math.max(summaryEndY + 12, 246), 268);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(110, 110, 110);
        doc.text('Note: Please retain this official receipt/voucher. Dues must be settled on or before the due date.', 14, bottomY);

        const sigY = bottomY + 14;
        doc.setDrawColor(180, 180, 180);
        doc.line(14, sigY, 70, sigY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(60, 60, 60);
        doc.text('Parent / Guardian Signature', 18, sigY + 4.5);

        doc.line(135, sigY, 196, sigY);
        doc.text('Cashier / Accounts Officer Seal', 139, sigY + 4.5);

        // Save PDF file with clear naming
        const prefix = isReceipt && remainingAmount === 0 ? 'FeeReceipt' : 'FeeVoucher';
        doc.save(`${prefix}_${record.voucherNo || record._id}.pdf`);
        message.success(`${isReceipt ? 'Official Fee Receipt' : 'Official Fee Voucher'} PDF generated successfully!`);
    };

    // Open Voucher Creation Modal
    const openVoucherModal = () => {
        voucherForm.resetFields();
        voucherForm.setFieldsValue({
            feeMonth: dayjs(),
            dueDate: dayjs().add(10, 'day'),
            feeHeads: [
                { headName: 'Tuition Fee', amount: null },
                { headName: 'Transport Fee', amount: null }
            ],
            concessions: []
        });
        setIsVoucherModalVisible(true);
    };

    // Handle Create Fee Voucher
    const handleCreateVoucher = async (values) => {
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                studentId: values.issueTarget === 'STUDENT' ? values.studentId : null,
                classId: values.issueTarget === 'CLASS' ? values.classId : null,
                academicSessionId: values.academicSessionId || null,
                feeMonth: values.feeMonth ? values.feeMonth.format('MMMM YYYY') : '',
                dueDate: values.dueDate.format('YYYY-MM-DD'),
                feeHeads: values.feeHeads,
                concessions: values.concessions || [],
                remarks: values.remarks || ''
            };

            await axios.post('/api/v1/fees/voucher', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Fee Voucher(s) issued successfully!');
            setIsVoucherModalVisible(false);
            fetchFees();
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setSubmitLoading(false);
        }
    };

    // Open History Modal
    const openHistoryModal = (record) => {
        setSelectedStudentForHistory(record);
        setIsHistoryModalVisible(true);
    };

    // Compute fee breakdown for the selected voucher
    const getFeeBreakdown = (voucher) => {
        if (!voucher) return { tuitionTotal: 0, transportTotal: 0, tuitionPaid: 0, transportPaid: 0, tuitionRemaining: 0, transportRemaining: 0 };
        let tuitionTotal = 0;
        let transportTotal = 0;
        voucher.feeHeads.forEach(h => {
            if (h.headName.toLowerCase().includes('transport')) transportTotal += h.amount;
            else tuitionTotal += h.amount;
        });
        // Apply concession to tuition
        tuitionTotal = Math.max(0, tuitionTotal - (voucher.totalConcession || 0));
        const tuitionPaid = voucher.academicPaid || 0;
        const transportPaid = voucher.transportPaid || 0;
        return {
            tuitionTotal,
            transportTotal,
            tuitionPaid,
            transportPaid,
            tuitionRemaining: Math.max(0, tuitionTotal - tuitionPaid),
            transportRemaining: Math.max(0, transportTotal - transportPaid),
        };
    };

    // Open Mark Paid Modal
    const openPayModal = (studentRecord, defaultVoucherId = null) => {
        setSelectedStudentForHistory(studentRecord);
        const unpaidVouchers = studentRecord.vouchers.filter(v => (v.netPayable - (v.paidAmount || 0)) > 0);
        if (unpaidVouchers.length === 0) {
            message.info('No pending fees to pay for this student.');
            return;
        }
        
        const toPayId = defaultVoucherId || unpaidVouchers[0]._id;
        const voucher = unpaidVouchers.find(v => v._id === toPayId);
        const bd = getFeeBreakdown(voucher);
        
        setSelectedFeeRecord(voucher);
        setTuitionPayAmount(bd.tuitionRemaining);
        setTransportPayAmount(bd.transportRemaining);
        setTuitionError('');
        setTransportError('');
        payForm.resetFields();
        payForm.setFieldsValue({
            voucherId: toPayId,
            paymentMethod: 'CASH',
            remarks: ''
        });
        setIsPayModalVisible(true);
    };

    const handleVoucherSelectChange = (voucherId) => {
        const voucher = selectedStudentForHistory.vouchers.find(v => v._id === voucherId);
        setSelectedFeeRecord(voucher);
        const bd = getFeeBreakdown(voucher);
        setTuitionPayAmount(bd.tuitionRemaining);
        setTransportPayAmount(bd.transportRemaining);
        setTuitionError('');
        setTransportError('');
    };

    const handleTuitionAmountChange = (val) => {
        const amount = Number(val) || 0;
        const bd = getFeeBreakdown(selectedFeeRecord);
        if (amount < 0) {
            setTuitionError('Amount cannot be negative');
        } else if (amount > bd.tuitionRemaining) {
            setTuitionError(`Tuition payment cannot exceed the remaining tuition fee of Rs ${bd.tuitionRemaining.toLocaleString()}`);
        } else {
            setTuitionError('');
        }
        setTuitionPayAmount(amount);
    };

    const handleTransportAmountChange = (val) => {
        const amount = Number(val) || 0;
        const bd = getFeeBreakdown(selectedFeeRecord);
        if (amount < 0) {
            setTransportError('Amount cannot be negative');
        } else if (amount > bd.transportRemaining) {
            setTransportError(`Transport payment cannot exceed the remaining transport fee of Rs ${bd.transportRemaining.toLocaleString()}`);
        } else {
            setTransportError('');
        }
        setTransportPayAmount(amount);
    };

    // Handle Submit Payment
    const handlePaySubmit = async (values) => {
        // Validate before submit
        if (tuitionError || transportError) {
            message.error('Please fix the validation errors before submitting.');
            return;
        }
        if (tuitionPayAmount + transportPayAmount <= 0) {
            message.error('Please enter an amount for at least one fee type.');
            return;
        }
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.patch(`/api/v1/fees/${values.voucherId}/pay`, {
                tuitionAmount: tuitionPayAmount,
                transportAmount: transportPayAmount,
                paymentMethod: values.paymentMethod,
                remarks: values.remarks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const recordedAmount = tuitionPayAmount + transportPayAmount;
            const updatedFeeRecord = res.data?.data;
            const targetVoucher = selectedStudentForHistory?.vouchers?.find(v => v._id === values.voucherId) || selectedFeeRecord;

            setIsPayModalVisible(false);
            message.success('Payment recorded successfully!');

            // Prompt user with option to immediately print receipt
            if (updatedFeeRecord || targetVoucher) {
                const voucherToPrint = updatedFeeRecord || {
                    ...targetVoucher,
                    paidAmount: (targetVoucher.paidAmount || 0) + recordedAmount,
                    academicPaid: (targetVoucher.academicPaid || 0) + tuitionPayAmount,
                    transportPaid: (targetVoucher.transportPaid || 0) + transportPayAmount,
                    paidDate: new Date(),
                    paymentMethod: values.paymentMethod,
                    receivedBy: 'Accounts Officer',
                    status: ((targetVoucher.paidAmount || 0) + recordedAmount) >= targetVoucher.netPayable ? 'PAID' : 'PARTIAL'
                };

                Modal.confirm({
                    title: 'Payment Recorded Successfully',
                    icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                    content: `Payment of Rs ${recordedAmount.toLocaleString()} has been recorded. Would you like to print the official payment receipt now?`,
                    okText: 'Print Receipt',
                    cancelText: 'Close',
                    onOk() {
                        generateVoucherPDF(voucherToPrint, {
                            isReceipt: true,
                            currentPayment: {
                                amount: recordedAmount,
                                tuitionAmount: tuitionPayAmount,
                                transportAmount: transportPayAmount,
                                date: new Date(),
                                paymentMethod: values.paymentMethod,
                                remarks: values.remarks
                            }
                        });
                    }
                });
            }

            fetchFees();
        } catch (err) {
            message.error(extractErrorMessage(err));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteFee = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/fees/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Fee record deleted');
            fetchFees();
        } catch (err) {
            message.error(extractErrorMessage(err));
        }
    };

    const columns = [
        {
            title: 'Student Details',
            key: 'student',
            render: (_, record) => (
                <div>
                    <Text strong style={{ fontSize: '14px' }}>{record.student.studentName}</Text>
                    <div><Text type="secondary" style={{ fontSize: '12px' }}>Roll: {record.student.rollNo} | Class: {record.student.classId?.name || '-'}</Text></div>
                </div>
            )
        },
        {
            title: 'Academic Fee',
            key: 'academicFee',
            render: (_, record) => (
                <div>
                    <div>Fee: Rs {record.academicFee.toLocaleString()}</div>
                    <div style={{ color: '#52c41a' }}>Paid: Rs {record.academicPaid.toLocaleString()}</div>
                    <div style={{ color: '#ff4d4f' }}>Rem: Rs {record.academicRemaining.toLocaleString()}</div>
                </div>
            )
        },
        {
            title: 'Transport Fee',
            key: 'transportFee',
            render: (_, record) => (
                <div>
                    <div>Fee: Rs {record.transportFee.toLocaleString()}</div>
                    <div style={{ color: '#52c41a' }}>Paid: Rs {record.transportPaid.toLocaleString()}</div>
                    <div style={{ color: '#ff4d4f' }}>Rem: Rs {record.transportRemaining.toLocaleString()}</div>
                </div>
            )
        },
        {
            title: 'Overall Status',
            key: 'totalStatus',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>Total Rem: Rs {record.totalRemaining.toLocaleString()}</div>
                    <Tag color={record.status === 'PAID' ? 'green' : record.status === 'OVERDUE' ? 'red' : record.status === 'PARTIAL' ? 'orange' : 'gold'}>{record.status}</Tag>
                </div>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button 
                        type="primary" 
                        onClick={() => openHistoryModal(record)}
                        icon={<FileTextOutlined />}
                    >
                        View Fee History
                    </Button>
                    {record.totalRemaining > 0 && (
                        <Button 
                            type="dashed" 
                            onClick={() => openPayModal(record)}
                            icon={<DollarCircleOutlined />}
                        >
                            Record Payment
                        </Button>
                    )}
                    {record.vouchers && record.vouchers.length > 0 && (
                        <Tooltip title="Print Latest Fee Voucher / Receipt">
                            <Button 
                                icon={<PrinterOutlined />} 
                                onClick={() => {
                                    const latestVoucher = record.vouchers[record.vouchers.length - 1];
                                    generateVoucherPDF({ ...latestVoucher, studentId: record.student });
                                }}
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        }
    ];

    const historyColumns = [
        { title: 'Month', dataIndex: 'feeMonth', key: 'feeMonth', width: 120 },
        {
            title: 'Tuition',
            key: 'tuition',
            render: (_, r) => {
                let tuitionTotal = 0;
                r.feeHeads.forEach(h => { if (!h.headName.toLowerCase().includes('transport')) tuitionTotal += h.amount; });
                tuitionTotal = Math.max(0, tuitionTotal - (r.totalConcession || 0));
                const tuitionPaid = r.academicPaid || 0;
                const tuitionRem = Math.max(0, tuitionTotal - tuitionPaid);
                const tStatus = tuitionRem === 0 ? 'PAID' : tuitionPaid === 0 ? 'PENDING' : 'PARTIAL';
                return (
                    <div style={{ fontSize: '12px' }}>
                        <div>Total: Rs {tuitionTotal.toLocaleString()}</div>
                        <div style={{ color: '#52c41a' }}>Paid: Rs {tuitionPaid.toLocaleString()}</div>
                        <div style={{ color: '#ff4d4f' }}>Rem: Rs {tuitionRem.toLocaleString()}</div>
                        <Tag color={tStatus === 'PAID' ? 'green' : tStatus === 'PARTIAL' ? 'orange' : 'gold'} style={{ marginTop: 2 }}>{tStatus}</Tag>
                    </div>
                );
            }
        },
        {
            title: 'Transport',
            key: 'transport',
            render: (_, r) => {
                let transportTotal = 0;
                r.feeHeads.forEach(h => { if (h.headName.toLowerCase().includes('transport')) transportTotal += h.amount; });
                const transportPaid = r.transportPaid || 0;
                const transportRem = Math.max(0, transportTotal - transportPaid);
                const tStatus = transportRem === 0 && transportTotal > 0 ? 'PAID' : transportPaid === 0 ? 'PENDING' : 'PARTIAL';
                return transportTotal > 0 ? (
                    <div style={{ fontSize: '12px' }}>
                        <div>Total: Rs {transportTotal.toLocaleString()}</div>
                        <div style={{ color: '#52c41a' }}>Paid: Rs {transportPaid.toLocaleString()}</div>
                        <div style={{ color: '#ff4d4f' }}>Rem: Rs {transportRem.toLocaleString()}</div>
                        <Tag color={tStatus === 'PAID' ? 'green' : tStatus === 'PARTIAL' ? 'orange' : 'gold'} style={{ marginTop: 2 }}>{tStatus}</Tag>
                    </div>
                ) : <Text type="secondary">N/A</Text>;
            }
        },
        { title: 'Status', dataIndex: 'status', key: 'status', render: status => <Tag color={status === 'PAID' ? 'green' : status === 'OVERDUE' ? 'red' : status === 'PARTIAL' ? 'orange' : 'gold'}>{status}</Tag> },
        {
            title: 'Actions', key: 'actions', render: (_, record) => (
                <Space>
                    {record.status !== 'PAID' && (
                        <Button size="small" type="primary" onClick={() => openPayModal(selectedStudentForHistory, record._id)}>Pay</Button>
                    )}
                    <Tooltip title={record.paidAmount > 0 ? (record.status === 'PAID' ? "Print Payment Receipt" : "Print Voucher / Receipt") : "Print Fee Voucher"}>
                        <Button size="small" icon={<PrinterOutlined />} onClick={() => generateVoucherPDF(record)} />
                    </Tooltip>
                    <Popconfirm title="Delete?" onConfirm={() => handleDeleteFee(record._id)}>
                        <Button danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
            <div style={{ marginBottom: '24px' }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={2} style={{ margin: 0 }}>
                            <DollarOutlined style={{ marginRight: '10px', color: '#52c41a' }} />
                            Fee & Voucher Management Engine
                        </Title>
                        <Text type="secondary">Issue itemized student fee vouchers, manage concessions, record cash/bank collections, and export printable PDF receipts.</Text>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchFees}>Refresh</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={openVoucherModal}>
                                Issue Itemized Fee Voucher
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Row 1 — Tuition Fee cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{
                        borderRadius: '10px',
                        boxShadow: '0 3px 12px rgba(24,144,255,0.12)',
                        borderLeft: '4px solid #1890ff',
                        background: 'linear-gradient(135deg, #ffffff 60%, #e6f7ff 100%)'
                    }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#1890ff' }}>Total Tuition Fee</span>}
                            value={`Rs ${totalTuitionFee.toLocaleString()}`}
                            prefix={<BankOutlined style={{ color: '#1890ff' }} />}
                            valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{
                        borderRadius: '10px',
                        boxShadow: '0 3px 12px rgba(24,144,255,0.10)',
                        borderLeft: '4px solid #40a9ff',
                        background: 'linear-gradient(135deg, #ffffff 60%, #e6f7ff 100%)'
                    }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#40a9ff' }}>Remaining Tuition Fee</span>}
                            value={`Rs ${remainingTuitionFee.toLocaleString()}`}
                            prefix={<ClockCircleOutlined style={{ color: '#40a9ff' }} />}
                            valueStyle={{ color: remainingTuitionFee === 0 ? '#52c41a' : '#40a9ff', fontSize: '20px' }}
                        />
                    </Card>
                </Col>

                {/* Row 1 continued — Transport Fee cards */}
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{
                        borderRadius: '10px',
                        boxShadow: '0 3px 12px rgba(250,140,22,0.12)',
                        borderLeft: '4px solid #fa8c16',
                        background: 'linear-gradient(135deg, #ffffff 60%, #fff7e6 100%)'
                    }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#fa8c16' }}>Total Transport Fee</span>}
                            value={`Rs ${totalTransportFee.toLocaleString()}`}
                            prefix={<CarOutlined style={{ color: '#fa8c16' }} />}
                            valueStyle={{ color: '#fa8c16', fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{
                        borderRadius: '10px',
                        boxShadow: '0 3px 12px rgba(250,140,22,0.10)',
                        borderLeft: '4px solid #ffa940',
                        background: 'linear-gradient(135deg, #ffffff 60%, #fff7e6 100%)'
                    }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#ffa940' }}>Remaining Transport Fee</span>}
                            value={`Rs ${remainingTransportFee.toLocaleString()}`}
                            prefix={<ClockCircleOutlined style={{ color: '#ffa940' }} />}
                            valueStyle={{ color: remainingTransportFee === 0 ? '#52c41a' : '#ffa940', fontSize: '20px' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Row 2 — Combined totals + overdue */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{
                        borderRadius: '10px',
                        boxShadow: '0 3px 12px rgba(82,196,26,0.12)',
                        borderLeft: '4px solid #52c41a',
                        background: 'linear-gradient(135deg, #ffffff 60%, #f6ffed 100%)'
                    }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#52c41a' }}>Total Fee (Tuition + Transport)</span>}
                            value={`Rs ${grandTotalFee.toLocaleString()}`}
                            prefix={<FundOutlined style={{ color: '#52c41a' }} />}
                            valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{
                        borderRadius: '10px',
                        boxShadow: '0 3px 12px rgba(250,173,20,0.12)',
                        borderLeft: '4px solid #faad14',
                        background: 'linear-gradient(135deg, #ffffff 60%, #fffbe6 100%)'
                    }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#faad14' }}>Total Remaining Fee</span>}
                            value={`Rs ${grandTotalRemaining.toLocaleString()}`}
                            prefix={<PieChartOutlined style={{ color: '#faad14' }} />}
                            valueStyle={{ color: grandTotalRemaining === 0 ? '#52c41a' : '#faad14', fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{
                        borderRadius: '10px',
                        boxShadow: '0 3px 12px rgba(82,196,26,0.10)',
                        borderLeft: '4px solid #389e0d',
                        background: 'linear-gradient(135deg, #ffffff 60%, #f6ffed 100%)'
                    }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#389e0d' }}>Total Fees Collected</span>}
                            value={`Rs ${totalCollected.toLocaleString()}`}
                            prefix={<CheckCircleOutlined style={{ color: '#389e0d' }} />}
                            valueStyle={{ color: '#389e0d', fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{
                        borderRadius: '10px',
                        boxShadow: '0 3px 12px rgba(255,77,79,0.12)',
                        borderLeft: '4px solid #ff4d4f',
                        background: 'linear-gradient(135deg, #ffffff 60%, #fff1f0 100%)'
                    }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600, color: '#ff4d4f' }}>Overdue Vouchers</span>}
                            value={overdueCount}
                            prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                            valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                    <Col xs={24}>
                        <Space wrap>
                            <Input
                                placeholder="Search student, roll no, or voucher no..."
                                prefix={<SearchOutlined />}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                style={{ width: '280px' }}
                                allowClear
                            />
                            <Select
                                placeholder="Filter by Class"
                                value={classFilter || undefined}
                                onChange={val => setClassFilter(val || '')}
                                style={{ width: '180px' }}
                                allowClear
                                showSearch
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {classes
                                    .slice()
                                    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }))
                                    .map(c => (
                                        <Option key={c._id} value={c._id}>
                                            {c.name}{c.section ? ` (${c.section})` : ''}
                                        </Option>
                                    ))
                                }
                            </Select>
                            <Select
                                placeholder="Filter Status"
                                value={statusFilter || undefined}
                                onChange={val => setStatusFilter(val || '')}
                                style={{ width: '150px' }}
                                allowClear
                            >
                                <Option value="PENDING">PENDING</Option>
                                <Option value="PAID">PAID</Option>
                                <Option value="PARTIAL">PARTIAL</Option>
                                <Option value="OVERDUE">OVERDUE</Option>
                            </Select>
                        </Space>
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={studentFeeSummary}
                    rowKey={(record) => record.student._id}
                    loading={tableLoading}
                    pagination={{ pageSize: 8 }}
                    locale={{
                        emptyText: (
                            <div style={{ padding: '32px 0', color: '#999' }}>
                                <FileTextOutlined style={{ fontSize: 36, display: 'block', margin: '0 auto 10px' }} />
                                <div style={{ fontSize: 14 }}>
                                    {classFilter
                                        ? `No fee records found for ${
                                            classes.find(c => c._id === classFilter)
                                                ? `${classes.find(c => c._id === classFilter).name}${classes.find(c => c._id === classFilter).section ? ` (${classes.find(c => c._id === classFilter).section})` : ''}`
                                                : 'the selected class'
                                          }.`
                                        : 'No fee records found.'}
                                </div>
                            </div>
                        )
                    }}
                />
            </Card>

            {/* Issue Voucher Modal */}
            <Modal
                title="Issue Itemized Student Fee Voucher"
                open={isVoucherModalVisible}
                onCancel={() => setIsVoucherModalVisible(false)}
                onOk={() => voucherForm.submit()}
                confirmLoading={submitLoading}
                width={700}
                destroyOnClose
            >
                <Form
                    form={voucherForm}
                    layout="vertical"
                    onFinish={handleCreateVoucher}
                    initialValues={{ issueTarget: 'STUDENT' }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="issueTarget" label="Issue Fee Voucher To">
                                <Select>
                                    <Option value="STUDENT">Single Student</Option>
                                    <Option value="CLASS">Entire Class Batch</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                noStyle
                                shouldUpdate={(prevValues, currentValues) => prevValues.issueTarget !== currentValues.issueTarget}
                            >
                                {({ getFieldValue }) =>
                                    getFieldValue('issueTarget') === 'STUDENT' ? (
                                        <Form.Item name="studentId" label="Select Student" rules={[{ required: true }]}>
                                            <Select showSearch placeholder="Search student name" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                                                {students.map(s => (
                                                    <Option key={s._id} value={s._id}>{s.studentName} ({s.rollNo})</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    ) : (
                                        <Form.Item name="classId" label="Select Class" rules={[{ required: true }]}>
                                            <Select placeholder="Select Class">
                                                {classes.map(c => (
                                                    <Option key={c._id} value={c._id}>{c.name} ({c.section || 'A'})</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    )
                                }
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="feeMonth" label="Fee Month" rules={[{ required: true, message: 'Please select the fee month' }]}>
                                <DatePicker
                                    picker="month"
                                    style={{ width: '100%' }}
                                    format="MMMM YYYY"
                                    placeholder="Select fee month"
                                    allowClear={false}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="dueDate" label="Due Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider textPlacement="left">Itemized Fee Particulars (Heads)</Divider>
                    <Form.List name="feeHeads">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => {
                                    const headNameValue = voucherForm.getFieldValue(['feeHeads', name, 'headName']);
                                    const isStatic = headNameValue === 'Tuition Fee' || headNameValue === 'Transport Fee';

                                    return (
                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'headName']}
                                                rules={[{ required: true, message: 'Missing head name' }]}
                                            >
                                                <Input 
                                                    placeholder="Fee Head (e.g. Tuition Fee, Lab Fee)" 
                                                    style={{ width: 340 }} 
                                                    disabled={isStatic}
                                                />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'amount']}
                                                rules={[{ required: true, message: 'Missing amount' }]}
                                            >
                                                <InputNumber placeholder="Amount (PKR)" style={{ width: 180 }} min={0} />
                                            </Form.Item>
                                            {!isStatic && (
                                                <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                                            )}
                                        </Space>
                                    );
                                })}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Add Fee Head
                                </Button>
                            </>
                        )}
                    </Form.List>

                    <Divider textPlacement="left">Concessions / Discounts (Optional)</Divider>
                    <Form.List name="concessions">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item {...restField} name={[name, 'concessionType']}>
                                            <Input placeholder="Concession (e.g., Sibling Discount, Financial Aid)" style={{ width: 340 }} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'amount']}>
                                            <InputNumber placeholder="Discount Amount" style={{ width: 180 }} min={0} />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Add Concession / Discount
                                </Button>
                            </>
                        )}
                    </Form.List>

                    <Form.Item name="remarks" label="Remarks" style={{ marginTop: '16px' }}>
                        <Input placeholder="Optional notes for voucher" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Pay Fee Modal */}
            <Modal
                title={`Record Fee Payment: ${selectedStudentForHistory?.student?.studentName || ''}`}
                open={isPayModalVisible}
                onCancel={() => setIsPayModalVisible(false)}
                onOk={() => payForm.submit()}
                confirmLoading={submitLoading}
                width={720}
                destroyOnClose
            >
                <Form
                    form={payForm}
                    layout="vertical"
                    onFinish={handlePaySubmit}
                >
                    {/* Month Selector */}
                    <Form.Item name="voucherId" label="Select Month to Pay" rules={[{ required: true }]}>
                        <Select onChange={handleVoucherSelectChange} size="large">
                            {selectedStudentForHistory?.vouchers
                                .filter(v => v.netPayable > (v.paidAmount || 0))
                                .map(v => (
                                    <Option key={v._id} value={v._id}>
                                        {v.feeMonth} &nbsp;·&nbsp; Remaining: Rs {(v.netPayable - (v.paidAmount || 0)).toLocaleString()}
                                    </Option>
                                ))
                            }
                        </Select>
                    </Form.Item>

                    {/* Split Fee Cards */}
                    {selectedFeeRecord && (() => {
                        const bd = getFeeBreakdown(selectedFeeRecord);
                        const totalPayment = (tuitionPayAmount || 0) + (transportPayAmount || 0);
                        const tuitionAfter = bd.tuitionRemaining - (tuitionPayAmount || 0);
                        const transportAfter = bd.transportRemaining - (transportPayAmount || 0);
                        const hasError = !!(tuitionError || transportError);

                        return (
                            <>
                                {/* Two side-by-side fee cards */}
                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                    {/* Tuition Fee Card */}
                                    <Col xs={24} sm={12}>
                                        <div style={{
                                            border: tuitionError ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
                                            borderRadius: 8,
                                            padding: '14px 16px',
                                            background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)',
                                            height: '100%'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                                                <BankOutlined style={{ color: '#1890ff', fontSize: 16, marginRight: 6 }} />
                                                <Text strong style={{ fontSize: 14, color: '#1890ff' }}>TUITION FEE</Text>
                                            </div>
                                            <div style={{ fontSize: 12, lineHeight: '22px', marginBottom: 10 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary">Total Fee:</Text>
                                                    <Text strong>Rs {bd.tuitionTotal.toLocaleString()}</Text>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary">Already Paid:</Text>
                                                    <Text style={{ color: '#52c41a' }}>Rs {bd.tuitionPaid.toLocaleString()}</Text>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary">Remaining:</Text>
                                                    <Text style={{ color: '#ff4d4f', fontWeight: 600 }}>Rs {bd.tuitionRemaining.toLocaleString()}</Text>
                                                </div>
                                            </div>
                                            <div>
                                                <Text style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Amount to Pay (PKR)</Text>
                                                <InputNumber
                                                    id="tuitionAmountInput"
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    max={bd.tuitionRemaining}
                                                    value={tuitionPayAmount}
                                                    onChange={handleTuitionAmountChange}
                                                    placeholder="0"
                                                    formatter={val => val !== undefined && val !== '' ? `${val}` : ''}
                                                    size="large"
                                                    status={tuitionError ? 'error' : ''}
                                                />
                                                {tuitionError && (
                                                    <Text type="danger" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{tuitionError}</Text>
                                                )}
                                                {!tuitionError && tuitionPayAmount > 0 && (
                                                    <div style={{ marginTop: 6, padding: '6px 8px', background: '#f6ffed', borderRadius: 4, border: '1px solid #b7eb8f' }}>
                                                        <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>Tuition Payment:</span><Text style={{ color: '#52c41a', fontWeight: 600 }}>Rs {(tuitionPayAmount || 0).toLocaleString()}</Text>
                                                        </div>
                                                        <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>Remaining After:</span><Text style={{ color: '#fa8c16', fontWeight: 600 }}>Rs {Math.max(0, tuitionAfter).toLocaleString()}</Text>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Col>

                                    {/* Transport Fee Card */}
                                    <Col xs={24} sm={12}>
                                        <div style={{
                                            border: transportError ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
                                            borderRadius: 8,
                                            padding: '14px 16px',
                                            background: 'linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%)',
                                            height: '100%'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                                                <DollarCircleOutlined style={{ color: '#fa8c16', fontSize: 16, marginRight: 6 }} />
                                                <Text strong style={{ fontSize: 14, color: '#fa8c16' }}>TRANSPORT FEE</Text>
                                            </div>
                                            {bd.transportTotal > 0 ? (
                                                <>
                                                    <div style={{ fontSize: 12, lineHeight: '22px', marginBottom: 10 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Text type="secondary">Total Fee:</Text>
                                                            <Text strong>Rs {bd.transportTotal.toLocaleString()}</Text>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Text type="secondary">Already Paid:</Text>
                                                            <Text style={{ color: '#52c41a' }}>Rs {bd.transportPaid.toLocaleString()}</Text>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Text type="secondary">Remaining:</Text>
                                                            <Text style={{ color: '#ff4d4f', fontWeight: 600 }}>Rs {bd.transportRemaining.toLocaleString()}</Text>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Text style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Amount to Pay (PKR)</Text>
                                                        <InputNumber
                                                            id="transportAmountInput"
                                                            style={{ width: '100%' }}
                                                            min={0}
                                                            max={bd.transportRemaining}
                                                            value={transportPayAmount}
                                                            onChange={handleTransportAmountChange}
                                                            placeholder="0"
                                                            size="large"
                                                            status={transportError ? 'error' : ''}
                                                        />
                                                        {transportError && (
                                                            <Text type="danger" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{transportError}</Text>
                                                        )}
                                                        {!transportError && transportPayAmount > 0 && (
                                                            <div style={{ marginTop: 6, padding: '6px 8px', background: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
                                                                <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>Transport Payment:</span><Text style={{ color: '#fa8c16', fontWeight: 600 }}>Rs {(transportPayAmount || 0).toLocaleString()}</Text>
                                                                </div>
                                                                <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>Remaining After:</span><Text style={{ color: '#fa8c16', fontWeight: 600 }}>Rs {Math.max(0, transportAfter).toLocaleString()}</Text>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                                                    <Text type="secondary">No transport fee applicable for this voucher.</Text>
                                                </div>
                                            )}
                                        </div>
                                    </Col>
                                </Row>

                                {/* Payment Summary */}
                                <div style={{
                                    background: '#f8f9fa',
                                    border: '1px solid #e8e8e8',
                                    borderRadius: 8,
                                    padding: '14px 16px',
                                    marginBottom: 16
                                }}>
                                    <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>📋 Payment Summary</Text>
                                    <Divider style={{ margin: '0 0 10px 0' }} />
                                    <div style={{ fontSize: 12, lineHeight: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text type="secondary">Tuition Payment:</Text>
                                            <Text style={{ color: '#1890ff', fontWeight: 500 }}>Rs {(tuitionPayAmount || 0).toLocaleString()}</Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text type="secondary">Transport Payment:</Text>
                                            <Text style={{ color: '#fa8c16', fontWeight: 500 }}>Rs {(transportPayAmount || 0).toLocaleString()}</Text>
                                        </div>
                                        <Divider style={{ margin: '6px 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text strong style={{ fontSize: 13 }}>Total Payment:</Text>
                                            <Text strong style={{ fontSize: 14, color: totalPayment > 0 && !hasError ? '#52c41a' : '#ff4d4f' }}>
                                                Rs {totalPayment.toLocaleString()}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Payment Method & Notes */}
                    <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
                        <Select size="large">
                            <Option value="CASH">CASH (Counter Payment)</Option>
                            <Option value="BANK_TRANSFER">DIRECT BANK TRANSFER</Option>
                            <Option value="CHEQUE">CHEQUE</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="remarks" label="Payment Notes / Transaction Ref">
                        <Input placeholder="Receipt or bank transaction reference" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* History Modal */}
            <Modal
                title={`Fee History: ${selectedStudentForHistory?.student?.studentName || ''}`}
                open={isHistoryModalVisible}
                onCancel={() => setIsHistoryModalVisible(false)}
                footer={null}
                width={850}
            >
                <Table
                    columns={historyColumns}
                    dataSource={selectedStudentForHistory?.vouchers || []}
                    rowKey="_id"
                    pagination={false}
                    expandable={{
                        expandedRowRender: (record) => {
                            const logs = record.paymentHistory || [];
                            if (logs.length === 0) {
                                return (
                                    <div style={{ padding: '8px 16px', color: '#8c8c8c' }}>
                                        No individual payment transaction logs recorded for this voucher.
                                    </div>
                                );
                            }
                            return (
                                <div style={{ padding: '12px 16px', background: '#fafbfc', borderRadius: '6px', border: '1px solid #edf0f2' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 8, color: '#1890ff', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Payment Transaction History ({logs.length} payment{logs.length > 1 ? 's' : ''}):</span>
                                        <span style={{ color: '#52c41a' }}>Total Paid: Rs {Number(record.paidAmount || 0).toLocaleString()}</span>
                                    </div>
                                    <Table
                                        size="small"
                                        pagination={false}
                                        dataSource={logs}
                                        rowKey={(item, index) => index}
                                        columns={[
                                            { 
                                                title: 'Date', 
                                                dataIndex: 'date', 
                                                render: d => dayjs(d).format('DD MMM YYYY, hh:mm A') 
                                            },
                                            { 
                                                title: 'Tuition Paid', 
                                                dataIndex: 'tuitionAmount', 
                                                render: a => `Rs ${Number(a || 0).toLocaleString()}` 
                                            },
                                            { 
                                                title: 'Transport Paid', 
                                                dataIndex: 'transportAmount', 
                                                render: a => `Rs ${Number(a || 0).toLocaleString()}` 
                                            },
                                            { 
                                                title: 'Total Received', 
                                                dataIndex: 'amount', 
                                                render: a => <strong style={{ color: '#52c41a' }}>Rs {Number(a || 0).toLocaleString()}</strong> 
                                            },
                                            { title: 'Method', dataIndex: 'paymentMethod' },
                                            { title: 'Remarks', dataIndex: 'remarks', render: r => r || '-' },
                                            {
                                                title: 'Action',
                                                key: 'print',
                                                render: (_, p) => (
                                                    <Button 
                                                        size="small" 
                                                        type="link" 
                                                        icon={<PrinterOutlined />} 
                                                        onClick={() => generateVoucherPDF(record, { isReceipt: true, currentPayment: p })}
                                                    >
                                                        Print Receipt
                                                    </Button>
                                                )
                                            }
                                        ]}
                                    />
                                </div>
                            );
                        },
                        rowExpandable: record => (record.paymentHistory && record.paymentHistory.length > 0)
                    }}
                />
            </Modal>
        </div>
    );
};

export default Fees;