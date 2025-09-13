// models/Otp.js
const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: {type: String, required: true},
  password: {type: String, required: true},
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true }
});

module.exports = mongoose.model("Otp", OtpSchema);
