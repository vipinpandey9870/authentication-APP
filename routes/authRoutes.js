const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Otp = require("../models/otp");
const authMiddleware = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");

const router = express.Router();

// ----------------- SIGNUP (Render Form) -----------------
router.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});



// ----------------- SIGNUP (Generate OTP) -----------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("signup", { error: "User already exists" });
    }

    // Purane OTPs delete karo
    await Otp.deleteMany({ email });

    const hashedPassword = await bcrypt.hash(password, 10);

    // OTP generate
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    // OTP save in Otp collection
    await Otp.create({
      email,
      name,
      password: hashedPassword,
      otp: otpCode,
      otpExpires,
    });
     
    res.render("verify", { email, error: null });

    // Send OTP via nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

     transporter.sendMail({
      from: `"Auth App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otpCode}`,
      html: `<h2>Your OTP code is: <b>${otpCode}</b></h2>`,
    }).then(()=>{
      console.log(`OTP sent to ${email}`)
    }).catch(err =>{
      console.log("Email send error:" , err.message)
    })
  } catch (error) {
    console.log("Signup error:", error.message);
    res.render("signup", { error: "Server error. Please try again." });
  }
});

// ----------------- VERIFY OTP -----------------
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.render("signup", {
        error: "OTP not found or expired. Signup again.",
      });
    }

    // Pehle expiry check karo
    if (otpRecord.otpExpires < Date.now()) {
      await Otp.deleteOne({ email });
      return res.render("signup", { error: "OTP expired. Signup again." });
    }

    // 🔑 Fix: trim & string cast for both sides
    const dbOtp = String(otpRecord.otp).trim();
    const userOtp = String(otp).trim();

    if (dbOtp !== userOtp) {
      return res.render("verify", {
        email,
        error: "Invalid OTP. Try again.",
      });
    }

    // OTP valid -> create user
    const user = new User({
      name: otpRecord.name,
      email: otpRecord.email,
      password: otpRecord.password,
    });
    await user.save();

    // Delete OTP record
    await Otp.deleteOne({ email });

    // ✅ Correct redirect (because your router is mounted at /api/auth)
    return res.redirect("/api/auth/login");

  } catch (error) {
    console.log("Verify OTP error:", error);
    return res.render("verify", {
      email: req.body.email,
      error: "Server error. Try again.",
    });
  }
});


// ----------------- LOGIN -----------------
router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("login", { error: "Invalid user" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", { error: "Invalid password" });
    }

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      maxAge: 3600000,
    });

    res.redirect("/api/auth/home");
  } catch (error) {
    console.log("Login error:", error.message);
    res.render("login", { error: "Server error. Try again." });
  }
});

// ----------------- LOGOUT -----------------
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.redirect("/api/auth/login");
  } catch (error) {
    console.log("Logout error:", error.message);
    res.render("home", { error: "Server error. Try again." });
  }
});

// ----------------- HOME -----------------
router.get("/home", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.render("home", { user });
  } catch (error) {
    console.log("Home error:", error.message);
    res.redirect("/login");
  }
});

module.exports = router;
