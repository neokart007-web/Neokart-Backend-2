import { Request, Response } from 'express';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';

export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) return errorResponse(res, 404, 'User not found');
  
  successResponse(res, 200, 'Addresses fetched successfully', user.addresses || []);
});

export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) return errorResponse(res, 404, 'User not found');

  if (!user.addresses) {
    user.addresses = [];
  }
  
  const { street, city, state, zipCode, country } = req.body;
  
  if (!city || !state) {
    return errorResponse(res, 400, 'City and State are required');
  }

  user.addresses.push({ street, city, state, zipCode, country });
  await user.save();
  
  successResponse(res, 201, 'Address added successfully', user.addresses);
});
