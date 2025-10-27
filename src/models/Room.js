const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient member queries
roomSchema.index({ members: 1 });

// Validate that room has exactly 2 members
roomSchema.pre('save', function(next) {
  if (this.members.length !== 2) {
    return next(new Error('Room must have exactly 2 members'));
  }
  next();
});

// Static method to find or create room
roomSchema.statics.findOrCreateRoom = async function(userId1, userId2) {
  // Sort user IDs to ensure consistent roomId
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  const roomId = `${sortedIds[0]}_${sortedIds[1]}`;
  
  let room = await this.findOne({ roomId });
  
  if (!room) {
    room = await this.create({
      roomId,
      members: sortedIds
    });
  }
  
  return room;
};

// Static method to get rooms for a user
roomSchema.statics.getRoomsForUser = async function(userId) {
  return await this.find({ members: userId })
    .populate('members', 'username uid avatarBase64 lastSeen isOnline')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });
};

module.exports = mongoose.model('Room', roomSchema);
