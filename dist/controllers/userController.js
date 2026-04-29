"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAddress = exports.getAddresses = void 0;
const User_1 = require("../models/User");
const asyncHandler_1 = require("../utils/asyncHandler");
const responseHandler_1 = require("../utils/responseHandler");
exports.getAddresses = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.User.findById(req.user?._id);
    if (!user)
        return (0, responseHandler_1.errorResponse)(res, 404, 'User not found');
    (0, responseHandler_1.successResponse)(res, 200, 'Addresses fetched successfully', user.addresses || []);
});
exports.addAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.User.findById(req.user?._id);
    if (!user)
        return (0, responseHandler_1.errorResponse)(res, 404, 'User not found');
    if (!user.addresses) {
        user.addresses = [];
    }
    const { street, city, state, zipCode, country } = req.body;
    if (!city || !state) {
        return (0, responseHandler_1.errorResponse)(res, 400, 'City and State are required');
    }
    user.addresses.push({ street, city, state, zipCode, country });
    await user.save();
    (0, responseHandler_1.successResponse)(res, 201, 'Address added successfully', user.addresses);
});
//# sourceMappingURL=userController.js.map