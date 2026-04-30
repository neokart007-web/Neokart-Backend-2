import nodemailer from 'nodemailer';

export const sendEmail = async (options: { email: string; subject: string; message: string }) => {
  try {
    // We are using Gmail service by default, but it can be changed.
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const message = {
      from: `${process.env.FROM_NAME || 'Heedy Luxury'} <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    const info = await transporter.sendMail(message);
    console.log('Email sent successfully: %s', info.messageId);
    return info;
  } catch (err) {
    console.error('Failed to send email:', err);
    throw new Error('Failed to send email. Please check your SMTP settings in .env');
  }
};
