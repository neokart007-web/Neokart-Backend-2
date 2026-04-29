"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCoupon = exports.updateCoupon = exports.getCoupons = exports.createCoupon = exports.validateCoupon = void 0;
const Coupon_1 = require("../models/Coupon");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
exports.validateCoupon = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { code, cartTotal } = req.body;
    if (!code) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Coupon code is required');
    }
    const coupon = await Coupon_1.Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Invalid coupon code');
    }
    if (coupon.status !== 'ACTIVE') {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Coupon is no longer active');
    }
    if (new Date(coupon.expiryDate) < new Date()) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'Coupon has expired');
    }
    if (coupon.minPurchaseAmount && cartTotal < coupon.minPurchaseAmount) {
        return (0, responseHandler_1.errorResponse)(res, 400, `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required`);
    }
    // Parse discount: if it contains '%' it's a percentage, otherwise a flat amount
    let discountAmount = 0;
    if (coupon.discount.includes('%')) {
        const percent = parseFloat(coupon.discount.replace('%', ''));
        discountAmount = (cartTotal * percent) / 100;
    }
    else {
        // extract digits
        discountAmount = parseFloat(coupon.discount.replace(/[^0-9.-]+/g, ""));
    }
    (0, responseHandler_1.successResponse)(res, 200, 'Coupon applied successfully', {
        code: coupon.code,
        discountAmount,
        discountText: coupon.discount
    });
});
exports.createCoupon = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const coupon = await Coupon_1.Coupon.create(req.body);
    (0, responseHandler_1.successResponse)(res, 201, 'Coupon created successfully', coupon);
});
exports.getCoupons = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const coupons = await Coupon_1.Coupon.find().sort({ createdAt: -1 }).populate('applicableProducts', 'name');
    (0, responseHandler_1.successResponse)(res, 200, 'Coupons fetched successfully', coupons);
});
exports.updateCoupon = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    let coupon = await Coupon_1.Coupon.findById(req.params.id);
    if (!coupon) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Coupon not found');
    }
    coupon = await Coupon_1.Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    (0, responseHandler_1.successResponse)(res, 200, 'Coupon updated successfully', coupon);
});
exports.deleteCoupon = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const coupon = await Coupon_1.Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
        return (0, responseHandler_1.errorResponse)(res, 404, 'Coupon not found');
    }
    (0, responseHandler_1.successResponse)(res, 200, 'Coupon deleted successfully', null);
});
//# sourceMappingURL=couponController.js.map