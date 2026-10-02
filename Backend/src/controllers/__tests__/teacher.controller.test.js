import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/teacher.model.js', () => ({
    Teacher: {
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

const { Teacher } = await import('../../models/teacher.model.js');
const { User } = await import('../../models/user.model.js');
const { createTeacher, getAllTeachers, getMyTeacherProfile } = await import('../teacher.controller.js');

describe('Teacher Controller', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {
            body: {},
            params: {},
            user: {}
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        next = jest.fn();
    });

    describe('createTeacher', () => {
        it('should throw error if fields are missing', async () => {
            req.body = { email: 'teacher@test.com', name: 'John' };
            await createTeacher(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "All required fields must be provided" }));
        });

        it('should throw error if email exists', async () => {
            req.body = { 
                email: 'conflict@test.com', password: 'pass', name: 'John', 
                cnicNumber: '123', contactNumber: '123', subject: 'Math', dateOfJoining: '2023' 
            };
            User.findOne.mockResolvedValue({ _id: 'exist' });
            await createTeacher(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Email already registered" }));
        });

        it('should create teacher successfully', async () => {
            req.body = { 
                email: 'teacher@test.com', password: 'pass', name: 'John', 
                cnicNumber: '123', contactNumber: '123', subject: 'Math', dateOfJoining: '2023', address: 'Home' 
            };
            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({ _id: 'userId', role: 'TEACHER' });
            Teacher.create.mockResolvedValue({ _id: 'teacherId', name: 'John' });

            await createTeacher(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Teacher created successfully"
                })
            );
        });
    });

    describe('getAllTeachers', () => {
        it('should fetch all teachers', async () => {
            Teacher.find.mockReturnValue({
                populate: jest.fn().mockResolvedValue([{ name: 'Test Teacher' }])
            });

            await getAllTeachers(req, res, next);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: [{ name: 'Test Teacher' }] })
            );
        });
    });

    describe('getMyTeacherProfile', () => {
        it('should throw 404 if profile not found', async () => {
            req.user = { _id: 'userId' };
            Teacher.findOne.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            await getMyTeacherProfile(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Teacher profile not found" }));
        });
    });
});
