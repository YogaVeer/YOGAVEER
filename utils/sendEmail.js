// utils/sendEmail.js
const nodemailer = require("nodemailer");

async function sendEmail(to, otp) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Yoga Ekamritkala" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your OTP for Profile Verification",
    text: `Your One Time Password (OTP) is: ${otp}`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
