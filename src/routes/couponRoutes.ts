import express from 'express';
import { createCoupon, getCoupons, deleteCoupon, updateCoupon, validateCoupon } from '../controllers/couponController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
  .post(protect, createCoupon)
  .get(getCoupons);

router.post('/validate', validateCoupon);

router.route('/:id')
  .put(protect, updateCoupon)
  .delete(protect, deleteCoupon);

export default router;
