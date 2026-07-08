// Email configuration interface
interface EmailOptions {
  email: string;
  subject: string;
  message?: string;
  html?: string;
}

/**
 * Email sending is currently disabled.
 *
 * This is a no-op stub that keeps the same API as before so existing callers
 * (auth and payment controllers) continue to work without changes. Instead of
 * dispatching an email it logs the attempt. Swap this implementation for a real
 * provider (SMTP/nodemailer, etc.) when email delivery is needed again.
 *
 * @param options - Email options (recipient, subject, content)
 * @returns Promise resolving to a disabled-provider result
 */
export const sendEmail = async (options: EmailOptions): Promise<any> => {
  // Validate email address to preserve previous behavior for callers.
  if (!options.email || !options.email.includes('@')) {
    throw new Error('Invalid recipient email address');
  }

  console.log('📭 Email sending is disabled. Skipping email:', {
    to: options.email,
    subject: options.subject,
  });

  return {
    success: true,
    provider: 'disabled',
    skipped: true,
  };
};

/**
 * Verify email connection (always reports disabled).
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  console.log('📭 Email sending is disabled');
  return false;
};

/**
 * Close email connection (no-op, kept for compatibility).
 */
export const closeEmailConnection = (): void => {
  // No-op — email sending is disabled.
};
