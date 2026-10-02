import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/fees.model.js', () => ({
    Fees: {
        create: jest.fn(),
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn()
    }
}));

const { Fees } = await import('../../models/fees.model.js');
const { createFee, getPendingFees } = await import('../fees.controller.js');

describe('Fees Controller', () => {
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

    describe('createFee', () => {
        it('should throw error if fields are missing', async () => {
            req.body = { studentId: '1' };
            await createFee(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "studentId, feeType, amount and dueDate are required" }));
        });

        it('should create fee successfully', async () => {
            req.body = { studentId: '1', feeType: 'Tuition', amount: 5000, dueDate: '2023-12-01' };
            Fees.create.mockResolvedValue({ _id: 'feeId' });

            await createFee(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Fee record created successfully" }));
        });
    });

    describe('getPendingFees', () => {
        it('should get pending fees', async () => {
            req.params.studentId = '1';
            
            const mockSort = jest.fn().mockResolvedValue([{ amount: 5000 }]);
            Fees.find.mockReturnValue({ sort: mockSort });

            await getPendingFees(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ amount: 5000 }] }));
        });
    });
});
