import { Router } from 'express';
import { loginAdmin, createTestAdmin, registerCustomer, loginCustomer, verifyOtp, resendOtp } from '../controllers/authController';

const router = Router();

router.post('/login', loginAdmin);
router.post('/customer-login', loginCustomer);
router.post('/register', registerCustomer);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/setup-test-admin', createTestAdmin); // Can be called once to generate an admin

export default router;
