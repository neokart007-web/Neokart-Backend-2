"use strict";
// Alternative email implementation using SendGrid
// To use this: npm install @sendgrid/mail
// Then replace sendEmail.ts with this file
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
mail_1.default.setApiKey(process.env.SENDGRID_API_KEY || '');
const sendEmail = async (options) => {
    try {
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'neokart007@gmail.com';
        const fromName = process.env.FROM_NAME || 'Heedy';
        const msg = {
            to: options.email,
            from: {
                email: fromEmail,
                name: fromName,
            },
            subject: options.subject,
            text: options.message || '',
            html: options.html || options.message || '',
        };
        const response = await mail_1.default.send(msg);
        console.log('Email sent successfully via SendGrid:', response[0].statusCode);
        return response;
    }
    catch (err) {
        console.error('Failed to send email via SendGrid:', err);
        if (err.response) {
            console.error('SendGrid error details:', err.response.body);
        }
        throw new Error(err.message || 'Failed to send email. Please check your SendGrid API key in .env');
    }
};
exports.sendEmail = sendEmail;
//# sourceMappingURL=sendEmailSendGrid.js.map