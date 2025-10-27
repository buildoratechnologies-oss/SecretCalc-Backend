const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  pinValidation
} = require('../utils/validators');

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Protected routes
router.get('/me', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/verify-pin', authMiddleware, pinValidation, authController.verifyPin);
router.post('/set-pin', authMiddleware, pinValidation, authController.setPin);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
