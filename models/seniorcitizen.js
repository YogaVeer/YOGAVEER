const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SeniorCitizenSchema = new Schema({
  name: String,
  description: String,
  price: {
    type: Number,
    required: true,
    default: 1  // Or set custom price if needed
  }
});

module.exports = mongoose.model("SeniorCitizen", SeniorCitizenSchema);
