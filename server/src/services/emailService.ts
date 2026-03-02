import * as nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

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
        Wedding RSVP ${guest.attending ? '✅' : '❌'}
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${guest.name}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${guest.email}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Attending:</td><td style="padding: 8px;">${guest.attending ? 'Yes' : 'No'}</td></tr>
        ${guest.attending ? `<tr><td style="padding: 8px; font-weight: bold;">Guests:</td><td style="padding: 8px;">${guest.numberOfGuests || 1}</td></tr>` : ''}
        ${guest.message ? `<tr><td style="padding: 8px; font-weight: bold;">Message:</td><td style="padding: 8px;">${guest.message}</td></tr>` : ''}
      </table>
      <p style="color: #888; font-size: 12px; margin-top: 20px;">Submitted: ${new Date().toLocaleString()}</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Wedding RSVP" <${EMAIL_USER}>`,
    to: EMAIL_USER,
    subject,
    html,
  });

  if (guest.email) {
    const guestHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #8B7355;">Thank you, ${guest.name}! 💐</h2>
        <p>Your RSVP has been received.</p>
        <p>${guest.attending
          ? `We're delighted you'll be joining us! We've noted ${guest.numberOfGuests || 1} guest(s).`
          : `We're sorry you can't make it. You'll be missed!`
        }</p>
        <p style="color: #D4AF37; font-style: italic;">With love and gratitude ❤️</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Wedding Invitation" <${EMAIL_USER}>`,
      to: guest.email,
      subject: `Thank you for your RSVP, ${guest.name}!`,
      html: guestHtml,
    });
  }

  console.log(`📧 Emails sent for ${guest.name}`);
}