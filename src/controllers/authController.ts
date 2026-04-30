import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';
import { ENV } from '../config/env';

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as any,
  });
};

export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 400, 'Please provide email and password');
  }

  // Check if user exists and select password
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return errorResponse(res, 401, 'Invalid email or password');
  }

  if (!user.isActive) {
    return errorResponse(res, 403, 'Your account has been deactivated');
  }

  // Check if role is admin or superadmin
  if (user.role !== 'admin' && user.role !== 'superadmin') {
     return errorResponse(res, 403, 'Not authorized to access admin portal');
  }

  // Generate Token
  const token = generateToken(user._id.toString(), user.role);

  // Set Cookie for extra security (HTTP-Only)
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  successResponse(res, 200, 'Login successful', {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token
  });
});

// Helper to quickly create a test admin user (Can be removed later)
export const createTestAdmin = asyncHandler(async (req: Request, res: Response) => {
  const userExists = await User.findOne({ email: 'admin@heedy.com' });
  if (userExists) {
    return errorResponse(res, 400, 'Admin already exists');
  }

  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@heedy.com',
    password: 'password123',
    role: 'superadmin'
  });

  successResponse(res, 201, 'Test admin created successfully. You can now login.', {
    email: admin.email,
    password: 'password123'
  });
});

import { sendEmail } from '../utils/sendEmail';

export const registerCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone, addresses } = req.body;

  if (!name || !email || !password) {
    return errorResponse(res, 400, 'Please provide name, email and password');
  }

  let user = await User.findOne({ email });

  if (user) {
    if (user.isVerified) {
      return errorResponse(res, 400, 'Email is already registered');
    }
    // If not verified, we can overwrite the existing unverified account or just generate a new OTP
    user.name = name;
    user.password = password;
    user.phone = phone;
    user.addresses = addresses;
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  if (!user) {
    user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'customer',
      addresses,
      isVerified: false,
      otp,
      otpExpires
    });
  } else {
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();
  }

  // Send OTP email
  const message = `Your email verification code is: ${otp}\n\nIt expires in 10 minutes.`;
  await sendEmail({
    email: user.email,
    subject: 'Heedy Luxury - Verify your email',
    message
  });

  successResponse(res, 201, 'OTP sent to your email. Please verify to complete registration.', {
    email: user.email,
  });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return errorResponse(res, 400, 'Please provide email and OTP');
  }

  const user = await User.findOne({ email });

  if (!user) {
    return errorResponse(res, 404, 'User not found');
  }

  if (user.isVerified) {
    return errorResponse(res, 400, 'User is already verified');
  }

  if (user.otp !== otp) {
    return errorResponse(res, 400, 'Invalid OTP code');
  }

  if (user.otpExpires && user.otpExpires < new Date()) {
    return errorResponse(res, 400, 'OTP code has expired');
  }

  // Verify user
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  const token = generateToken(user._id.toString(), user.role);

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  successResponse(res, 200, 'Email verified successfully', {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token
  });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return errorResponse(res, 400, 'Please provide email');
  }

  const user = await User.findOne({ email });

  if (!user) {
    return errorResponse(res, 404, 'User not found');
  }

  if (user.isVerified) {
    return errorResponse(res, 400, 'User is already verified');
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();

  // Send OTP email
  const message = `Your new email verification code is: ${otp}\n\nIt expires in 10 minutes.`;
  await sendEmail({
    email: user.email,
    subject: 'Heedy Luxury - Verify your email',
    message
  });

  successResponse(res, 200, 'A new OTP has been sent to your email', null);
});

export const loginCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 400, 'Please provide email and password');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return errorResponse(res, 401, 'Invalid email or password');
  }

  if (!user.isVerified) {
    return errorResponse(res, 403, 'Please verify your email to continue. We have sent an OTP to your email during registration.');
  }

  if (!user.isActive) {
    return errorResponse(res, 403, 'Your account has been deactivated');
  }

  // Only allow customers to use this endpoint
  if (user.role !== 'customer') {
    return errorResponse(res, 403, 'Please use the admin portal to login');
  }

  const token = generateToken(user._id.toString(), user.role);

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  successResponse(res, 200, 'Login successful', {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token
  });
});
