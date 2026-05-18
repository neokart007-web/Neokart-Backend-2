import express from 'express';
import { getAddresses, addAddress, deleteAddress, editAddress, getAllCustomers, toggleCustomerStatus, updateProfile, getProfile } from '../controllers/userController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

router.route('/addresses')
  .get(protect, getAddresses)
  .post(protect, addAddress);

router.route('/addresses/:addressId')
  .put(protect, editAddress)
  .delete(protect, deleteAddress);

// Admin routes
router.get('/admin/customers', protect, authorize('admin', 'superadmin'), getAllCustomers);
router.put('/admin/customers/:id/toggle-status', protect, authorize('admin', 'superadmin'), toggleCustomerStatus);

export default router;
