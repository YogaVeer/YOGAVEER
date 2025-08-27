const PurchasedCourse = require("../models/PurchasedCourse");

async function checkCourseAccess(req, res, next) {
  const user = req.user;
  const courseId = req.params.id;

  const purchase = await PurchasedCourse.findOne({
    user: user._id,
    course: courseId,
    status: "completed",
    expiresAt: { $gte: new Date() },
  });

  if (!purchase) {
    return res.redirect("/user/locked"); // or show "please purchase"
  }

  next();
}

module.exports = checkCourseAccess;
