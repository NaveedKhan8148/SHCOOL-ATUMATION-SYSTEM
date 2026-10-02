import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Attendance } from "../models/attendance.model.js";
import { Result } from "../models/result.model.js";
import { Fees } from "../models/fees.model.js";
import { Class } from "../models/class.model.js";

// GET /api/v1/analytics/attendance-by-class
// Returns attendance % per class for last 4 weeks (org-scoped)
const attendanceByClass = asyncHandler(async (req, res) => {
    const organizationId = req.user.organizationId;
    const classes = await Class.find({ organizationId }).select("name");

    const now = new Date();
    const weeks = [0, 1, 2, 3].map((i) => {
        const end = new Date(now);
        end.setDate(end.getDate() - i * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        return { label: `Week ${4 - i}`, start, end };
    }).reverse();

    const data = await Promise.all(
        classes.map(async (cls) => {
            const weekData = { className: cls.name };
            for (const week of weeks) {
                const records = await Attendance.find({
                    organizationId,
                    classId: cls._id,
                    date: { $gte: week.start, $lte: week.end },
                });
                const present = records.filter((r) => r.status === "Present").length;
                const total = records.length;
                weekData[week.label] = total > 0
                    ? Math.round((present / total) * 100)
                    : 0;
            }
            return weekData;
        })
    );

    return res.status(200).json(new ApiResponse(200, data, "Attendance by class fetched"));
});

// GET /api/v1/analytics/results-by-semester
const resultsBySemester = asyncHandler(async (req, res) => {
    const organizationId = req.user.organizationId;
    const semesters = await Result.distinct("semester", { organizationId });

    const data = await Promise.all(
        semesters.map(async (semester) => {
            const results = await Result.find({ organizationId, semester });
            const total = results.length;
            const passed = results.filter((r) => r.grade !== "F").length;
            const avgMarks = total > 0
                ? (results.reduce((s, r) => s + r.marks, 0) / total).toFixed(1)
                : 0;
            const passRate = total > 0
                ? Math.round((passed / total) * 100)
                : 0;
            return { semester, avgMarks: Number(avgMarks), passRate };
        })
    );

    data.sort((a, b) => a.semester.localeCompare(b.semester));

    return res.status(200).json(new ApiResponse(200, data, "Results by semester fetched"));
});

// GET /api/v1/analytics/fee-collection
const feeCollection = asyncHandler(async (req, res) => {
    const organizationId = req.user.organizationId;
    const fees = await Fees.find({ organizationId });

    const byMonth = {};
    fees.forEach((fee) => {
        const month = new Date(fee.dueDate).toLocaleString("default", {
            month: "short",
            year: "numeric",
        });
        if (!byMonth[month]) byMonth[month] = { name: month, collected: 0, pending: 0 };
        const amount = Number(fee.amount);
        if (fee.status === "Paid") {
            byMonth[month].collected += amount;
        } else {
            byMonth[month].pending += amount;
        }
    });

    const data = Object.values(byMonth).slice(-6);

    return res.status(200).json(new ApiResponse(200, data, "Fee collection fetched"));
});

// GET /api/v1/analytics/performance-distribution
const performanceDistribution = asyncHandler(async (req, res) => {
    const organizationId = req.user.organizationId;
    const results = await Result.find({ organizationId });

    const ranges = {
        "A (85-100)": 0,
        "B (70-84)":  0,
        "C (50-69)":  0,
        "F (0-49)":   0,
    };

    results.forEach((r) => {
        if (r.marks >= 85) ranges["A (85-100)"]++;
        else if (r.marks >= 70) ranges["B (70-84)"]++;
        else if (r.marks >= 50) ranges["C (50-69)"]++;
        else ranges["F (0-49)"]++;
    });

    const data = Object.entries(ranges).map(([range, count]) => ({ range, count }));

    return res.status(200).json(new ApiResponse(200, data, "Performance distribution fetched"));
});

export { attendanceByClass, resultsBySemester, feeCollection, performanceDistribution };