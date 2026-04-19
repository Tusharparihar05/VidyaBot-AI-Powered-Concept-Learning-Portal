const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  institutionType: {
    type: String,
    enum: ['school', 'college'],
    default: 'school'
  },
  institutionName: {
    type: String,
    default: ''
  },
  gradeYear: {
    type: String,
    enum: [
      '9th Grade', '10th Grade', '11th Grade', '12th Grade',
      '1st Year', '2nd Year', '3rd Year', '4th Year'
    ],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);