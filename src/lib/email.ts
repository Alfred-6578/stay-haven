import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@stayhaven.com";
const FROM_NAME = process.env.FROM_NAME || "StayHaven";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const LOGO_URL = `${CLIENT_URL}/logo.png`;

function createTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const opts: SMTPTransport.Options = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
  return nodemailer.createTransport(opts);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StayHaven</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0B1B3A 0%, #1a3060 100%); border-radius: 16px 16px 0 0; padding: 32px 40px; text-align: center;">
              <img src="${LOGO_URL}" alt="StayHaven" width="48" height="48" style="display: inline-block; vertical-align: middle; border: 0;" />
              <span style="display: inline-block; vertical-align: middle; margin-left: 12px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">StayHaven</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #ffffff; border-top: 1px solid #eef0f3; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af;">
                StayHaven &mdash; Where Every Stay Becomes a Memory
              </p>
              <p style="margin: 0; font-size: 12px; color: #c0c5cf;">
                &copy; ${new Date().getFullYear()} StayHaven. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td style="background: linear-gradient(135deg, #D97706 0%, #B45309 100%); border-radius: 8px;">
          <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280; width: 140px;">${label}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #0B1B3A; font-weight: 600;">${value}</td>
    </tr>`;
}

async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  try {
    const transport = createTransporter();
    if (!transport) {
      console.warn("SMTP not configured — skipping email to:", to);
      return false;
    }
    await transport.sendMail({
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
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0B1B3A;">
        Welcome, ${user.firstName}!
      </h1>
      <div style="width: 48px; height: 3px; background: #D97706; border-radius: 2px; margin: 0 0 20px;"></div>
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.7;">
        Thank you for joining the StayHaven family. We're thrilled to have you on board.
      </p>
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.7;">
        You can now browse our curated collection of rooms, make reservations, order room service, and earn loyalty points with every stay.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background: linear-gradient(135deg, #fef9ee 0%, #fff7ed 100%); border-radius: 12px; border-left: 4px solid #D97706;">
        <tr>
          <td style="padding: 20px 24px;">
            <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #D97706; text-transform: uppercase; letter-spacing: 0.5px;">Your Loyalty Tier</p>
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #0B1B3A;">Bronze Member</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Earn points on every booking and unlock exclusive perks.</p>
          </td>
        </tr>
      </table>
      ${primaryButton(`${CLIENT_URL}/rooms`, "Explore Our Rooms")}
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        If you have any questions, simply reply to this email &mdash; we're always here to help.
      </p>
    `),
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
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0B1B3A;">
        You're Invited!
      </h1>
      <div style="width: 48px; height: 3px; background: #D97706; border-radius: 2px; margin: 0 0 20px;"></div>
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.7;">
        <strong>${invitedByName}</strong> has invited you to join the StayHaven team.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">Your Role</td>
                <td style="font-size: 14px; font-weight: 700; color: #0B1B3A; padding-bottom: 8px; text-align: right;">
                  <span style="background: #0B1B3A; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${role}</span>
                </td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #6b7280;">Invited By</td>
                <td style="font-size: 14px; font-weight: 600; color: #0B1B3A; text-align: right;">${invitedByName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${primaryButton(inviteLink, "Accept Invitation")}
      <p style="margin: 0; font-size: 13px; color: #ef4444; line-height: 1.6;">
        This invitation expires in <strong>24 hours</strong>. Please accept it before then.
      </p>
    `),
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
    html: emailLayout(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 50%; line-height: 56px; font-size: 24px;">
          &#10003;
        </div>
      </div>
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0B1B3A; text-align: center;">
        Booking Confirmed!
      </h1>
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.7; text-align: center;">
        Hello ${user.firstName}, your reservation is all set. Here are your details:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              ${infoRow("Reference", booking.bookingRef)}
              ${infoRow("Room Type", roomType)}
              ${infoRow("Check-in", checkIn)}
              ${infoRow("Check-out", checkOut)}
              <tr>
                <td style="padding: 14px 0 0; font-size: 13px; color: #6b7280; width: 140px;">Total Amount</td>
                <td style="padding: 14px 0 0; font-size: 20px; color: #D97706; font-weight: 700;">\u20A6${Number(booking.totalAmount).toLocaleString()}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${primaryButton(`${CLIENT_URL}/bookings`, "View My Bookings")}
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6; text-align: center;">
        We look forward to welcoming you. Need to make changes? Visit your dashboard or reply to this email.
      </p>
    `),
  });
}

export async function passwordResetEmail(
  user: { firstName: string; email: string },
  resetLink: string
): Promise<boolean> {
  return sendEmail({
    to: user.email,
    subject: "Reset Your Password — StayHaven",
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0B1B3A;">
        Reset Your Password
      </h1>
      <div style="width: 48px; height: 3px; background: #D97706; border-radius: 2px; margin: 0 0 20px;"></div>
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.7;">
        Hello ${user.firstName}, we received a request to reset your password. Click the button below to choose a new one.
      </p>
      ${primaryButton(resetLink, "Reset Password")}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 4px 0 20px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
        <tr>
          <td style="padding: 14px 18px; font-size: 13px; color: #991b1b; line-height: 1.5;">
            <strong>This link expires in 1 hour.</strong> After that, you'll need to request a new one.
          </td>
        </tr>
      </table>
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
      </p>
    `),
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
    html: emailLayout(`
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
        <tr>
          <td style="padding: 20px 24px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #ef4444; text-transform: uppercase; letter-spacing: 0.5px;">Checkout Overdue</p>
            <p style="margin: 0; font-size: 16px; font-weight: 700; color: #991b1b;">Booking ${booking.bookingRef}</p>
          </td>
        </tr>
      </table>
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0B1B3A;">
        Checkout Reminder
      </h1>
      <div style="width: 48px; height: 3px; background: #ef4444; border-radius: 2px; margin: 0 0 20px;"></div>
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.7;">
        Hello ${user.firstName}, your scheduled checkout date was <strong>${checkOut}</strong>.
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.7;">
        Please contact the front desk at your earliest convenience to arrange checkout or extend your stay.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 20px 24px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Front Desk</p>
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #0B1B3A;">+234 800 STAYHAVEN</p>
          </td>
        </tr>
      </table>
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        Additional charges may apply for late checkout. We appreciate your cooperation.
      </p>
    `),
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
    html: emailLayout(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 50%; line-height: 56px; font-size: 24px;">
          &#128197;
        </div>
      </div>
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0B1B3A; text-align: center;">
        Stay Extended!
      </h1>
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.7; text-align: center;">
        Hello ${user.firstName}, great news &mdash; your stay has been extended.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; background: linear-gradient(135deg, #fef9ee 0%, #fff7ed 100%); border-radius: 12px; border: 1px solid #fde68a;">
        <tr>
          <td style="padding: 24px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">New Checkout Date</p>
            <p style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #0B1B3A;">${checkoutDate}</p>
            <p style="margin: 0; font-size: 13px; color: #6b7280;">Booking Ref: ${booking.bookingRef}</p>
          </td>
        </tr>
      </table>
      ${primaryButton(`${CLIENT_URL}/bookings`, "View Booking Details")}
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6; text-align: center;">
        Enjoy the rest of your stay! We're here if you need anything.
      </p>
    `),
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
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0B1B3A;">
        Booking Cancelled
      </h1>
      <div style="width: 48px; height: 3px; background: #9ca3af; border-radius: 2px; margin: 0 0 20px;"></div>
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.7;">
        Hello ${user.firstName}, your booking has been cancelled. Here are the details:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              ${infoRow("Reference", booking.bookingRef)}
              ${infoRow("Check-in Was", checkIn)}
              <tr>
                <td style="padding: 10px 0 0; font-size: 13px; color: #6b7280; width: 140px;">Status</td>
                <td style="padding: 10px 0 0;">
                  <span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Cancelled</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.7;">
        If a refund is applicable, it will be processed within 5-7 business days.
      </p>
      ${primaryButton(`${CLIENT_URL}/rooms`, "Book Another Stay")}
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        Have questions? Reply to this email or contact our support team.
      </p>
    `),
  });
}
