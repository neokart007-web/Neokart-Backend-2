import express from 'express';
import { createOrder, verifyPayment, createCodOrder, getMyOrders, getAllOrders, updateOrderStatus } from '../controllers/paymentController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/cod-order', protect, createCodOrder);
router.get('/myorders', protect, getMyOrders);

// Admin routes
router.get('/admin/orders', protect, authorize('admin', 'superadmin'), getAllOrders);
router.put('/admin/orders/:id/status', protect, authorize('admin', 'superadmin'), updateOrderStatus);

export default router;
