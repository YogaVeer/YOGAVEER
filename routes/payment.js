const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const router = express.Router();

const Course = require("../models/course"); // Aspirants
const WorkingCourse = require("../models/working_professional_course");
const SeniorCitizen = require("../models/seniorcitizen");
const PurchasedCourse = require("../models/PurchasedCourse");

require("dotenv").config();

// ✅ Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ------------------ CATEGORY WISE BUNDLE PURCHASE ------------------ */

// 🔹 Create order for ALL courses of a category
router.post("/create-order-all/:category", async (req, res) => {
  try {
    const category = req.params.category;

    // 👉 Fixed bundle prices per category
    let amount = 1 * 100; 
    if (category === "working_professionals") amount = 1 * 100;
    if (category === "seniorcitizen") amount = 1 * 100;

    // 👉 Use short category keys to keep receipt < 40 chars
    const shortCategory =
      category === "working_professionals" ? "wp" :
      category === "seniorcitizen" ? "sc" :
      "asp";

    const options = {
      amount,
      currency: "INR",
      receipt: `bundle_${shortCategory}_${Date.now().toString().slice(-6)}`, // ✅ safe length
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (err) {
    console.error("Error creating bundle order:", err);
    res.status(500).json({ success: false, error: "Error creating bundle order" });
  }
});


// 🔹 Verify bundle payment & unlock all courses of category
router.post("/verify_payment_all", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, category, userId } = req.body;

    // ✅ Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // ✅ Fetch courses
    let courses = [];
    if (category === "aspirants") courses = await Course.find({});
    else if (category === "working_professionals") courses = await WorkingCourse.find({});
    else if (category === "seniorcitizen") courses = await SeniorCitizen.find({});

    if (!courses.length) {
      return res.status(404).json({ success: false, message: "No courses found for category" });
    }

    // ✅ 5 months expiry
    const expiresAt = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000);

    for (const course of courses) {
      const alreadyPurchased = await PurchasedCourse.findOne({
        user: userId,
        course: course._id,
        status: "completed",
        courseType: category,
        expiresAt: { $gt: new Date() }
      });

      if (!alreadyPurchased) {
        await PurchasedCourse.create({
          user: userId,
          course: course._id,
          courseType: category,
          purchasedAt: new Date(),
          expiresAt,
          amount: 1999, 
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          status: "completed",
        });
      }
    }

    res.json({ success: true, message: "All courses unlocked successfully!" });
  } catch (err) {
    console.error("Bundle verify error:", err);
    res.status(500).json({ success: false, error: "Error verifying bundle payment" });
  }
});


/* ------------------ SINGLE COURSE PURCHASE ------------------ */

// 🔹 Create order for single course
router.post("/create-order", async (req, res) => {
  const { courseId, courseType } = req.body;

  if (!courseId || !courseType) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    let course;
    if (courseType === "aspirants") course = await Course.findById(courseId);
    if (courseType === "working_professionals") course = await WorkingCourse.findById(courseId);
    if (courseType === "seniorcitizen") course = await SeniorCitizen.findById(courseId);

    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    // either fixed price or from DB
    const amount = (course.price || 499) * 100;
    const shortType = courseType.substring(0, 3); // e.g. "wor"
    const shortTime = Date.now().toString().slice(-8);

    const options = {
      amount,
      currency: "INR",
      receipt: `s_${shortType}_${shortTime}`,
    };

    const order = await razorpay.orders.create(options);
    return res.json({ success: true, order });
  } catch (err) {
    console.error("Single order creation failed:", err);
    return res.status(500).json({ success: false, error: "Failed to create Razorpay order" });
  }
});

// 🔹 Verify single course payment
router.post("/verify_payment", async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    courseId,
    courseType,
    userId
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId || !userId) {
    return res.status(400).json({ success: false, message: "Incomplete payment data" });
  }

  try {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // ✅ Avoid duplicate purchase
    const existing = await PurchasedCourse.findOne({
      user: userId,
      course: courseId,
      courseType,
      status: "completed",
      expiresAt: { $gt: new Date() }
    });

    if (existing) {
      return res.json({ success: true, message: "Course already unlocked" });
    }

    // ✅ Save purchase (45 days)
    await PurchasedCourse.create({
      user: userId,
      course: courseId,
      courseType,
      amount: 499,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: "completed",
      purchasedAt: new Date(),
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    });

    return res.json({ success: true, message: "Course unlocked successfully" });
  } catch (err) {
    console.error("Verification error:", err);
    return res.status(500).json({ success: false, message: "Server error during verification" });
  }
});

module.exports = router;
