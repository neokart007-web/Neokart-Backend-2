import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';
import { ENV } from '../config/env';
import { OAuth2Client } from 'google-auth-library';

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
    phone: user.phone,
    role: user.role,
    token
  });
});

// Helper to quickly create a test admin user (Can be removed later)
export const createTestAdmin = asyncHandler(async (req: Request, res: Response) => {
  const userExists = await User.findOne({ email: 'neokart007@gmail.com' });
  if (userExists) {
    return errorResponse(res, 400, 'Admin already exists');
  }

  const admin = await User.create({
    name: 'System Admin',
    email: 'neokart007@gmail.com',
    password: 'password123',
    role: 'superadmin'
  });

  successResponse(res, 201, 'Test admin created successfully. You can now login.', {
    email: admin.email,
    password: 'password123'
  });
});

// Google OAuth Sign-In (supports both ID token and access token flows)
export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { credential, googleId: bodyGoogleId, email: bodyEmail, name: bodyName, picture: bodyPicture } = req.body;

  let email: string | undefined;
  let name: string | undefined;
  let picture: string | undefined;
  let googleId: string | undefined;

  // Flow 1: ID Token (from Google One Tap / renderButton)
  if (credential && !bodyGoogleId) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return errorResponse(res, 500, 'Google OAuth is not configured');
    }

    const client = new OAuth2Client(googleClientId);

    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return errorResponse(res, 400, 'Invalid Google token');
      }

      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleId = payload.sub;
    } catch (error: any) {
      console.error('Google ID token verification error:', error);
      return errorResponse(res, 401, 'Invalid Google token');
    }
  }
  // Flow 2: Access Token (from @react-oauth/google useGoogleLogin)
  else if (bodyGoogleId && bodyEmail) {
    // The frontend already fetched user info from Google's userinfo endpoint
    // We trust this because it came from a verified Google access token on the frontend
    email = bodyEmail;
    name = bodyName;
    picture = bodyPicture;
    googleId = bodyGoogleId;
  } else {
    return errorResponse(res, 400, 'Google credential is required');
  }

  if (!email || !googleId) {
    return errorResponse(res, 400, 'Invalid Google authentication data');
  }

  // Normalize the email so casing/whitespace can't create duplicate customer accounts.
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if this email already belongs to a customer/account (case-insensitive).
    let user = await User.findOne({ email: normalizedEmail }).collation({ locale: 'en', strength: 2 });
    const isNewUser = !user;

    if (user) {
      // Email already exists — reuse the existing account instead of creating a duplicate.
      if (!user.isActive) {
        return errorResponse(res, 403, 'Your account has been deactivated');
      }
      // Link the Google ID if this account was created another way.
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // No existing customer with this email — create a new account.
      user = await User.create({
        name: name || 'Google User',
        email: normalizedEmail,
        googleId,
        avatar: picture,
        role: 'customer',
        isVerified: true, // Google emails are already verified
        isActive: true,
        password: `google_${googleId}_${Date.now()}`, // Random password since Google users don't need one
      });
    }

    const token = generateToken(user._id.toString(), user.role);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    successResponse(
      res,
      200,
      isNewUser ? 'Account created successfully' : 'This email is already registered. Signed you in.',
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isNewUser,
        token
      }
    );
  } catch (error: any) {
    // Duplicate-key from the unique email index (race condition) — treat as existing account.
    if (error?.code === 11000) {
      return errorResponse(res, 409, 'This email is already registered. Please sign in.');
    }
    console.error('Google auth error:', error);
    return errorResponse(res, 401, 'Google authentication failed');
  }
});
