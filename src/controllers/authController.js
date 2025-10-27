const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwt');

/**
 * Register new user
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, pin } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }
    
    // Create user
    const user = new User({
      username,
      email,
      passwordHash: password // Will be hashed by pre-save hook
    });
    
    // Set PIN if provided
    if (pin) {
      await user.setPin(pin);
    }
    
    await user.save();
    
    // Generate tokens
    const token = generateToken({ id: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user._id });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Update last seen
    user.isOnline = true;
    await user.updateLastSeen();
    
    // Generate tokens
    const token = generateToken({ id: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user._id });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Verify PIN for calculator unlock
 */
exports.verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const user = req.user;
    
    if (!user.pinHash) {
      return res.status(400).json({
        success: false,
        message: 'No PIN set for this account'
      });
    }
    
    const isPinValid = await user.comparePin(pin);
    
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }
    
    res.json({
      success: true,
      message: 'PIN verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'PIN verification failed',
      error: error.message
    });
  }
};

/**
 * Set or update PIN
 */
exports.setPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const user = req.user;
    
    await user.setPin(pin);
    
    res.json({
      success: true,
      message: 'PIN set successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to set PIN',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username, avatarBase64, pushToken } = req.body;
    const user = req.user;
    
    if (username) user.username = username;
    if (avatarBase64) user.avatarBase64 = avatarBase64;
    if (pushToken) user.pushToken = pushToken;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  try {
    const user = req.user;
    user.isOnline = false;
    await user.save();
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};
