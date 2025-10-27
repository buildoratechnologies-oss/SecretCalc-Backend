const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required']
  },
  uid: {
    type: String,
    unique: true,
    required: true,
    index: true,
    default: () => nanoid(10) // 10 character unique ID
  },
  pinHash: {
    type: String,
    default: null // Optional: hashed PIN for calculator unlock
  },
  avatarBase64: {
    type: String,
    default: null,
    maxlength: [100000, 'Avatar size too large'] // ~75KB limit
  },
  pushToken: {
    type: String,
    default: null // Expo push notification token
  },
  publicKey: {
    type: String,
    default: null // For end-to-end encryption (future)
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ uid: 1 });
userSchema.index({ username: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, rounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to compare PIN
userSchema.methods.comparePin = async function(candidatePin) {
  if (!this.pinHash) return false;
  return await bcrypt.compare(candidatePin, this.pinHash);
};

// Method to set PIN
userSchema.methods.setPin = async function(pin) {
  const rounds = parseInt(process.env.PIN_SALT_ROUNDS) || 10;
  this.pinHash = await bcrypt.hash(pin, rounds);
  await this.save();
};

// Hide sensitive data in JSON responses
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.pinHash;
  delete user.__v;
  return user;
};

// Update last seen
userSchema.methods.updateLastSeen = async function() {
  this.lastSeen = new Date();
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
