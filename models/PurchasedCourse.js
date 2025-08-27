const mongoose = require("mongoose");

const purchasedCourseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  courseType: {
    type: String,
    enum: ["aspirants", "working_professionals","seniorcitizen"],
    required: true,
  },
  purchasedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true, // ✅ Ensure expiry is always set
  },
  amount: {
    type: Number,
    required: true,
    min: 1, // ✅ Sanity check
  },
  razorpayOrderId: {
    type: String,
    required: true,
  },
  razorpayPaymentId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
}, { timestamps: true }); // ✅ Adds createdAt & updatedAt automatically

module.exports = mongoose.model("PurchasedCourse", purchasedCourseSchema);
