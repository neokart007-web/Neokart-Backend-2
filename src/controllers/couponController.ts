import { Request, Response } from 'express';
import { Coupon } from '../models/Coupon';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/responseHandler';

export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, cartTotal } = req.body;
  
  if (!code) {
    return errorResponse(res, 400, 'Coupon code is required');
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    return errorResponse(res, 404, 'Invalid coupon code');
  }

  if (coupon.status !== 'ACTIVE') {
    return errorResponse(res, 400, 'Coupon is no longer active');
  }

  if (new Date(coupon.expiryDate) < new Date()) {
    return errorResponse(res, 400, 'Coupon has expired');
  }

  if (coupon.minPurchaseAmount && cartTotal < coupon.minPurchaseAmount) {
    return errorResponse(res, 400, `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required`);
  }

  // Parse discount: if it contains '%' it's a percentage, otherwise a flat amount
  let discountAmount = 0;
  if (coupon.discount.includes('%')) {
    const percent = parseFloat(coupon.discount.replace('%', ''));
    discountAmount = (cartTotal * percent) / 100;
  } else {
    // extract digits
    discountAmount = parseFloat(coupon.discount.replace(/[^0-9.-]+/g,""));
  }

  successResponse(res, 200, 'Coupon applied successfully', {
    code: coupon.code,
    discountAmount,
    discountText: coupon.discount
  });
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.create(req.body);
  successResponse(res, 201, 'Coupon created successfully', coupon);
});

export const getCoupons = asyncHandler(async (req: Request, res: Response) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).populate('applicableProducts', 'name');
  successResponse(res, 200, 'Coupons fetched successfully', coupons);
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  let coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return errorResponse(res, 404, 'Coupon not found');
  }
  coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  successResponse(res, 200, 'Coupon updated successfully', coupon);
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    return errorResponse(res, 404, 'Coupon not found');
  }
  successResponse(res, 200, 'Coupon deleted successfully', null);
});
