import * as nodemailer from 'nodemailer';

const EMAIL_USER = 'compile.webtech@gmail.com';
const EMAIL_PASS = 'oqmptqmxevaizigl';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

interface GuestEmail {
  name: string;
  email: string;
  attending: 'yes' | 'no' | 'maybe';
  numberOfGuests?: number;
  message?: string;
}

export async function sendConfirmationEmail(guest: GuestEmail): Promise<void> {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured, skipping email');
    return;
  }

  const subject =
    guest.attending === 'yes'
      ? `🎉 RSVP Confirmed: ${guest.name} is attending!`
      : guest.attending === 'no'
      ? `📬 RSVP Received: ${guest.name} cannot attend`
      : `🤔 RSVP Maybe: ${guest.name} is undecided`;

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #8B7355; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">
        Wedding RSVP ${
          guest.attending === 'yes' ? '✅' :
          guest.attending === 'no' ? '❌' :
          '🤔'
        }
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${guest.name}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${guest.email}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Attending:</td><td style="padding: 8px;">
          ${
            guest.attending === 'yes' ? 'Yes' :
            guest.attending === 'no' ? 'No' :
            'Maybe'
          }
        </td></tr>
        ${
          guest.attending === 'yes'
            ? `<tr><td style="padding: 8px; font-weight: bold;">Guests:</td><td style="padding: 8px;">${guest.numberOfGuests || 1}</td></tr>`
            : ''
        }
        ${guest.message ? `<tr><td style="padding: 8px; font-weight: bold;">Message:</td><td style="padding: 8px;">${guest.message}</td></tr>` : ''}
      </table>
      <p style="color: #888; font-size: 12px; margin-top: 20px;">Submitted: ${new Date().toLocaleString()}</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Wedding RSVP" <${EMAIL_USER}>`,
      to: EMAIL_USER,
      subject,
      html,
    });
  } catch (err) {
    console.error('Error sending confirmation email:', err);
  }

  if (guest.email) {
    const guestHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #8B7355;">Thank you, ${guest.name}! 💐</h2>
        <p>Your RSVP has been received.</p>
        <p>${
          guest.attending === 'yes'
            ? `We're delighted you'll be joining us! We've noted ${guest.numberOfGuests || 1} guest(s).`
            : guest.attending === 'no'
            ? `We're sorry you can't make it. You'll be missed!`
            : `Thank you for letting us know. If you decide later, just RSVP again!`
        }</p>
        <p style="color: #D4AF37; font-style: italic;">With love and gratitude ❤️</p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"Wedding Invitation" <${EMAIL_USER}>`,
        to: guest.email,
        subject: `Thank you for your RSVP, ${guest.name}!`,
        html: guestHtml,
      });
      
    } catch (err) {
      console.error('Error sending guest email:', err);
    }
  }
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('⚠️ Email credentials not configured - set EMAIL_USER and EMAIL_PASS in Firebase Console');
    throw new Error('Email service not configured');
  }

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #8B7355; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">
        Wedding RSVP Verification
      </h2>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #8B7355;">${otp}</p>
      <p style="color: #888; font-size: 12px;">This code expires in 10 minutes.</p>
      <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Wedding RSVP" <${EMAIL_USER}>`,
      to: email,
      subject: 'Your RSVP Verification Code',
      html,
    });
  } catch (err) {
    console.error('Error sending OTP email:', err);
    throw err;
  }
}