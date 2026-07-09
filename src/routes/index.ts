import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import categoryRoutes from './categoryRoutes';
import bannerRoutes from './bannerRoutes';
import userRoutes from './userRoutes';
import paymentRoutes from './paymentRoutes';
import cartRoutes from './cartRoutes';
import dashboardRoutes from './dashboardRoutes';
import faqRoutes from './faqRoutes';

const router = Router();

// Health Check
router.get('/health', checkHealth);

// Mount other routes here
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/banners', bannerRoutes);
router.use('/users', userRoutes);
router.use('/payments', paymentRoutes);
router.use('/cart', cartRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/faqs', faqRoutes);

export default router;
