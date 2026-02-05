import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: false // Optional for OAuth users
  },
  name: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['student', 'guru'], 
    default: 'student' 
  },
  avatar: { 
    type: String, 
    default: '' 
  },
  instrument: { 
    type: String, 
    default: '' 
  },
  bio: { 
    type: String, 
    default: '' 
  },
  connections: [{
    type: String
  }],
  // New Profile Fields
  examinationLevel: {
    type: String,
    default: ''
  },
  interests: [{
    type: String
  }],
  dob: {
    type: String,
    default: ''
  },
  oauthProvider: {
    type: String,
    enum: ['google', null],
    default: null
  },
  oauthId: {
    type: String,
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const User = mongoose.model('User', userSchema);
export default User;