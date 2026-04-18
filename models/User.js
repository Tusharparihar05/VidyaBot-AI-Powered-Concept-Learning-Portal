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
  grade: {
    type: String,
    required: true,
    enum: [
      'Class 9',
      'Class 10',
      'Class 11',
      'Class 12',
      'BTech 1st Year',
      'BTech 2nd Year',
      'BTech 3rd Year',
      'BTech 4th Year'
    ]
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('User', userSchema);