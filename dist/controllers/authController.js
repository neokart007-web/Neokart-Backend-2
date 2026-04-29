"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginCustomer = exports.registerCustomer = exports.createTestAdmin = exports.loginAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
const env_1 = require("../config/env");
const generateToken = (id, role) => {
    return jsonwebtoken_1.default.sign({ id, role }, env_1.ENV.JWT_SECRET, {
        expiresIn: env_1.ENV.JWT_EXPIRES_IN,
    });
};
exports.loginAdmin = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Please provide email and password');
    }
    // Check if user exists and select password
    const user = await User_1.User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
        return (0, responseHandler_1.errorResponse)(res, 401, 'Invalid email or password');
    }
    if (!user.isActive) {
        return (0, responseHandler_1.errorResponse)(res, 403, 'Your account has been deactivated');
    }
    // Check if role is admin or superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
        return (0, responseHandler_1.errorResponse)(res, 403, 'Not authorized to access admin portal');
    }
    // Generate Token
    const token = generateToken(user._id.toString(), user.role);
    // Set Cookie for extra security (HTTP-Only)
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: env_1.ENV.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    (0, responseHandler_1.successResponse)(res, 200, 'Login successful', {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
    });
});
// Helper to quickly create a test admin user (Can be removed later)
exports.createTestAdmin = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userExists = await User_1.User.findOne({ email: 'admin@heedy.com' });
    if (userExists) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Admin already exists');
    }
    const admin = await User_1.User.create({
        name: 'System Admin',
        email: 'admin@heedy.com',
        password: 'password123',
        role: 'superadmin'
    });
    (0, responseHandler_1.successResponse)(res, 201, 'Test admin created successfully. You can now login.', {
        email: admin.email,
        password: 'password123'
    });
});
exports.registerCustomer = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, password, phone, addresses } = req.body;
    if (!name || !email || !password) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Please provide name, email and password');
    }
    const userExists = await User_1.User.findOne({ email });
    if (userExists) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Email is already registered');
    }
    const user = await User_1.User.create({
        name,
        email,
        password,
        phone,
        role: 'customer',
        addresses
    });
    const token = generateToken(user._id.toString(), user.role);
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: env_1.ENV.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    (0, responseHandler_1.successResponse)(res, 201, 'Registration successful', {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
    });
});
exports.loginCustomer = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Please provide email and password');
    }
    const user = await User_1.User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
        return (0, responseHandler_1.errorResponse)(res, 401, 'Invalid email or password');
    }
    if (!user.isActive) {
        return (0, responseHandler_1.errorResponse)(res, 403, 'Your account has been deactivated');
    }
    // Only allow customers to use this endpoint
    if (user.role !== 'customer') {
        return (0, responseHandler_1.errorResponse)(res, 403, 'Please use the admin portal to login');
    }
    const token = generateToken(user._id.toString(), user.role);
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: env_1.ENV.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    (0, responseHandler_1.successResponse)(res, 200, 'Login successful', {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
    });
});
//# sourceMappingURL=authController.js.map