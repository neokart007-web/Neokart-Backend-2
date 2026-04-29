import express from 'express';
import { getAddresses, addAddress } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/addresses')
  .get(protect, getAddresses)
  .post(protect, addAddress);

export default router;
