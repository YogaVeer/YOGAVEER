const express = require("express");
const router = express.Router();

const WorkingCourse = require("../models/working_professional_course");
const Section = require("../models/section");
const Lesson = require("../models/lesson");

// Middleware to restrict access to admins only
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated() || !req.user.isAdmin) {
    return res.status(403).send("Access denied: Admins only");
  }
  next();
}

// Protect all routes below to admin users only
router.use(requireAdmin);

// Seed default working professional courses
router.get("/", async (req, res) => {
  const defaultCourses = [
    { name: "Office Yoga", description: "Stretch and relax at work" },
    { name: "Stress Management", description: "Calm your mind in work chaos" },
    { name: "Quick Healthy Meals", description: "Stay healthy in tight schedules" },
  ];

  for (const courseData of defaultCourses) {
    const exists = await WorkingCourse.findOne({ name: courseData.name });
    if (!exists) {
      await WorkingCourse.create(courseData);
    }
  }

  const courses = await WorkingCourse.find();
  res.render("working_professionals/index", { courses });
});

// Show a specific working professional course with its sections and lessons
router.get("/:id", async (req, res) => {
  const course = await WorkingCourse.findById(req.params.id);
  if (!course) return res.status(404).send("Course not found");

  const sections = await Section.find({ course: course._id, courseModel: "WorkingCourse" });
  const fullStructure = [];

  for (const sec of sections) {
    const lessons = await Lesson.find({ section: sec._id });
    fullStructure.push({ section: sec, lessons });
  }

  let currentLesson = null;
  if (req.query.lesson) {
    currentLesson = await Lesson.findById(req.query.lesson);
  } else {
    for (const block of fullStructure) {
      if (block.lessons.length > 0) {
        currentLesson = block.lessons[0];
        break;
      }
    }
  }

  res.render("working_professionals/show", {
    course,
    fullStructure,
    current: currentLesson,
  });
});

// Form to add a new lesson
router.get("/lessons/new", async (req, res) => {
  const courses = await WorkingCourse.find();
  const sections = await Section.find().populate("course");
  res.render("working_professionals/new", { courses, sections });
});

// Form to edit a lesson
router.get("/lessons/:id/edit", async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).send("Lesson not found");

  const section = await Section.findById(lesson.section);
  const course = await WorkingCourse.findById(section.course);
  const sections = await Section.find({ course: course._id });

  res.render("working_professionals/edit", { lesson, sections, course });
});

// Create a new lesson (with video link instead of upload)
router.post("/lessons", async (req, res) => {
  const { courseId, sectionOption, sectionTitle, existingSectionId, lessonTitle, videoPath } = req.body;

  let section;
  if (sectionOption === "create") {
    section = new Section({ title: sectionTitle, course: courseId, courseModel: "WorkingCourse" });
    await section.save();
  } else {
    section = await Section.findById(existingSectionId);
  }

  if (!section) return res.status(400).send("Invalid section");
  if (section.course.toString() !== courseId) return res.status(400).send("Section mismatch");

  const lesson = new Lesson({
    title: lessonTitle,
    videoPath: videoPath || null,
    section: section._id,
    completed: false,
  });

  await lesson.save();
  res.redirect(`/working_professionals/${courseId}`);
});

// Update an existing lesson (update link if provided)
router.put("/lessons/:id", async (req, res) => {
  const { lessonTitle, sectionId, videoPath } = req.body;
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).send("Lesson not found");

  lesson.title = lessonTitle;
  lesson.section = sectionId;
  lesson.videoPath = videoPath || null;

  await lesson.save();

  const section = await Section.findById(sectionId);
  res.redirect(`/working_professionals/${section.course}`);
});

// Toggle lesson completion status
router.post("/lessons/:id/toggle-completed", async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).send("Lesson not found");

  lesson.completed = !lesson.completed;
  await lesson.save();
  res.redirect("back");
});

// Delete a lesson and possibly its section if empty
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

  res.redirect(courseId ? `/working_professionals/${courseId}` : "/working_professionals");
});

// Delete section and all its lessons
router.delete("/sections/:id", async (req, res) => {
  await Lesson.deleteMany({ section: req.params.id });
  await Section.findByIdAndDelete(req.params.id);
  res.redirect("back");
});

module.exports = router;
