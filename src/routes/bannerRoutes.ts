import express from 'express';
import { createBanner, getBanners, deleteBanner, updateBanner } from '../controllers/bannerController';
import { protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

router.route('/')
  .post(protect, upload.single('image'), createBanner)
  .get(getBanners);

router.route('/:id')
  .put(protect, upload.single('image'), updateBanner)
  .delete(protect, deleteBanner);

export default router;
