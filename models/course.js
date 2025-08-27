const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: {
    type: Number,
    required: true,
    default: 1 // Or any amount you prefer
  }
});

module.exports = mongoose.model("Course", courseSchema);
