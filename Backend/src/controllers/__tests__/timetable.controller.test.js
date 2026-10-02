import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/timetable.model.js', () => ({
    Timetable: {
        findOne: jest.fn(),
        create: jest.fn(),
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn()
    }
}));

const { Timetable } = await import('../../models/timetable.model.js');
const { createTimetableEntry, getTimetableByClass } = await import('../timetable.controller.js');

describe('Timetable Controller', () => {
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

    describe('createTimetableEntry', () => {
        it('should throw error if fields are missing', async () => {
            req.body = { classId: '1' };
            await createTimetableEntry(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "All fields are required" }));
        });

        it('should throw error on class overlap', async () => {
            req.body = { 
                classId: 'c1', teacherId: 't1', dayOfWeek: 'MON', 
                timeSlot: '10:00', subject: 'Math', roomLocation: 'Room 1' 
            };
            Timetable.findOne.mockResolvedValueOnce({ _id: 'overlapClass' });

            await createTimetableEntry(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Class already has a lesson at this day/time slot" }));
        });

        it('should create entry successfully', async () => {
            req.body = { 
                classId: 'c1', teacherId: 't1', dayOfWeek: 'MON', 
                timeSlot: '10:00', subject: 'Math', roomLocation: 'Room 1' 
            };
            Timetable.findOne
                .mockResolvedValueOnce(null) // class check
                .mockResolvedValueOnce(null); // teacher check
                
            Timetable.create.mockResolvedValue({ _id: 'tt1' });

            await createTimetableEntry(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('getTimetableByClass', () => {
        it('should fetch timetable for class', async () => {
            req.params.classId = 'c1';
            
            const mockSort = jest.fn().mockResolvedValue([{ subject: 'Math' }]);
            const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
            Timetable.find.mockReturnValue({ populate: mockPopulate });

            await getTimetableByClass(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ subject: 'Math' }] }));
        });
    });
});
