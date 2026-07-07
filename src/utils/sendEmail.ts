import sgMail from '@sendgrid/mail';

// Email configuration interface
interface EmailOptions {
  email: string;
  subject: string;
  message?: string;
  html?: string;
}

// Initialize SendGrid
const initSendGrid = (): void => {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } else {
    console.warn('⚠️ SENDGRID_API_KEY is not configured');
  }
};

// Initialize early
initSendGrid();

/**
 * Send email using SendGrid
 * 
 * @param options - Email options (recipient, subject, content)
 * @returns Promise with email send result
 */
export const sendEmail = async (options: EmailOptions): Promise<any> => {
  // Use SENDGRID_FROM_EMAIL if set, otherwise fallback or error
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'neokart007@gmail.com';
  const fromName = process.env.FROM_NAME || 'Heedy';

  // Validate email address
  if (!options.email || !options.email.includes('@')) {
    throw new Error('Invalid recipient email address');
  }

  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  const msg: any = {
    to: options.email,
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject: options.subject,
  };

  // SendGrid requires at least one non-empty content block.
  // We'll always provide both text and html to be safe.
  msg.text = options.message || 'Please view this email in a modern email client that supports HTML.';
  
  if (options.html) {
    msg.html = options.html;
  } else if (options.message) {
    msg.html = `<p>${options.message}</p>`;
  } else {
    msg.html = `<p>Please view this email in a modern email client that supports HTML.</p>`;
  }

  try {
    const response = await sgMail.send(msg);

    console.log('✅ Email sent via SendGrid:', {
      to: options.email,
      subject: options.subject,
      statusCode: response[0].statusCode,
    });

    return {
      success: true,
      provider: 'sendgrid',
      statusCode: response[0].statusCode,
    };
  } catch (error: any) {
    console.error('❌ Failed to send email via SendGrid:', {
      error: error.response?.body ? JSON.stringify(error.response.body, null, 2) : error.message,
      to: options.email,
      subject: options.subject,
    });
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

/**
 * Verify email connection
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  const isConfigured = !!process.env.SENDGRID_API_KEY;
  if (isConfigured) {
    console.log('✅ SendGrid API Key is configured');
  } else {
    console.log('❌ SendGrid API Key is MISSING');
  }
  return isConfigured;
};

/**
 * Close email connection (Not needed for SendGrid, kept for compatibility if used elsewhere)
 */
export const closeEmailConnection = (): void => {
  // No-op for SendGrid
  console.log('📧 SendGrid does not require connection closing');
};
