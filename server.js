require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const app = express();

// --- Config ---
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const TO_EMAIL = process.env.TO_EMAIL || process.env.SMTP_USER;

// --- Middleware ---
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(__dirname));

// Limit contact form submissions to 5 per 15 minutes per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent. Please try again later.' }
});

// --- Mail transporter (any SMTP provider: Gmail, Outlook, Zoho, custom) ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587/25
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// --- Helpers ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactPayload(body) {
  const { name, email, message } = body || {};
  if (!name || !email || !message) return 'Name, email, and message are all required.';
  if (String(name).length > 120) return 'Name is too long.';
  if (!emailRegex.test(String(email))) return 'That email address doesn\'t look valid.';
  if (String(message).length > 5000) return 'Message is too long (max 5000 characters).';
  if (String(message).trim().length < 5) return 'Message is too short.';
  return null;
}

// --- Routes ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  const validationError = validateContactPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { name, email, message } = req.body;

  try {
    await transporter.sendMail({
      from: `"Portfolio Contact Form" <${process.env.SMTP_USER}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Portfolio inquiry from ${name}`,
      text: `${message}\n\n— ${name} (${email})`,
      html: `
        <div style="font-family:sans-serif; font-size:15px; line-height:1.6; color:#111;">
          <p><strong>New message from your portfolio contact form</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
          <hr style="border:none; border-top:1px solid #ddd; margin:16px 0;">
          <p style="color:#666; font-size:13px;">
            From: ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;
          </p>
        </div>
      `
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send email:', err.message);
    res.status(500).json({ error: 'Something went wrong sending your message. Please try again or email directly.' });
  }
});

// 404 fallback for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Contact API running on http://localhost:${PORT}`);
});