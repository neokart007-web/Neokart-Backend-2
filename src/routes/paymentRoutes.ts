import express from 'express';
import { createOrder, verifyPayment, getMyOrders, getAllOrders, updateOrderStatus } from '../controllers/paymentController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/myorders', protect, getMyOrders);

// Admin routes
router.get('/admin/orders', protect, authorize('admin', 'superadmin'), getAllOrders);
router.put('/admin/orders/:id/status', protect, authorize('admin', 'superadmin'), updateOrderStatus);

export default router;
