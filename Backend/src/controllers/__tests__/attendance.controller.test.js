import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/attendance.model.js', () => ({
    Attendance: {
        findOne: jest.fn(),
        create: jest.fn(),
        insertMany: jest.fn(),
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn()
    }
}));

const { Attendance } = await import('../../models/attendance.model.js');
const { markAttendance, markBulkAttendance, getAttendanceByStudent } = await import('../attendance.controller.js');

describe('Attendance Controller', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {
            body: {},
            params: {},
            query: {}
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        next = jest.fn();
    });

    describe('markAttendance', () => {
        it('should throw error if fields are missing', async () => {
            req.body = { studentId: '1' };
            await markAttendance(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "studentId, classId, date and status are required" }));
        });

        it('should mark attendance successfully', async () => {
            req.body = { studentId: '1', classId: '2', date: '2023-10-10', status: 'PRESENT' };
            Attendance.findOne.mockResolvedValue(null);
            Attendance.create.mockResolvedValue({ _id: 'attId' });

            await markAttendance(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Attendance marked successfully" }));
        });
    });

    describe('markBulkAttendance', () => {
        it('should throw error if records array is empty', async () => {
            req.body = { records: [] };
            await markBulkAttendance(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "records array is required" }));
        });

        it('should bulk mark successfully', async () => {
            req.body = { records: [{ studentId: '1' }] };
            Attendance.insertMany.mockResolvedValue([{ _id: 'attId' }]);

            await markBulkAttendance(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});
