const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
  picture: String, // Google picture
  profilePicture: String, // Uploaded picture path
  dob: String, // e.g. 1995-08-23
  age: Number, // Auto-calculated from dob
  contact: String,

  gender: {
    type: String,
    enum: ["Male", "Female", "Non-binary", "Prefer not to say"]
  },

  address: String,
  medicalConditions: [String],
  wellnessChallenges: [String],
  yogaGoals: [String],
  referralSource: String,

  preferredTimeSlot: {
    type: String,
    enum: ["Live Morning (6 AM – 8 AM)", "Live Evening (6 PM – 8 PM)"]
  },

  height: Number,
  weight: Number,
  bmi: Number,

  isProfileComplete: {
    type: Boolean,
    default: false
  },

  isAdmin: {
    type: Boolean,
    default: false
  },

  // NEW FIELDS FOR PHONE VERIFICATION
  otp: String,
  otpExpires: Date,
  isPhoneVerified: {
    type: Boolean,
    default: false
  }
});

// Auto-calculate age and BMI before saving
userSchema.pre("save", function(next) {
  const user = this;

  // BMI Calculation
  if (user.height && user.weight) {
    const heightInMeters = user.height / 100;
    user.bmi = parseFloat((user.weight / (heightInMeters ** 2)).toFixed(2));
  }

  // Age Calculation
  if (user.dob) {
    const birthDate = new Date(user.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    user.age = age;
  }

  next();
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = User;
