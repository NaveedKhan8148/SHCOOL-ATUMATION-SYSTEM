import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/parent.model.js', () => ({
    Parent: {
        findOne: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn(),
        find: jest.fn()
    }
}));

jest.unstable_mockModule('../../models/user.model.js', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
        findByIdAndDelete: jest.fn()
    }
}));

jest.unstable_mockModule('../../models/studentParent.model.js', () => ({
    StudentParent: {
        findOne: jest.fn(),
        create: jest.fn(),
        find: jest.fn(),
        deleteMany: jest.fn()
    }
}));

const { Parent } = await import('../../models/parent.model.js');
const { User } = await import('../../models/user.model.js');
const { StudentParent } = await import('../../models/studentParent.model.js');
const { createParent, linkStudentToParent } = await import('../parent.controller.js');

describe('Parent Controller', () => {
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

    describe('createParent', () => {
        it('should throw error if fields are missing', async () => {
            req.body = { email: 'parent@test.com' };
            await createParent(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "All required fields must be provided" }));
        });

        it('should throw error if email exists', async () => {
            req.body = { email: 'exist@test.com', password: 'p', name: 'John', cnicNo: '1', contactNumber: '1' };
            User.findOne.mockResolvedValue({ _id: 'exist' });
            
            await createParent(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Email already registered" }));
        });

        it('should create parent successfully', async () => {
            req.body = { email: 'exist@test.com', password: 'p', name: 'John', cnicNo: '1', contactNumber: '1' };
            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({ _id: 'userId' });
            Parent.create.mockResolvedValue({ _id: 'parentId' });

            await createParent(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('linkStudentToParent', () => {
        it('should link successfully', async () => {
            req.body = { studentId: 's1', parentId: 'p1', relationship: 'Father' };
            StudentParent.findOne.mockResolvedValue(null);
            StudentParent.create.mockResolvedValue({ _id: 'linkId' });

            await linkStudentToParent(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });
});
