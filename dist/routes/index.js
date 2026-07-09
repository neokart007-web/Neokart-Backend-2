"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthController_1 = require("../controllers/healthController");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const productRoutes_1 = __importDefault(require("./productRoutes"));
const categoryRoutes_1 = __importDefault(require("./categoryRoutes"));
const bannerRoutes_1 = __importDefault(require("./bannerRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes"));
const paymentRoutes_1 = __importDefault(require("./paymentRoutes"));
const cartRoutes_1 = __importDefault(require("./cartRoutes"));
const dashboardRoutes_1 = __importDefault(require("./dashboardRoutes"));
const faqRoutes_1 = __importDefault(require("./faqRoutes"));
const router = (0, express_1.Router)();
// Health Check
router.get('/health', healthController_1.checkHealth);
// Mount other routes here
router.use('/auth', authRoutes_1.default);
router.use('/products', productRoutes_1.default);
router.use('/categories', categoryRoutes_1.default);
router.use('/banners', bannerRoutes_1.default);
router.use('/users', userRoutes_1.default);
router.use('/payments', paymentRoutes_1.default);
router.use('/cart', cartRoutes_1.default);
router.use('/dashboard', dashboardRoutes_1.default);
router.use('/faqs', faqRoutes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map