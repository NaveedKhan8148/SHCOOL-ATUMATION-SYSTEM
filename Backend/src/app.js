import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { ApiError } from "./utils/ApiError.js"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from './routes/user.routes.js'
import organizationRouter from './routes/organization.routes.js'

// ── School Management routes ──────────────────────────────────────────────────
import teacherRouter from "./routes/teacher.routes.js"
import studentRouter from "./routes/student.routes.js"
import parentRouter from "./routes/parent.routes.js"
import classRouter from "./routes/class.routes.js"
import attendanceRouter from "./routes/attendance.routes.js"
import feesRouter from "./routes/fees.routes.js"
import resultRouter from "./routes/result.routes.js"
import timetableRouter from "./routes/timetable.routes.js"
import warningRouter from "./routes/academicWarning.routes.js"
import workflowRouter from "./routes/approvalWorkflow.routes.js"
import analyticsRouter from "./routes/analytics.routes.js"
import academicSessionRouter from "./routes/academicSession.routes.js"
import payrollRouter from "./routes/payroll.routes.js"
import expenseRouter from "./routes/expense.routes.js"

// ── Existing route declarations ───────────────────────────────────────────────
app.use("/api/v1/users", userRouter)
app.use("/api/v1/organizations", organizationRouter)

// ── School Management route declarations ─────────────────────────────────────
app.use("/api/v1/teachers", teacherRouter)
app.use("/api/v1/students", studentRouter)
app.use("/api/v1/parents", parentRouter)
app.use("/api/v1/classes", classRouter)
app.use("/api/v1/attendance", attendanceRouter)
app.use("/api/v1/fees", feesRouter)
app.use("/api/v1/results", resultRouter)
app.use("/api/v1/timetable", timetableRouter)
app.use("/api/v1/warnings", warningRouter)
app.use("/api/v1/workflows", workflowRouter)
app.use("/api/v1/analytics", analyticsRouter)
app.use("/api/v1/academic-sessions", academicSessionRouter)
app.use("/api/v1/payroll", payrollRouter)
app.use("/api/v1/expenses", expenseRouter)

// ============= ERROR HANDLING MIDDLEWARE (ADD THIS) =============
// This MUST be after all routes and before export
app.use((err, req, res, next) => {
    // Check if it's our ApiError
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            statusCode: err.statusCode,
            errors: err.errors,
            data: err.data
        });
    }
    
    // Log the error for debugging
    console.error('Error:', err);
    
    // Handle other errors (MongoDB, validation, etc.)
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    return res.status(statusCode).json({
        success: false,
        message: message,
        statusCode: statusCode,
        errors: err.errors || [],
        data: null
    });
});
// ================================================================

export { app }