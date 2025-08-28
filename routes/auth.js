const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");

// Admin emails
const adminEmails = process.env.ADMIN_EMAIL.split(","); // ✅ add more if needed

// Login page
router.get("/auth/login", (req, res) => {
  res.render("auth/login");
});

// Google OAuth
router.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// OAuth Callback
router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  async (req, res) => {
    const user = req.user;

    try {
      // Mark admin if email matches
      if (adminEmails.includes(user.email) && !user.isAdmin) {
        user.isAdmin = true;
        user.isProfileComplete = true; // ✅ ensure admin bypasses profile
        await user.save();
      }

      // 🔁 Session refresh
      req.login(user, (err) => {
        if (err) {
          console.error("Session refresh error:", err);
          return res.redirect("/auth/login");
        }

        // 👑 Admin → redirect to /courses
        if (user.isAdmin) {
          return res.redirect("/courses");
        }

        // 👤 Normal user → profile completed?
        if (!user.isProfileComplete) {
          return res.redirect("/user/complete_profile");
        }

        // If profile is complete, always go to choose_category first
        return res.redirect("/user/choose_category");
      });
    } catch (err) {
      console.error("OAuth Callback Error:", err);
      return res.redirect("/auth/login");
    }
  }
);

// Logout
router.get("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/auth/login");
  });
});

module.exports = router;
