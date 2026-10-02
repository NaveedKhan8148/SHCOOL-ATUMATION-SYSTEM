import { jest } from '@jest/globals';

// Mocking the Models
jest.unstable_mockModule('../../models/student.model.js', () => ({
    Student: {
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

const { Student } = await import('../../models/student.model.js');
const { User } = await import('../../models/user.model.js');
const { createStudent, getAllStudents } = await import('../student.controller.js');

describe('Student Controller', () => {
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

    describe('createStudent', () => {
        it('should throw an error if required fields are missing', async () => {
            req.body = { email: 'test@example.com', password: 'pass', rollNo: '' };
            await createStudent(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "All required fields must be provided" }));
        });

        it('should throw an error if email already registered', async () => {
            req.body = { 
                email: 'test@example.com', password: 'pass', rollNo: '123', 
                studentName: 'John', dateOfJoining: '2023-01-01', classId: 'cls1' 
            };
            User.findOne.mockResolvedValue({ _id: 'existingUser' });
            
            await createStudent(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Email already registered" }));
        });

        it('should create student successfully and return 201', async () => {
            req.body = { 
                email: 'test@example.com', password: 'pass', rollNo: '123', 
                studentName: 'John', dateOfJoining: '2023-01-01', classId: 'cls1',
                status: 'ACTIVE', address: '123 St'
            };
            
            User.findOne.mockResolvedValue(null);
            
            const mockCreatedUser = { _id: 'userId123', email: 'test@example.com', role: 'STUDENT' };
            User.create.mockResolvedValue(mockCreatedUser);
            
            const mockCreatedStudent = { 
                _id: 'studentId', userId: 'userId123', studentName: 'John' 
            };
            Student.create.mockResolvedValue(mockCreatedStudent);

            await createStudent(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockCreatedStudent
                })
            );
        });
    });

    describe('getAllStudents', () => {
        it('should fetch all students and return 200', async () => {
            const mockPopulate2 = jest.fn().mockResolvedValue([{ _id: 'studentId', studentName: 'John' }]);
            const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
            Student.find.mockReturnValue({ populate: mockPopulate1 });

            await getAllStudents(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: [{ _id: 'studentId', studentName: 'John' }]
                })
            );
        });
    });
});
