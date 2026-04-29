import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import categoryRoutes from './categoryRoutes';
import bannerRoutes from './bannerRoutes';
import couponRoutes from './couponRoutes';
import testimonialRoutes from './testimonialRoutes';
import userRoutes from './userRoutes';

const router = Router();

// Health Check
router.get('/health', checkHealth);

// Mount other routes here
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/banners', bannerRoutes);
router.use('/coupons', couponRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/users', userRoutes);

export default router;
