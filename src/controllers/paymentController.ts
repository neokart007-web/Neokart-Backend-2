import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order';
import { Product } from '../models/Product';
import { sendEmail } from '../utils/sendEmail';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

// Trim to guard against a stray space/newline pasted into the env value,
// which is a common cause of Razorpay "Authentication failed" errors.
const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || 'dummy_key_id').trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret').trim();

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Turns any thrown value (Razorpay SDK error, Error, string) into a readable
// reason so failures never surface as an opaque "Error creating order".
const describeError = (error: any): string => {
  if (error?.error?.description) return `Razorpay: ${error.error.description}`;
  if (error?.message) return error.message;
  if (error?.statusCode) return `Payment gateway error (status ${error.statusCode})`;
  try {
    const s = JSON.stringify(error);
    if (s && s !== '{}') return s;
  } catch { /* ignore */ }
  return 'Unknown payment gateway error';
};

// Sends the order confirmation email. Shared by both the online (Razorpay) and COD flows.
const sendOrderConfirmationEmail = async (user: any, order: any) => {
  try {
    if (!user || !user.email) {
      console.log('Skipping order confirmation email because user or user.email is missing.');
      return;
    }

    const autoLoginToken = jwt.sign(
      { id: user._id, role: user.role || 'customer' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const itemsHtml = order.items.map((item: any) => {
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

    await sendEmail({
      email: user.email,
      subject: 'Order Confirmation - Heedy',
      html: htmlMessage
    });
    console.log('Order confirmation email process completed without throwing errors.');
  } catch (emailErr) {
    console.error('Error sending confirmation email:', emailErr);
  }
};

// Cash on Delivery collects a 10% advance online; the rest is due on delivery.
const ADVANCE_RATE = 0.1;

// True only when real Razorpay credentials are configured.
const razorpayConfigured = (): boolean =>
  RAZORPAY_KEY_ID !== 'dummy_key_id' && RAZORPAY_KEY_SECRET !== 'dummy_key_secret';

// Recompute the authoritative order amounts from DB product prices.
// The client is never trusted for prices or totals — it only tells us which
// product/variant and quantity, and we price it ourselves.
const computeOrderAmounts = async (items: any[]) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No items in order');
  }

  let subtotal = 0;
  const normalizedItems: any[] = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new Error('One or more products could not be found');

    const variants = product.variants || [];
    // Cart "size" is the variant volume; fall back to the first variant
    // (items added from landing cards carry no size and used variants[0]).
    const variant =
      (item.size && variants.find((v: any) => v.volume === item.size)) || variants[0];
    if (!variant) throw new Error(`No price found for product: ${product.name}`);

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
export const createOrder = async (req: Request, res: Response) => {
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
    } else if (amountPaise < 100) {
      // Razorpay requires a minimum of ₹1 (100 paise).
      return res.status(400).json({
        success: false,
        message: 'Order amount is below the minimum payable amount.',
      });
    } else {
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
        key_id: RAZORPAY_KEY_ID, // Return the key used so the client can't mismatch
      },
    });
  } catch (error: any) {
    // Log the full detail server-side (Render logs) so the real reason is visible.
    console.error('Error creating order:', {
      statusCode: error?.statusCode,
      razorpay: error?.error,
      message: error?.message,
    });
    res.status(500).json({ success: false, message: describeError(error) });
  }
};

// Verify Payment — Saves order to DB only after payment is confirmed
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      shippingAddress,
      paymentMethod,
    } = req.body;

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
    } else {
      // 1) Signature must be authentic (proves the payment belongs to this order).
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
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
      } catch (err) {
        console.warn('Could not fetch razorpay payment object, falling back to order fetch:', err);
      }

      if (!isVerified) {
        try {
          const rzpOrder = await razorpayInstance.orders.fetch(razorpay_order_id);
          const paidPaise = Number(rzpOrder.amount_paid) || 0;
          if (rzpOrder.status === 'paid' || paidPaise === expectedPaise) {
            isVerified = true;
          }
        } catch (err) {
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
      const newOrder = new Order({
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
    } else {
      res.status(400).json({ success: false, message: "Invalid signature. Payment verification failed." });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', {
      statusCode: error?.statusCode,
      razorpay: error?.error,
      message: error?.message,
    });
    res.status(500).json({ success: false, message: describeError(error) });
  }
};

// Get My Orders
export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ user: req.user?._id })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching orders' });
  }
};

// Admin: Get a specific customer's order history
export const getCustomerOrders = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orders = await Order.find({ user: id })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching customer orders' });
  }
};

// Admin: Get All Orders
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .populate('items.product', 'name images variants')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching all orders' });
  }
};

// Admin: Update Order Status
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      { orderStatus },
      { new: true }
    ).populate('user', 'name email phone')
      .populate('items.product', 'name images variants');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Send Status Update Email
    try {
      const user = order.user as any;
      if (user && user.email) {
        const autoLoginToken = jwt.sign({ id: user._id, role: user.role || 'customer' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        let statusColor = '#3b82f6'; // default blue
        let statusMessage = "There is an update regarding your recent order.";
        let subject = `Order Status Update - Heedy`;

        if (orderStatus === 'processing') {
          statusColor = '#f59e0b'; // orange
          statusMessage = "Your order has been placed successfully and is now being processed.";
          subject = `Order Placed - Heedy`;
        } else if (orderStatus === 'shipped') {
          statusColor = '#3b82f6'; // blue
          statusMessage = "Great news! Your order has been shipped and is on its way to you.";
          subject = `Order Shipped - Heedy`;
        } else if (orderStatus === 'delivered') {
          statusColor = '#10b981'; // green
          statusMessage = "Your order has been delivered successfully. We hope you enjoy your purchase!";
          subject = `Order Delivered - Heedy`;
        } else if (orderStatus === 'cancelled') {
          statusColor = '#ef4444'; // red
          statusMessage = "Your order has been cancelled. If you have been charged, a refund will be initiated shortly.";
          subject = `Order Cancelled - Heedy`;
        }

        const itemsHtml = order.items.map((item: any) => {
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
        await sendEmail({
          email: user.email,
          subject: subject,
          html: htmlMessage
        });
      } else {
        console.warn(`Skipping email for order ${order._id} because user email is missing.`);
      }
    } catch (emailErr) {
      console.error('Error sending status update email:', emailErr);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating order status' });
  }
};
