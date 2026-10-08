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

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

const Fees = () => {
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

    // Official Printable Fee Voucher PDF Generator
    const generateVoucherPDF = (record) => {
        const doc = new jsPDF();
        const student = record.studentId || {};
        const className = student.classId?.name ? `${student.classId.name} (${student.classId.section || 'A'})` : '-';

        // Primary Header Band
        doc.setFillColor(24, 144, 255);
        doc.rect(0, 0, 210, 32, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('OFFICIAL STUDENT FEE VOUCHER', 105, 16, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('SCHOOL AUTOMATION SYSTEM - OFFICIAL PAYMENT VOUCHER & RECEIPT', 105, 24, { align: 'center' });

        // Voucher Summary Meta
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Voucher No: ${record.voucherNo || record._id}`, 14, 44);
        doc.text(`Fee Month: ${record.feeMonth || 'Current Month'}`, 14, 52);
        doc.text(`Issue Date: ${dayjs(record.createdAt).format('DD MMM YYYY')}`, 130, 44);
        doc.text(`Due Date: ${dayjs(record.dueDate).format('DD MMM YYYY')}`, 130, 52);

        // Status Badge Box
        const statusText = record.status || 'PENDING';
        if (statusText === 'PAID') {
            doc.setFillColor(82, 196, 26);
        } else if (statusText === 'PARTIAL') {
            doc.setFillColor(250, 173, 20);
        } else {
            doc.setFillColor(255, 77, 79);
        }
        doc.rect(130, 58, 65, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(`STATUS: ${statusText}`, 162, 65, { align: 'center' });

        // Student Info Block
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(248, 249, 250);
        doc.rect(14, 58, 110, 26, 'FD');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Student Name: ${student.studentName || 'Student'}`, 18, 65);
        doc.setFont('helvetica', 'normal');
        doc.text(`Roll Number: ${student.rollNo || '-'}`, 18, 72);
        doc.text(`Class & Section: ${className}`, 18, 79);

        // Itemized Fee Heads Table
        const feeHeadsRows = (record.feeHeads && record.feeHeads.length > 0)
            ? record.feeHeads.map(h => [h.headName, `Rs ${Number(h.amount).toLocaleString()}`])
            : [['Tuition Fee', `Rs ${Number(record.netPayable || 0).toLocaleString()}`]];

        autoTable(doc, {
            startY: 92,
            head: [['Fee Head / Particulars', 'Amount (PKR)']],
            body: feeHeadsRows,
            theme: 'grid',
            headStyles: { fillColor: [24, 144, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { fontSize: 10 },
            columnStyles: { 0: { cellWidth: 135 }, 1: { cellWidth: 45, halign: 'right' } }
        });

        let finalY = doc.lastAutoTable.finalY + 8;

        // Subtotal, Concessions, Net Payable Summary Block
        doc.setFont('helvetica', 'normal');
        doc.text(`Sub Total:`, 120, finalY);
        doc.text(`Rs ${Number(record.subTotal || record.netPayable).toLocaleString()}`, 180, finalY, { align: 'right' });

        if (record.totalConcession > 0) {
            finalY += 6;
            doc.setTextColor(235, 47, 6);
            doc.text(`Discount / Concession:`, 120, finalY);
            doc.text(`- Rs ${Number(record.totalConcession).toLocaleString()}`, 180, finalY, { align: 'right' });
        }

        finalY += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(24, 144, 255);
        doc.text(`NET PAYABLE AMOUNT:`, 120, finalY);
        doc.text(`Rs ${Number(record.netPayable).toLocaleString()}`, 180, finalY, { align: 'right' });

        // Payment Info Block if Paid
        if (record.status === 'PAID' || record.status === 'PARTIAL') {
            finalY += 14;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            doc.text(`Paid Amount: Rs ${Number(record.paidAmount || record.netPayable).toLocaleString()}`, 14, finalY);
            doc.text(`Payment Method: ${record.paymentMethod || 'CASH'}`, 14, finalY + 6);
            doc.text(`Paid Date: ${record.paidDate ? dayjs(record.paidDate).format('DD MMM YYYY') : '-'}`, 14, finalY + 12);
            doc.text(`Received By: ${record.receivedBy || 'Accounts Officer'}`, 14, finalY + 18);
        }

        // Footer Instructions & Signatures
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Note: Please pay dues on or before the due date to avoid late fine surcharge.', 14, 260);
        doc.line(14, 270, 70, 270);
        doc.text('Parent Signature', 30, 275);
        doc.line(130, 270, 190, 270);
        doc.text('Accounts / Cashier Seal', 145, 275);

        doc.save(`FeeVoucher_${record.voucherNo || record._id}.pdf`);
        message.success('Official Fee Voucher PDF generated successfully!');
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
            await axios.patch(`/api/v1/fees/${values.voucherId}/pay`, {
                tuitionAmount: tuitionPayAmount,
                transportAmount: transportPayAmount,
                paymentMethod: values.paymentMethod,
                remarks: values.remarks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Payment recorded successfully!');
            setIsPayModalVisible(false);
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
                    <Tooltip title="Print Voucher PDF">
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
                />
            </Modal>
        </div>
    );
};

export default Fees;