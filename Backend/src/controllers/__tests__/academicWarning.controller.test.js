import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/academicWarning.model.js', () => ({
    AcademicWarning: {
        create: jest.fn(),
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn()
    }
}));

const { AcademicWarning } = await import('../../models/academicWarning.model.js');
const { createWarning, getWarningsByStudent } = await import('../academicWarning.controller.js');

describe('AcademicWarning Controller', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {
            body: {},
            params: {},
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        next = jest.fn();
    });

    describe('createWarning', () => {
        it('should throw error if fields are missing', async () => {
            req.body = { studentId: '1' };
            await createWarning(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "studentId, ruleViolated and detailDescription are required" }));
        });

        it('should create warning successfully', async () => {
            req.body = { studentId: '1', ruleViolated: 'Attendance', detailDescription: 'Absent for 5 days' };
            AcademicWarning.create.mockResolvedValue({ _id: 'warn1' });

            await createWarning(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('getWarningsByStudent', () => {
        it('should fetch warnings', async () => {
            req.params.studentId = '1';
            
            const mockSort = jest.fn().mockResolvedValue([{ ruleViolated: 'Attendance' }]);
            const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
            AcademicWarning.find.mockReturnValue({ populate: mockPopulate });

            await getWarningsByStudent(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                success: true,
                data: [{ ruleViolated: 'Attendance' }] 
            }));
        });
    });
});
