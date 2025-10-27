const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Get user by UID (for pairing)
router.get('/:uid', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid })
      .select('username uid avatarBase64 lastSeen isOnline');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Search users by username
router.get('/search/:username', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({
      username: { $regex: req.params.username, $options: 'i' },
      _id: { $ne: req.userId }
    })
      .select('username uid avatarBase64')
      .limit(10);
    
    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

module.exports = router;
