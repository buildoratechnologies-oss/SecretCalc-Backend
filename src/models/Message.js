const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'gif', 'emoji', 'file'],
    default: 'text',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [20000000, 'Content size exceeds limit'] // ~15MB base64
  },
  thumbnailBase64: {
    type: String,
    default: null,
    maxlength: [500000, 'Thumbnail too large'] // ~375KB
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  mimeType: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
    index: true
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, status: 1 });

// Static method to get paginated messages
messageSchema.statics.getMessages = async function(roomId, limit = 50, beforeDate = null) {
  const query = {
    roomId,
    isDeleted: false
  };
  
  if (beforeDate) {
    query.createdAt = { $lt: new Date(beforeDate) };
  }
  
  return await this.find(query)
    .populate('sender', 'username uid avatarBase64')
    .populate('replyTo', 'content type sender')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to mark messages as delivered
messageSchema.statics.markAsDelivered = async function(roomId, userId) {
  return await this.updateMany(
    {
      roomId,
      sender: { $ne: userId },
      status: 'sent'
    },
    {
      $set: { status: 'delivered' }
    }
  );
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function(roomId, userId) {
  return await this.updateMany(
    {
      roomId,
      sender: { $ne: userId },
      status: { $in: ['sent', 'delivered'] }
    },
    {
      $set: { status: 'read' }
    }
  );
};

// Method to soft delete message
messageSchema.methods.softDelete = async function(userId, deleteForBoth = false) {
  if (deleteForBoth && this.sender.toString() === userId.toString()) {
    this.isDeleted = true;
  } else {
    this.deletedBy.push(userId);
  }
  await this.save();
};

// Hide deleted messages in JSON
messageSchema.methods.toJSON = function() {
  const message = this.toObject();
  if (message.isDeleted) {
    message.content = 'This message was deleted';
    message.thumbnailBase64 = null;
  }
  delete message.__v;
  return message;
};

module.exports = mongoose.model('Message', messageSchema);
