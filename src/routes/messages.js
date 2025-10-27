const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Room = require('../models/Room');
const { authMiddleware } = require('../middleware/auth');
const { messageValidation, objectIdValidation } = require('../utils/validators');

// Send message (REST API - Socket.IO is preferred)
router.post('/', authMiddleware, messageValidation, async (req, res) => {
  try {
    const { roomId, type, content, replyTo } = req.body;
    
    // Verify room access
    const room = await Room.findById(roomId);
    if (!room || !room.members.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Create message
    const message = await Message.create({
      roomId,
      sender: req.userId,
      type,
      content,
      replyTo: replyTo || null
    });
    
    await message.populate('sender', 'username uid avatarBase64');
    
    // Update room last message
    room.lastMessage = message._id;
    room.lastMessageAt = new Date();
    await room.save();
    
    // Emit via Socket.IO
    const io = req.app.get('io');
    room.members.forEach(memberId => {
      io.to(memberId.toString()).emit('message:recv', message);
    });
    
    res.status(201).json({
      success: true,
      data: { message }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// Update message status
router.patch('/:id/status', authMiddleware, objectIdValidation('id'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['delivered', 'read'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    message.status = status;
    await message.save();
    
    // Emit update
    const io = req.app.get('io');
    const room = await Room.findById(message.roomId);
    room.members.forEach(memberId => {
      io.to(memberId.toString()).emit('message:update', {
        messageId: message._id,
        status
      });
    });
    
    res.json({
      success: true,
      data: { message }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// Delete message
router.delete('/:id', authMiddleware, objectIdValidation('id'), async (req, res) => {
  try {
    const { deleteForBoth } = req.query;
    
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if user is sender
    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Can only delete your own messages'
      });
    }
    
    await message.softDelete(req.userId, deleteForBoth === 'true');
    
    // Emit deletion
    const io = req.app.get('io');
    const room = await Room.findById(message.roomId);
    room.members.forEach(memberId => {
      io.to(memberId.toString()).emit('message:deleted', {
        messageId: message._id,
        deleteForBoth: deleteForBoth === 'true'
      });
    });
    
    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
});

module.exports = router;
