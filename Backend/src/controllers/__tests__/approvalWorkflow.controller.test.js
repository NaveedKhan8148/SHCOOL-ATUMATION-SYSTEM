import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/approvalWorkflow.model.js', () => ({
    ApprovalWorkflow: {
        create: jest.fn(),
        find: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        countDocuments: jest.fn()
    }
}));

const { ApprovalWorkflow } = await import('../../models/approvalWorkflow.model.js');
const { createWorkflow, approveWorkflow } = await import('../approvalWorkflow.controller.js');

describe('ApprovalWorkflow Controller', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {
            body: {},
            params: {},
            user: { _id: 'admin', email: 'admin@admin.com', role: 'ADMIN' }
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        next = jest.fn();
    });

    describe('createWorkflow', () => {
        it('should throw error if fields are missing', async () => {
            req.body = { type: 'Fee concession' };
            await createWorkflow(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "type, description and studentId are required" }));
        });

        it('should create workflow successfully', async () => {
            req.body = { type: 'Absence', description: 'Sick leave', studentId: 'stu1' };
            ApprovalWorkflow.create.mockResolvedValue({ _id: 'wf1' });
            
            const mockPopulate = jest.fn().mockReturnThis();
            ApprovalWorkflow.findById.mockReturnValue({ populate: mockPopulate });

            await createWorkflow(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('approveWorkflow', () => {
        it('should approve a pending workflow', async () => {
            req.params.id = 'wf1';
            
            const mockWorkflow = { 
                _id: 'wf1', status: 'Pending', 
                save: jest.fn().mockResolvedValue(true) 
            };
            
            ApprovalWorkflow.findById
                .mockResolvedValueOnce(mockWorkflow)
                // Second call inside populate
                .mockReturnValueOnce({ populate: jest.fn().mockReturnThis() });

            await approveWorkflow(req, res, next);
            
            expect(mockWorkflow.status).toBe('Approved');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Workflow approved successfully" }));
        });
    });
});
