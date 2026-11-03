// Express app for the portfolio contact form.
// On Vercel this file is deployed as a serverless function: every request to
// /api/* is rewritten here (see vercel.json) and handled by this Express app.
// Locally, run `npm run api` (server.js) or `vercel dev`.
try { require('dotenv').config(); } catch (e) { /* dotenv is only for local .env files; Vercel injects env vars itself */ }
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const app = express();

// Vercel sits behind a proxy; this lets rate limiting see the real visitor IP.
app.set('trust proxy', 1);

// --- Config (set these in Vercel -> Project -> Settings -> Environment Variables) ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // same-origin / curl requests have no Origin header; allow everything if none configured
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  }
}));
app.use(express.json({ limit: '20kb' }));

// Limit submissions to 5 per 15 minutes per IP.
// Note: on serverless this counter lives in memory per instance, so it is a
// best-effort guard. For strict limits use Upstash/Redis.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent. Please try again later.' }
});

// Create the mail transporter lazily and reuse it between warm invocations.
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Missing SMTP_HOST / SMTP_USER / SMTP_PASS environment variables');
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  return transporter;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactPayload(body) {
  const { name, email, message } = body || {};
  if (!name || !email || !message) return 'Name, email, and message are all required.';
  if (String(name).length > 120) return 'Name is too long.';
  if (!emailRegex.test(String(email))) return "That email address doesn't look valid.";
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
  if (validationError) return res.status(400).json({ error: validationError });

  const name = String(req.body.name).trim();
  const email = String(req.body.email).trim();
  const message = String(req.body.message).trim();

  try {
    await getTransporter().sendMail({
      from: `"Portfolio Contact Form" <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || process.env.SMTP_USER,
      replyTo: email,
      subject: `Portfolio inquiry from ${name.replace(/[\r\n]+/g, ' ')}`, // no header injection
      text: `${message}\n\n— ${name} (${email})`,
      html: `
        <div style="font-family:sans-serif; font-size:15px; line-height:1.6; color:#111;">
          <p><strong>New message from your portfolio contact form</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
          <hr style="border:none; border-top:1px solid #ddd; margin:16px 0;">
          <p style="color:#666; font-size:13px;">From: ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
        </div>`
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send email:', err.message);
    res.status(500).json({ error: 'Something went wrong sending your message. Please try again or email directly.' });
  }
});

// Unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Vercel invokes the exported Express app as the request handler.
module.exports = app;