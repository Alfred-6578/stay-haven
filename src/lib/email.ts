import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@stayhaven.com";
const FROM_NAME = process.env.FROM_NAME || "StayHaven";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function welcomeEmail(user: {
  firstName: string;
  email: string;
}): Promise<boolean> {
  return sendEmail({
    to: user.email,
    subject: "Welcome to StayHaven!",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B1B3A;">Welcome to StayHaven, ${user.firstName}!</h1>
        <p>Thank you for creating an account with us. We're excited to have you as part of the StayHaven family.</p>
        <p>You can now browse our rooms, make reservations, and enjoy our premium hotel services.</p>
        <p style="margin-top: 30px; color: #666;">— The StayHaven Team</p>
      </div>
    `,
  });
}

export async function inviteEmail(
  email: string,
  inviteLink: string,
  role: string,
  invitedByName: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "You've been invited to join StayHaven",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B1B3A;">You're Invited!</h1>
        <p>${invitedByName} has invited you to join StayHaven as a <strong>${role}</strong>.</p>
        <p>Click the button below to accept your invitation and set up your account:</p>
        <a href="${inviteLink}" style="display: inline-block; background: #D97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Accept Invitation</a>
        <p style="color: #999; font-size: 14px;">This invitation will expire in 48 hours.</p>
        <p style="margin-top: 30px; color: #666;">— The StayHaven Team</p>
      </div>
    `,
  });
}

export async function bookingConfirmationEmail(
  user: { firstName: string; email: string },
  booking: {
    bookingRef: string;
    checkIn: Date;
    checkOut: Date;
    totalAmount: number | string;
  },
  roomType: string
): Promise<boolean> {
  const checkIn = new Date(booking.checkIn).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const checkOut = new Date(booking.checkOut).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return sendEmail({
    to: user.email,
    subject: `Booking Confirmed — ${booking.bookingRef}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B1B3A;">Booking Confirmed!</h1>
        <p>Hello ${user.firstName}, your reservation has been confirmed.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Reference:</strong> ${booking.bookingRef}</p>
          <p><strong>Room Type:</strong> ${roomType}</p>
          <p><strong>Check-in:</strong> ${checkIn}</p>
          <p><strong>Check-out:</strong> ${checkOut}</p>
          <p><strong>Total Amount:</strong> ₦${Number(booking.totalAmount).toLocaleString()}</p>
        </div>
        <p>We look forward to welcoming you!</p>
        <p style="margin-top: 30px; color: #666;">— The StayHaven Team</p>
      </div>
    `,
  });
}

export async function passwordResetEmail(
  user: { firstName: string; email: string },
  resetLink: string
): Promise<boolean> {
  return sendEmail({
    to: user.email,
    subject: "Reset Your Password — StayHaven",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B1B3A;">Reset Your Password</h1>
        <p>Hello ${user.firstName}, we received a request to reset your password.</p>
        <a href="${resetLink}" style="display: inline-block; background: #D97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
        <p style="color: #e74c3c; font-size: 14px;"><strong>This link expires in 1 hour.</strong></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p style="margin-top: 30px; color: #666;">— The StayHaven Team</p>
      </div>
    `,
  });
}

export async function overstayWarningEmail(
  user: { firstName: string; email: string },
  booking: { bookingRef: string; checkOut: Date }
): Promise<boolean> {
  const checkOut = new Date(booking.checkOut).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return sendEmail({
    to: user.email,
    subject: `Checkout Reminder — ${booking.bookingRef}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e74c3c;">Checkout Reminder</h1>
        <p>Hello ${user.firstName}, your checkout date for booking <strong>${booking.bookingRef}</strong> was <strong>${checkOut}</strong>.</p>
        <p>Please contact the front desk to arrange checkout or extend your stay.</p>
        <p><strong>Front Desk:</strong> +234 800 STAYHAVEN</p>
        <p style="margin-top: 30px; color: #666;">— The StayHaven Team</p>
      </div>
    `,
  });
}

export async function extensionConfirmedEmail(
  user: { firstName: string; email: string },
  booking: { bookingRef: string },
  newCheckout: Date
): Promise<boolean> {
  const checkoutDate = new Date(newCheckout).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return sendEmail({
    to: user.email,
    subject: `Stay Extended — ${booking.bookingRef}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B1B3A;">Stay Extended!</h1>
        <p>Hello ${user.firstName}, your stay has been extended.</p>
        <p><strong>New checkout date:</strong> ${checkoutDate}</p>
        <p>Enjoy the rest of your stay!</p>
        <p style="margin-top: 30px; color: #666;">— The StayHaven Team</p>
      </div>
    `,
  });
}

export async function bookingCancellationEmail(
  user: { firstName: string; email: string },
  booking: { bookingRef: string; checkIn: Date; checkOut: Date }
): Promise<boolean> {
  const checkIn = new Date(booking.checkIn).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return sendEmail({
    to: user.email,
    subject: `Booking Cancelled — ${booking.bookingRef}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B1B3A;">Booking Cancelled</h1>
        <p>Hello ${user.firstName}, your booking <strong>${booking.bookingRef}</strong> for <strong>${checkIn}</strong> has been cancelled.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p style="margin-top: 30px; color: #666;">— The StayHaven Team</p>
      </div>
    `,
  });
}
