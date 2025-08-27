const User = require("../models/user");
const express = require("express");
const router = express.Router();
const Course = require("../models/course");
const Section = require("../models/section");
const Lesson = require("../models/lesson");

// Admin middleware
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated() || !req.user.isAdmin) {
    return res.status(403).send("Access denied: Admins only");
  }
  next();
}

router.use(requireAdmin);

// Seed default courses
router.get("/courses", async (req, res) => {
  const defaultCourses = [
    { name: "Yoga And Meditation", description: "To improve your Health" },
    { name: "Techniques", description: "To blow Mental and Physical Stress" },
    { name: "Anti Inflammatory Diet", description: "To improve your Gut Health" },
    { name: "Universal Sutras", description: "Sutras to crack UPSC, SPSC etc." }
  ];

  for (let item of defaultCourses) {
    const exists = await Course.findOne({ name: item.name });
    if (!exists) {
      await Course.create(item);
    }
  }

  const courses = await Course.find();
  res.render("courses/index", { courses });
});

// Show course
router.get("/courses/:id", async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).send("Course not found");

  const sections = await Section.find({ course: course._id, courseModel: "Course" });
  const fullStructure = [];

  let currentLesson = null;

  for (let sec of sections) {
    const lessons = await Lesson.find({ section: sec._id });
    fullStructure.push({ section: sec, lessons });
  }

  if (req.query.lesson) {
    currentLesson = await Lesson.findById(req.query.lesson);
  } else {
    for (let block of fullStructure) {
      if (block.lessons.length > 0) {
        currentLesson = block.lessons[0];
        break;
      }
    }
  }

  res.render("courses/show", {
    course,
    fullStructure,
    current: currentLesson
  });
});

// Add lesson form
router.get("/lessons/new", async (req, res) => {
  const courses = await Course.find();
  const sections = await Section.find({ courseModel: "Course" }).populate("course");
  res.render("courses/new", { courses, sections });
});

// Edit lesson form
router.get("/lessons/:id/edit", async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).send("Lesson not found");

  const section = await Section.findById(lesson.section);
  const courseId = section.course;
  const courseModel = section.courseModel || "Course";
  const sections = await Section.find({ course: courseId, courseModel });
  const course = await Course.findById(courseId);

  res.render("courses/edit", { lesson, sections, course });
});

// Create lesson
router.post("/lessons", async (req, res) => {
  const {
    courseId,
    courseModel,
    sectionOption,
    sectionTitle,
    existingSectionId,
    lessonTitle,
    video // this is the video link (URL)
  } = req.body;

  let section;

  if (sectionOption === "create") {
    section = new Section({
      title: sectionTitle,
      course: courseId,
      courseModel: courseModel || "Course"
    });
    await section.save();
  } else {
    section = await Section.findById(existingSectionId);
  }
console.log("Request body:", req.body);

  if (!section) return res.status(400).send("Invalid section selected or created.");
  if (section.course.toString() !== courseId) return res.status(400).send("Section mismatch.");

  const lesson = new Lesson({
    title: lessonTitle,
    videoPath: video, // use URL directly
    section: section._id,
    completed: false
  });

  await lesson.save();
  res.redirect(`/courses/${courseId}`);
});

// Update lesson
router.put("/lessons/:id", async (req, res) => {
  const { lessonTitle, sectionId, video } = req.body;
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).send("Lesson not found");

  lesson.title = lessonTitle;
  lesson.section = sectionId;
  if (video) {
    lesson.videoPath = video;
  }

  await lesson.save();

  const section = await Section.findById(lesson.section);
  res.redirect(`/courses/${section.course}`);
});

// Toggle completion
router.post("/lessons/:id/toggle-completed", async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  lesson.completed = !lesson.completed;
  await lesson.save();
  res.redirect("back");
});

// Delete lesson
router.delete("/lessons/:id", async (req, res) => {
  const lesson = await Lesson.findByIdAndDelete(req.params.id);
  if (!lesson) return res.status(404).send("Lesson not found");

  const sectionId = lesson.section;
  const remainingLessons = await Lesson.find({ section: sectionId });

  if (remainingLessons.length === 0) {
    await Section.findByIdAndDelete(sectionId);
  }

  const section = await Section.findById(sectionId);
  const courseId = section ? section.course : null;

  res.redirect(courseId ? `/courses/${courseId}` : "/courses");
});

// Delete section
router.delete("/sections/:id", async (req, res) => {
  await Section.findByIdAndDelete(req.params.id);
  await Lesson.deleteMany({ section: req.params.id });
  res.redirect("back");
});

// Referral stats
router.get("/courses/admin/referral_stats", async (req, res) => {
  try {
    const predefined = ["Instagram", "Facebook", "Google", "Flyer", "Poster", "Friend", "Doctor"];

    const stats = await User.aggregate([
      { $match: { referralSource: { $nin: predefined } } },
      { $group: { _id: "$referralSource", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.render("courses/referral_stats", { stats });
  } catch (err) {
    console.error("❌ Referral stats error:", err);
    res.status(500).send("Error generating referral stats");
  }
});

module.exports = router;
