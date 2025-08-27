const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  title: String,
  videoPath: String,
  duration: String,
  completed: {
    type: Boolean,
    default: false
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section"
  },
}, { timestamps: true }); // <-- ye line add kari gayi hai

module.exports = mongoose.model("Lesson", lessonSchema);

