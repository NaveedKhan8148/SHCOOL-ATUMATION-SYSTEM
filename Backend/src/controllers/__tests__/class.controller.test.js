import { jest } from '@jest/globals';

// Mocking the Class Model
jest.unstable_mockModule('../../models/class.model.js', () => ({
    Class: {
        findOne: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn(),
        find: jest.fn()
    }
}));

const { Class } = await import('../../models/class.model.js');
const { createClass, getAllClasses, getClassById } = await import('../class.controller.js');

describe('Class Controller', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {
            body: {},
            params: {}
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        next = jest.fn();
    });

    describe('createClass', () => {
        it('should throw an error if name or classTeacherId is missing', async () => {
            req.body = { name: 'Class 1' }; // missing classTeacherId
            await createClass(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "name and classTeacherId are required" }));
        });

        it('should throw an error if class name already exists', async () => {
            req.body = { name: 'Class 1', classTeacherId: 'teacherId' };
            Class.findOne.mockResolvedValue({ _id: 'existingClass' });
            
            await createClass(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Class with this name already exists" }));
        });

        it('should create class successfully and return 201', async () => {
            req.body = { name: 'Class 1', classTeacherId: 'teacherId', section: 'A', academicYear: '2023-2024' };
            
            Class.findOne.mockResolvedValue(null);
            
            const mockCreatedClass = { _id: 'classId', name: 'Class 1', classTeacherId: 'teacherId' };
            Class.create.mockResolvedValue(mockCreatedClass);

            await createClass(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockCreatedClass,
                    message: "Class created successfully"
                })
            );
        });
    });

    describe('getAllClasses', () => {
        it('should fetch all classes and return 200', async () => {
            const mockClasses = [{ _id: '1', name: 'Class 1' }, { _id: '2', name: 'Class 2' }];
            Class.find.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockClasses)
            });

            await getAllClasses(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockClasses
                })
            );
        });
    });

    describe('getClassById', () => {
        it('should throw 404 if class not found', async () => {
            req.params.id = 'nonexistent';
            Class.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            await getClassById(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Class not found" }));
        });

        it('should return class if found', async () => {
            req.params.id = 'classId';
            const mockClass = { _id: 'classId', name: 'Class 1' };
            Class.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockClass)
            });

            await getClassById(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockClass
                })
            );
        });
    });
});
