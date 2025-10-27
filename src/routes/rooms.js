const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');
const { authMiddleware } = require('../middleware/auth');
const { connectValidation, paginationValidation } = require('../utils/validators');

// Connect with partner (create or get room)
router.post('/connect', authMiddleware, connectValidation, async (req, res) => {
  try {
    const { uid } = req.body;
    
    // Find partner
    const partner = await User.findOne({ uid });
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this ID'
      });
    }
    
    // Prevent self-connection
    if (partner._id.toString() === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot connect with yourself'
      });
    }
    
    // Find or create room
    const room = await Room.findOrCreateRoom(req.userId, partner._id);
    await room.populate('members', 'username uid avatarBase64 lastSeen isOnline');
    
    // Get recent messages
    const messages = await Message.getMessages(room._id, 50);
    
    // Emit room created event via Socket.IO
    const io = req.app.get('io');
    io.to(req.userId.toString()).emit('room:created', { roomId: room._id });
    io.to(partner._id.toString()).emit('room:created', { roomId: room._id });
    
    res.json({
      success: true,
      message: 'Connected successfully',
      data: {
        room,
        messages: messages.reverse()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Connection failed',
      error: error.message
    });
  }
});

// Get all rooms for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.getRoomsForUser(req.userId);
    
    res.json({
      success: true,
      data: { rooms }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
      error: error.message
    });
  }
});

// Get messages for a room
router.get('/:roomId/messages', authMiddleware, paginationValidation, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    
    // Verify user is member of room
    const room = await Room.findById(roomId);
    if (!room || !room.members.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const messages = await Message.getMessages(roomId, parseInt(limit), before);
    
    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

module.exports = router;
