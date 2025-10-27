const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Registration validation rules
 */
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('pin')
    .optional()
    .isNumeric()
    .isLength({ min: 4, max: 6 })
    .withMessage('PIN must be 4-6 digits'),
  validate
];

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

/**
 * PIN verification validation
 */
const pinValidation = [
  body('pin')
    .isNumeric()
    .isLength({ min: 4, max: 6 })
    .withMessage('PIN must be 4-6 digits'),
  validate
];

/**
 * Message validation rules
 */
const messageValidation = [
  body('roomId')
    .isMongoId()
    .withMessage('Invalid room ID'),
  body('type')
    .isIn(['text', 'image', 'video', 'gif', 'emoji', 'file'])
    .withMessage('Invalid message type'),
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .custom((value, { req }) => {
      const maxSize = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES) || 5242880;
      if (Buffer.byteLength(value, 'utf8') > maxSize) {
        throw new Error(`Content exceeds maximum size of ${maxSize} bytes`);
      }
      return true;
    }),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid reply message ID'),
  validate
];

/**
 * Room connection validation
 */
const connectValidation = [
  body('uid')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ min: 10, max: 10 })
    .withMessage('Invalid user ID format'),
  validate
];

/**
 * Pagination validation
 */
const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('before')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for before parameter'),
  validate
];

/**
 * MongoDB ObjectId validation
 */
const objectIdValidation = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  validate
];

/**
 * Validate base64 image
 */
const validateBase64Image = (base64String) => {
  if (!base64String) return false;
  
  const matches = base64String.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,/);
  if (!matches) return false;
  
  const maxSize = parseInt(process.env.MAX_IMAGE_SIZE_BYTES) || 3145728;
  const sizeInBytes = Buffer.byteLength(base64String, 'utf8');
  
  return sizeInBytes <= maxSize;
};

/**
 * Validate base64 video
 */
const validateBase64Video = (base64String) => {
  if (!base64String) return false;
  
  const matches = base64String.match(/^data:video\/(mp4|webm|ogg|mov);base64,/);
  if (!matches) return false;
  
  const maxSize = parseInt(process.env.MAX_VIDEO_SIZE_BYTES) || 10485760;
  const sizeInBytes = Buffer.byteLength(base64String, 'utf8');
  
  return sizeInBytes <= maxSize;
};

/**
 * Sanitize base64 content
 */
const sanitizeBase64 = (base64String) => {
  // Remove any whitespace or newlines
  return base64String.replace(/\s/g, '');
};

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  pinValidation,
  messageValidation,
  connectValidation,
  paginationValidation,
  objectIdValidation,
  validateBase64Image,
  validateBase64Video,
  sanitizeBase64
};
