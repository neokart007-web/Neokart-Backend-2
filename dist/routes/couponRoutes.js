"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const couponController_1 = require("../controllers/couponController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .post(authMiddleware_1.protect, couponController_1.createCoupon)
    .get(couponController_1.getCoupons);
router.post('/validate', couponController_1.validateCoupon);
router.route('/:id')
    .put(authMiddleware_1.protect, couponController_1.updateCoupon)
    .delete(authMiddleware_1.protect, couponController_1.deleteCoupon);
exports.default = router;
//# sourceMappingURL=couponRoutes.js.map