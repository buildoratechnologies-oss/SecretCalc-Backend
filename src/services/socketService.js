const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');

const userSockets = new Map(); // userId -> socketId

function initializeSocket(io) {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }
      
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });
  
  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);
    
    // Map user to socket
    userSockets.set(socket.userId, socket.id);
    
    // Update user online status
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastSeen: new Date()
    });
    
    // Join user's personal room (for notifications)
    socket.join(socket.userId);
    
    // Get user's rooms and join them
    const rooms = await Room.find({ members: socket.userId });
    rooms.forEach(room => {
      socket.join(room._id.toString());
      
      // Notify room members that user is online
      socket.to(room._id.toString()).emit('user:online', {
        userId: socket.userId,
        username: socket.user.username
      });
    });
    
    // Handle joining a chat room
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        
        if (!room || !room.members.includes(socket.userId)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }
        
        socket.join(roomId);
        console.log(`User ${socket.userId} joined room ${roomId}`);
        
        // Mark messages as delivered
        await Message.markAsDelivered(roomId, socket.userId);
        
        socket.emit('joinedRoom', { roomId });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle leaving a room
    socket.on('leaveRoom', ({ roomId }) => {
      socket.leave(roomId);
      console.log(`User ${socket.userId} left room ${roomId}`);
    });
    
    // Handle sending a message
    socket.on('message:send', async ({ roomId, type, content, replyTo }, callback) => {
      try {
        console.log(`📨 Message received from ${socket.userId}: type=${type}`);
        
        const room = await Room.findById(roomId);
        
        if (!room || !room.members.includes(socket.userId)) {
          console.error(`❌ Access denied: user not in room ${roomId}`);
          socket.emit('error', { message: 'Access denied' });
          if (callback) callback({ success: false, error: 'Access denied' });
          return;
        }
        
        // Validate content
        if (!content || content.toString().trim().length === 0) {
          console.error('❌ Empty message content');
          if (callback) callback({ success: false, error: 'Message cannot be empty' });
          return;
        }
        
        // Create message
        const message = await Message.create({
          roomId,
          sender: socket.userId,
          type,
          content,
          replyTo: replyTo || null
        });
        
        await message.populate('sender', 'username uid avatarBase64');
        
        // Update room
        room.lastMessage = message._id;
        room.lastMessageAt = new Date();
        await room.save();
        
        console.log(`✅ Message saved: ${message._id}`);
        
        // Send acknowledgment to sender
        if (callback) {
          callback({ success: true, messageId: message._id });
        }
        
        // Broadcast to all room members (including sender)
        io.to(roomId).emit('message:recv', message);
        console.log(`📢 Message broadcast to room: ${roomId}`);
        
        // Send push notification to offline users
        const partnerIds = room.members.filter(id => id.toString() !== socket.userId);
        for (const partnerId of partnerIds) {
          const partner = await User.findById(partnerId);
          if (!partner.isOnline && partner.pushToken) {
            // TODO: Send push notification via Expo
            console.log(`📱 Push notification to ${partner.username}`);
          }
        }
      } catch (error) {
        console.error('❌ Message send error:', error);
        socket.emit('error', { message: error.message });
        if (callback) callback({ success: false, error: error.message });
      }
    });
    
    // Handle message status update
    socket.on('message:status', async ({ messageId, status }) => {
      try {
        const message = await Message.findById(messageId);
        
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        message.status = status;
        await message.save();
        
        const room = await Room.findById(message.roomId);
        io.to(room._id.toString()).emit('message:update', {
          messageId,
          status
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('typing', {
        roomId,
        userId: socket.userId,
        username: socket.user.username,
        isTyping
      });
    });
    
    // Handle mark messages as read
    socket.on('markAsRead', async ({ roomId }) => {
      try {
        await Message.markAsRead(roomId, socket.userId);
        
        io.to(roomId).emit('messagesRead', {
          roomId,
          userId: socket.userId
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      
      userSockets.delete(socket.userId);
      
      const lastSeen = new Date();
      
      // Update user offline status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen
      });
      
      // Get user's rooms to notify members
      const rooms = await Room.find({ members: socket.userId });
      rooms.forEach(room => {
        socket.to(room._id.toString()).emit('user:offline', {
          userId: socket.userId,
          username: socket.user.username,
          lastSeen
        });
      });
    });
  });
}

module.exports = { initializeSocket, userSockets };
