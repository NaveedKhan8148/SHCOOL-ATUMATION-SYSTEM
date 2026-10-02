import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/attendance.model.js', () => ({
    Attendance: {
        find: jest.fn()
    }
}));

jest.unstable_mockModule('../../models/result.model.js', () => ({
    Result: {
        find: jest.fn(),
        distinct: jest.fn()
    }
}));

jest.unstable_mockModule('../../models/fees.model.js', () => ({
    Fees: {
        find: jest.fn()
    }
}));

jest.unstable_mockModule('../../models/class.model.js', () => ({
    Class: {
        find: jest.fn()
    }
}));

const { Class } = await import('../../models/class.model.js');
const { resultsBySemester, feeCollection } = await import('../analytics.controller.js');

describe('Analytics Controller', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('feeCollection', () => {
        it('should get fee collection properly', async () => {
            const { Fees } = await import('../../models/fees.model.js');
            Fees.find.mockResolvedValue([
                { dueDate: new Date(), amount: 1000, status: 'Paid' },
                { dueDate: new Date(), amount: 500, status: 'Pending' }
            ]);

            await feeCollection(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                success: true, 
                message: "Fee collection fetched",
                data: expect.any(Array) 
            }));
        });
    });

    describe('resultsBySemester', () => {
        it('should list avg marks and pass rate', async () => {
            const { Result } = await import('../../models/result.model.js');
            Result.distinct.mockResolvedValue(['Fall-2023']);
            Result.find.mockResolvedValue([
                { grade: 'A', marks: 95 },
                { grade: 'F', marks: 45 }
            ]);

            await resultsBySemester(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                success: true,
                data: expect.arrayContaining([
                    expect.objectContaining({ avgMarks: 70, passRate: 50, semester: 'Fall-2023' })
                ])
            }));
        });
    });
});
