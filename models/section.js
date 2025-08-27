const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const sectionSchema = new Schema({
  title: String,
  
  // This field will store the ID of either a Course or WorkingCourse
  course: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'courseModel'  // dynamic reference based on courseModel field below
  },

  // This field tells Mongoose which model the `course` ObjectId refers to
  courseModel: {
    type: String,
    required: true,
    enum: ['Course', 'WorkingCourse','SeniorCitizen']  // allowed referenced models
  }
  
});

module.exports = mongoose.model("Section", sectionSchema);
