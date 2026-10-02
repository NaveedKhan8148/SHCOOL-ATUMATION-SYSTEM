import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/result.model.js', () => ({
    Result: {
        findOne: jest.fn(),
        create: jest.fn(),
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn()
    }
}));

const { Result } = await import('../../models/result.model.js');
const { createResult, getResultsByStudent } = await import('../result.controller.js');

describe('Result Controller', () => {
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

    describe('createResult', () => {
        it('should throw error if fields are missing', async () => {
            req.body = { studentId: '1' };
            await createResult(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "All fields are required" }));
        });

        it('should throw error if result already exists', async () => {
            req.body = { studentId: '1', classId: '1', subject: 'Math', marks: 95, grade: 'A', semester: 'Fall-2023' };
            Result.findOne.mockResolvedValueOnce({ _id: 'exist' });

            await createResult(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Result already exists for this student/subject/semester" }));
        });

        it('should create result successfully', async () => {
            req.body = { studentId: '1', classId: '1', subject: 'Math', marks: 95, grade: 'A', semester: 'Fall-2023' };
            Result.findOne.mockResolvedValueOnce(null);
            Result.create.mockResolvedValue({ _id: 'resultId' });

            await createResult(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('getResultsByStudent', () => {
        it('should get results with sorting and population', async () => {
            req.params.studentId = '1';
            
            const mockSort = jest.fn().mockResolvedValue([{ subject: 'Math' }]);
            const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
            Result.find.mockReturnValue({ populate: mockPopulate });

            await getResultsByStudent(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ subject: 'Math' }] }));
        });
    });
});
