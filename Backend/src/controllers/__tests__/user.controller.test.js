import { jest } from '@jest/globals';

// Mocking the User Model
jest.unstable_mockModule('../../models/user.model.js', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn(),
        find: jest.fn()
    }
}));

// Mocking dependencies explicitly to prevent DB connection
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        verify: jest.fn()
    }
}));

const { User } = await import('../../models/user.model.js');
const { registerUser, loginUser } = await import('../user.controller.js');

describe('User Controller', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {
            body: {},
            cookies: {},
            params: {},
            user: {}
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn().mockReturnThis(),
            clearCookie: jest.fn().mockReturnThis()
        };
        
        next = jest.fn();
    });

    describe('registerUser', () => {
        it('should throw an error if fields are missing', async () => {
            req.body = { email: '', password: '', role: '' };
            
            await registerUser(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "email, password and role are required" }));
        });

        it('should throw an error if user already exists', async () => {
            req.body = { email: 'test@example.com', password: 'password', role: 'STUDENT' };
            User.findOne.mockResolvedValue({ _id: 'mockId' });
            
            await registerUser(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "User with this email already exists" }));
        });

        it('should register successfully and return 201', async () => {
            req.body = { email: 'test@example.com', password: 'password', role: 'STUDENT' };
            
            User.findOne.mockResolvedValue(null);
            
            const mockCreatedUser = { _id: 'newUserId', email: 'test@example.com' };
            User.create.mockResolvedValue(mockCreatedUser);
            
            const mockSelect = jest.fn().mockResolvedValue(mockCreatedUser);
            User.findById.mockReturnValue({ select: mockSelect });

            await registerUser(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "User registered successfully",
                    data: mockCreatedUser
                })
            );
        });
    });

    describe('loginUser', () => {
        it('should throw error if email or password missing', async () => {
             req.body = { email: '' }; // Missing password
             await loginUser(req, res, next);
             expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "email and password are required" }));
        });

        it('should login a user correctly and set cookies', async () => {
             req.body = { email: 'test@example.com', password: 'password' };
             
             const mockUser = {
                 _id: 'userId123',
                 email: 'test@example.com',
                 isPasswordCorrect: jest.fn().mockResolvedValue(true),
                 generateAccessToken: jest.fn().mockReturnValue('mockAccessToken'),
                 generateRefreshToken: jest.fn().mockReturnValue('mockRefreshToken'),
                 save: jest.fn().mockResolvedValue(true)
             };
             
             User.findOne.mockResolvedValue(mockUser);
             User.findById.mockReturnValue({
                 select: jest.fn().mockResolvedValue({ _id: 'userId123', email: 'test@example.com' })
             });
             
             User.findById.mockImplementationOnce(() => Promise.resolve(mockUser));
             User.findById.mockImplementationOnce(() => ({
                 select: jest.fn().mockResolvedValue({ _id: 'userId123', email: 'test@example.com' })
             }));

             await loginUser(req, res, next);

             expect(res.cookie).toHaveBeenCalledWith("accessToken", "mockAccessToken", expect.any(Object));
             expect(res.status).toHaveBeenCalledWith(200);
             expect(res.json).toHaveBeenCalledWith(
                 expect.objectContaining({
                     message: "Login successful"
                 })
             );
        });
    });
});
