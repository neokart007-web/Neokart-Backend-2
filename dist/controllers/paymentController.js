"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getAllOrders = exports.getCustomerOrders = exports.getMyOrders = exports.verifyPayment = exports.createOrder = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = require("../models/Product");
const sendEmail_1 = require("../utils/sendEmail");
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const razorpayInstance = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret',
});
// Sends the order confirmation email. Shared by both the online (Razorpay) and COD flows.
const sendOrderConfirmationEmail = async (user, order) => {
    try {
        if (!user || !user.email) {
            console.log('Skipping order confirmation email because user or user.email is missing.');
            return;
        }
        const autoLoginToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role || 'customer' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        const itemsHtml = order.items.map((item) => {
            const product = item.product;
            return `
        <tr>
          <td style="padding: 15px 10px; border-bottom: 1px solid #eaeaea;">
            <p style="margin: 0; font-weight: bold; color: #111827; font-size: 15px;">${product?.name || 'Product'}</p>
            <p style="margin: 5px 0 0; color: #6b7280; font-size: 13px;">Qty: ${item.quantity}</p>
          </td>
          <td style="padding: 15px 0; border-bottom: 1px solid #eaeaea; text-align: right;">
            <p style="margin: 0; font-weight: bold; color: #111827; font-size: 15px;">₹${item.price}</p>
          </td>
        </tr>
      `;
        }).join('');
        const isCod = order.paymentMethod === 'cod';
        const paymentLine = isCod
            ? `<p style="margin: 10px 0 0 0; color: #374151; font-size: 15px;"><strong>Payment:</strong> <span style="color: #111827;">Cash on Delivery</span></p>
         <p style="margin: 6px 0 0 0; color: #374151; font-size: 14px;">Advance paid: <span style="color: #10b981; font-weight: bold;">₹${order.advanceAmount}</span> &nbsp;·&nbsp; Balance due on delivery: <span style="color: #111827; font-weight: bold;">₹${order.balanceAmount}</span></p>`
            : '';
        const htmlMessage = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #111827; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">Heedy</h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #111827; font-size: 20px; margin-top: 0; margin-bottom: 20px;">Order Confirmation</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${user.name}</strong>,<br><br>
            Thank you for your purchase! Your order has been placed successfully and is now being processed.
          </p>
          <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #374151; font-size: 15px;"><strong>Order ID:</strong> <span style="color: #111827;">${order._id}</span></p>
            <p style="margin: 0; color: #374151; font-size: 15px;"><strong>Order Date:</strong> <span style="color: #111827;">${String(order.createdAt?.getDate() || new Date().getDate()).padStart(2, '0')}/${String((order.createdAt?.getMonth() || new Date().getMonth()) + 1).padStart(2, '0')}/${order.createdAt?.getFullYear() || new Date().getFullYear()}</span></p>
            ${paymentLine}
          </div>

          <h3 style="color: #111827; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding-bottom: 10px; color: #6b7280; font-size: 14px;">Subtotal:</td>
                <td style="padding-bottom: 10px; color: #111827; font-weight: bold; font-size: 14px; text-align: right;">₹${order.subtotal}</td>
              </tr>
              ${order.discount > 0 ? `
              <tr>
                <td style="padding-bottom: 10px; color: #6b7280; font-size: 14px;">Discount:</td>
                <td style="padding-bottom: 10px; color: #10b981; font-weight: bold; font-size: 14px; text-align: right;">-₹${order.discount}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding-bottom: 15px; color: #6b7280; font-size: 14px;">Shipping:</td>
                <td style="padding-bottom: 15px; color: #111827; font-weight: bold; font-size: 14px; text-align: right;">${order.shippingFee > 0 ? `₹${order.shippingFee}` : 'Free'}</td>
              </tr>
              <tr>
                <td style="padding-top: 15px; border-top: 1px solid #eaeaea; color: #111827; font-weight: bold; font-size: 16px;">Total:</td>
                <td style="padding-top: 15px; border-top: 1px solid #eaeaea; color: #111827; font-weight: bold; font-size: 18px; text-align: right;">₹${order.total}</td>
              </tr>
            </table>
          </div>

          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
            We will send you another email once your order has been shipped. If you have any questions, feel free to reply to this email.
          </p>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'https://heedy-frontend.vercel.app'}/profile?token=${autoLoginToken}" style="background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">View Order Details</a>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">© ${new Date().getFullYear()} Heedy. All rights reserved.</p>
        </div>
      </div>
    `;
        await (0, sendEmail_1.sendEmail)({
            email: user.email,
            subject: 'Order Confirmation - Heedy',
            html: htmlMessage
        });
        console.log('Order confirmation email process completed without throwing errors.');
    }
    catch (emailErr) {
        console.error('Error sending confirmation email:', emailErr);
    }
};
// Cash on Delivery collects a 10% advance online; the rest is due on delivery.
const ADVANCE_RATE = 0.1;
// True only when real Razorpay credentials are configured.
const razorpayConfigured = () => !!process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_ID !== 'dummy_key_id' &&
    !!process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_KEY_SECRET !== 'dummy_key_secret';
// Recompute the authoritative order amounts from DB product prices.
// The client is never trusted for prices or totals — it only tells us which
// product/variant and quantity, and we price it ourselves.
const computeOrderAmounts = async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('No items in order');
    }
    let subtotal = 0;
    const normalizedItems = [];
    for (const item of items) {
        const product = await Product_1.Product.findById(item.product);
        if (!product)
            throw new Error('One or more products could not be found');
        const variants = product.variants || [];
        // Cart "size" is the variant volume; fall back to the first variant
        // (items added from landing cards carry no size and used variants[0]).
        const variant = (item.size && variants.find((v) => v.volume === item.size)) || variants[0];
        if (!variant)
            throw new Error(`No price found for product: ${product.name}`);
        const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
        subtotal += variant.price * quantity;
        normalizedItems.push({
            product: product._id,
            quantity,
            price: variant.price,
            size: item.size || variant.volume,
        });
    }
    // No server-side discount or shipping rules exist yet, so both are fixed at 0.
    const discount = 0;
    const shippingFee = 0;
    const total = Math.round((subtotal - discount + shippingFee) * 100) / 100;
    const advanceAmount = Math.round(total * ADVANCE_RATE * 100) / 100;
    const balanceAmount = Math.round((total - advanceAmount) * 100) / 100;
    return { subtotal, discount, shippingFee, total, advanceAmount, balanceAmount, items: normalizedItems };
};
// Create Order — prices the order from the DB and creates a Razorpay order for
// the amount to collect now. Does NOT save to our DB yet (that happens only
// after the payment is verified).
const createOrder = async (req, res) => {
    try {
        const { items, paymentMethod } = req.body;
        const isCod = paymentMethod === 'cod';
        const { total, advanceAmount } = await computeOrderAmounts(items);
        const chargeAmount = isCod ? advanceAmount : total;
        const amountPaise = Math.round(chargeAmount * 100);
        let razorpayOrder;
        let isMock = false;
        if (!razorpayConfigured()) {
            // Never silently mock in production — that would accept "orders" for no money.
            if (process.env.NODE_ENV === 'production') {
                return res.status(503).json({
                    success: false,
                    message: 'Payment gateway is not configured. Please try again later.',
                });
            }
            razorpayOrder = { id: `mock_order_${Date.now()}`, amount: amountPaise, currency: 'INR' };
            isMock = true;
        }
        else if (amountPaise < 100) {
            // Razorpay requires a minimum of ₹1 (100 paise).
            return res.status(400).json({
                success: false,
                message: 'Order amount is below the minimum payable amount.',
            });
        }
        else {
            razorpayOrder = await razorpayInstance.orders.create({
                amount: amountPaise,
                currency: 'INR',
                receipt: `receipt_order_${Date.now()}`,
            });
        }
        res.status(200).json({
            success: true,
            data: {
                razorpayOrder,
                isMock,
                key_id: process.env.RAZORPAY_KEY_ID, // Return the key used so the client can't mismatch
            },
        });
    }
    catch (error) {
        console.error('Error creating order:', error);
        const message = error.error?.description || error.message || 'Error creating order';
        res.status(500).json({ success: false, message });
    }
};
exports.createOrder = createOrder;
// Verify Payment — Saves order to DB only after payment is confirmed
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, shippingAddress, paymentMethod, } = req.body;
        // 'cod' means only the 10% advance was paid online; the balance is due on delivery.
        const isCod = paymentMethod === 'cod';
        // Re-price the order from the DB — client-sent subtotal/total/prices are ignored.
        const amounts = await computeOrderAmounts(items);
        const expectedCharge = isCod ? amounts.advanceAmount : amounts.total;
        const expectedPaise = Math.round(expectedCharge * 100);
        let paymentVerified = false;
        if (!razorpayConfigured() && process.env.NODE_ENV !== 'production' && razorpay_payment_id === 'mock_payment') {
            // Mock flow is allowed ONLY in non-production when no real keys are set.
            paymentVerified = true;
        }
        else {
            // 1) Signature must be authentic (proves the payment belongs to this order).
            const sign = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSign = crypto_1.default
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || '')
                .update(sign.toString())
                .digest("hex");
            if (razorpay_signature !== expectedSign) {
                return res.status(400).json({ success: false, message: "Invalid signature. Payment verification failed." });
            }
            // 2) Verify payment details directly with Razorpay API (handles both payment and order object status).
            let isVerified = false;
            try {
                const rzpPayment = await razorpayInstance.payments.fetch(razorpay_payment_id);
                const paymentAmount = Number(rzpPayment.amount) || 0;
                const validStatus = ['captured', 'authorized'].includes(rzpPayment.status);
                if (rzpPayment.order_id === razorpay_order_id && paymentAmount === expectedPaise && validStatus) {
                    isVerified = true;
                }
            }
            catch (err) {
                console.warn('Could not fetch razorpay payment object, falling back to order fetch:', err);
            }
            if (!isVerified) {
                try {
                    const rzpOrder = await razorpayInstance.orders.fetch(razorpay_order_id);
                    const paidPaise = Number(rzpOrder.amount_paid) || 0;
                    if (rzpOrder.status === 'paid' || paidPaise === expectedPaise) {
                        isVerified = true;
                    }
                }
                catch (err) {
                    console.warn('Could not fetch razorpay order object:', err);
                }
            }
            if (!isVerified) {
                return res.status(400).json({ success: false, message: "Payment amount or status mismatch. Order was not placed." });
            }
            paymentVerified = true;
        }
        if (paymentVerified) {
            // Payment confirmed — save the order using server-computed amounts only.
            const newOrder = new Order_1.default({
                user: req.user?._id,
                items: amounts.items,
                shippingAddress,
                subtotal: amounts.subtotal,
                discount: amounts.discount,
                shippingFee: amounts.shippingFee,
                total: amounts.total,
                paymentMethod: isCod ? 'cod' : 'razorpay',
                // COD advance is paid, but the full amount isn't settled until the balance is collected.
                advanceAmount: isCod ? amounts.advanceAmount : 0,
                balanceAmount: isCod ? amounts.balanceAmount : 0,
                paymentStatus: isCod ? 'pending' : 'completed',
                orderStatus: 'processing',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_payment_id === 'mock_payment' ? 'mock_signature' : razorpay_signature,
            });
            await newOrder.save();
            await newOrder.populate('items.product', 'name images variants');
            // Send Order Confirmation Email
            await sendOrderConfirmationEmail(req.user, newOrder);
            res.status(200).json({
                success: true,
                message: "Payment verified and order placed successfully",
                data: newOrder
            });
        }
        else {
            res.status(400).json({ success: false, message: "Invalid signature. Payment verification failed." });
        }
    }
    catch (error) {
        console.error('Error verifying payment:', error);
        const message = error.error?.description || error.message || 'Error verifying payment';
        res.status(500).json({ success: false, message });
    }
};
exports.verifyPayment = verifyPayment;
// Get My Orders
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order_1.default.find({ user: req.user?._id })
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, message: error.message || 'Error fetching orders' });
    }
};
exports.getMyOrders = getMyOrders;
// Admin: Get a specific customer's order history
const getCustomerOrders = async (req, res) => {
    try {
        const { id } = req.params;
        const orders = await Order_1.default.find({ user: id })
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    }
    catch (error) {
        console.error('Error fetching customer orders:', error);
        res.status(500).json({ success: false, message: error.message || 'Error fetching customer orders' });
    }
};
exports.getCustomerOrders = getCustomerOrders;
// Admin: Get All Orders
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order_1.default.find()
            .populate('user', 'name email phone')
            .populate('items.product', 'name images variants')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    }
    catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ success: false, message: error.message || 'Error fetching all orders' });
    }
};
exports.getAllOrders = getAllOrders;
// Admin: Update Order Status
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body;
        const order = await Order_1.default.findByIdAndUpdate(id, { orderStatus }, { new: true }).populate('user', 'name email phone')
            .populate('items.product', 'name images variants');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        // Send Status Update Email
        try {
            const user = order.user;
            if (user && user.email) {
                const autoLoginToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role || 'customer' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
                let statusColor = '#3b82f6'; // default blue
                let statusMessage = "There is an update regarding your recent order.";
                let subject = `Order Status Update - Heedy`;
                if (orderStatus === 'processing') {
                    statusColor = '#f59e0b'; // orange
                    statusMessage = "Your order has been placed successfully and is now being processed.";
                    subject = `Order Placed - Heedy`;
                }
                else if (orderStatus === 'shipped') {
                    statusColor = '#3b82f6'; // blue
                    statusMessage = "Great news! Your order has been shipped and is on its way to you.";
                    subject = `Order Shipped - Heedy`;
                }
                else if (orderStatus === 'delivered') {
                    statusColor = '#10b981'; // green
                    statusMessage = "Your order has been delivered successfully. We hope you enjoy your purchase!";
                    subject = `Order Delivered - Heedy`;
                }
                else if (orderStatus === 'cancelled') {
                    statusColor = '#ef4444'; // red
                    statusMessage = "Your order has been cancelled. If you have been charged, a refund will be initiated shortly.";
                    subject = `Order Cancelled - Heedy`;
                }
                const itemsHtml = order.items.map((item) => {
                    const product = item.product;
                    return `
            <tr>
              <td style="padding: 15px 10px; border-bottom: 1px solid #eaeaea;">
                <p style="margin: 0; font-weight: bold; color: #111827; font-size: 15px;">${product?.name || 'Product'}</p>
                <p style="margin: 5px 0 0; color: #6b7280; font-size: 13px;">Qty: ${item.quantity}</p>
              </td>
              <td style="padding: 15px 0; border-bottom: 1px solid #eaeaea; text-align: right;">
                <p style="margin: 0; font-weight: bold; color: #111827; font-size: 15px;">₹${item.price}</p>
              </td>
            </tr>
          `;
                }).join('');
                const htmlMessage = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
              <div style="background-color: #111827; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">Heedy</h1>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="color: #111827; font-size: 20px; margin-top: 0; margin-bottom: 20px;">Order Status Update</h2>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear <strong>${user.name}</strong>,<br><br>
                  ${statusMessage}
                </p>
                <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #374151; font-size: 15px;"><strong>Order ID:</strong> <span style="color: #111827;">${order._id}</span></p>
                  <p style="margin: 0 0 10px 0; color: #374151; font-size: 15px;"><strong>Order Date:</strong> <span style="color: #111827;">${String(new Date(order.createdAt).getDate()).padStart(2, '0')}/${String(new Date(order.createdAt).getMonth() + 1).padStart(2, '0')}/${new Date(order.createdAt).getFullYear()}</span></p>
                  <p style="margin: 0; color: #374151; font-size: 15px;">Current Status:</p>
                  <div style="display: inline-block; background-color: ${statusColor}15; color: ${statusColor}; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 16px; text-transform: uppercase; margin-top: 10px; border: 1px solid ${statusColor}40;">
                    ${orderStatus}
                  </div>
                </div>

                <h3 style="color: #111827; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Order Details</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
                
                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding-bottom: 10px; color: #6b7280; font-size: 14px;">Subtotal:</td>
                      <td style="padding-bottom: 10px; color: #111827; font-weight: bold; font-size: 14px; text-align: right;">₹${order.subtotal}</td>
                    </tr>
                    ${order.discount > 0 ? `
                    <tr>
                      <td style="padding-bottom: 10px; color: #6b7280; font-size: 14px;">Discount:</td>
                      <td style="padding-bottom: 10px; color: #10b981; font-weight: bold; font-size: 14px; text-align: right;">-₹${order.discount}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding-bottom: 15px; color: #6b7280; font-size: 14px;">Shipping:</td>
                      <td style="padding-bottom: 15px; color: #111827; font-weight: bold; font-size: 14px; text-align: right;">${order.shippingFee > 0 ? `₹${order.shippingFee}` : 'Free'}</td>
                    </tr>
                    <tr>
                      <td style="padding-top: 15px; border-top: 1px solid #eaeaea; color: #111827; font-weight: bold; font-size: 16px;">Total:</td>
                      <td style="padding-top: 15px; border-top: 1px solid #eaeaea; color: #111827; font-weight: bold; font-size: 18px; text-align: right;">₹${order.total}</td>
                    </tr>
                  </table>
                </div>

                <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
                  Thank you for shopping with Heedy. If you have any questions, feel free to reply to this email.
                </p>
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'https://heedy-frontend.vercel.app'}/profile?token=${autoLoginToken}" style="background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">View Order History</a>
                </div>
              </div>
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="color: #9ca3af; font-size: 13px; margin: 0;">© ${new Date().getFullYear()} Heedy Luxury. All rights reserved.</p>
              </div>
            </div>
        `;
                await (0, sendEmail_1.sendEmail)({
                    email: user.email,
                    subject: subject,
                    html: htmlMessage
                });
            }
            else {
                console.warn(`Skipping email for order ${order._id} because user email is missing.`);
            }
        }
        catch (emailErr) {
            console.error('Error sending status update email:', emailErr);
        }
        res.status(200).json({ success: true, data: order });
    }
    catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: error.message || 'Error updating order status' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
//# sourceMappingURL=paymentController.js.map