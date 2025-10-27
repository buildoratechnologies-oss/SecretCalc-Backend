# SecretCalc Server

Backend API and Socket.IO server for SecretCalc - A private 2-person chat app disguised as a calculator.

## Features

- ✅ JWT Authentication (Register/Login)
- ✅ PIN-based Calculator Unlock
- ✅ Real-time Socket.IO Messaging
- ✅ 1-to-1 Private Chat Rooms
- ✅ Text, Image, Video, GIF Support (Base64)
- ✅ Typing Indicators
- ✅ Message Status (Sent/Delivered/Read)
- ✅ User Pairing via UID/QR Code
- ✅ Message Pagination
- ✅ Online/Offline Status
- ✅ Push Notification Support (Expo)
- ✅ Rate Limiting & Security Headers

## Tech Stack

- **Runtime:** Node.js 16+
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Real-time:** Socket.IO 4.x
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** express-validator
- **Security:** Helmet, CORS, bcryptjs

## Prerequisites

- Node.js >= 16.0.0
- MongoDB (local or Atlas)
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Setup

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/secretcalc
JWT_SECRET=your_super_secure_random_secret
JWT_EXPIRES_IN=7d
MAX_UPLOAD_SIZE_BYTES=5242880
ALLOWED_ORIGINS=http://localhost:19000
```

### 3. Start MongoDB

**Local MongoDB:**
```bash
mongod --dbpath=/path/to/data
```

**Or use MongoDB Atlas** (recommended for production)

### 4. Run Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:4000`

## API Documentation

### Base URL
```
http://localhost:4000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Verify PIN
```http
POST /api/auth/verify-pin
Authorization: Bearer <token>
Content-Type: application/json

{
  "pin": "1234"
}
```

#### Get Profile
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### User Endpoints

#### Get User by UID
```http
GET /api/users/:uid
Authorization: Bearer <token>
```

### Room Endpoints

#### Connect with Partner
```http
POST /api/rooms/connect
Authorization: Bearer <token>
Content-Type: application/json

{
  "uid": "ABC1234567"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "64f0c6e7b5d4f9b8a0de1234",
    "members": [...]
  }
}
```

#### Get Room Messages
```http
GET /api/rooms/:roomId/messages?limit=50&before=2025-01-20T10:00:00Z
Authorization: Bearer <token>
```

### Message Endpoints

#### Send Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "roomId": "64f0c6e7b5d4f9b8a0de1234",
  "type": "text",
  "content": "Hello!"
}
```

#### Update Message Status
```http
PATCH /api/messages/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "read"
}
```

#### Delete Message
```http
DELETE /api/messages/:id?deleteForBoth=false
Authorization: Bearer <token>
```

## Socket.IO Events

### Client → Server

#### Authentication
```javascript
socket.emit('auth:token', { token: 'your_jwt_token' });
```

#### Join Room
```javascript
socket.emit('joinRoom', { roomId: '64f0c6e7b5d4f9b8a0de1234' });
```

#### Send Message
```javascript
socket.emit('message:send', {
  roomId: '64f0c6e7b5d4f9b8a0de1234',
  type: 'text',
  content: 'Hello!'
});
```

#### Typing Indicator
```javascript
socket.emit('typing', {
  roomId: '64f0c6e7b5d4f9b8a0de1234',
  isTyping: true
});
```

#### Update Message Status
```javascript
socket.emit('message:status', {
  messageId: '64f0c6e7b5d4f9b8a0de1234',
  status: 'delivered'
});
```

### Server → Client

#### Receive Message
```javascript
socket.on('message:recv', (message) => {
  console.log('New message:', message);
});
```

#### Message Status Update
```javascript
socket.on('message:update', ({ messageId, status }) => {
  console.log(`Message ${messageId} is now ${status}`);
});
```

#### Typing Indicator
```javascript
socket.on('typing', ({ roomId, userId, isTyping }) => {
  console.log(`User ${userId} is typing: ${isTyping}`);
});
```

#### Room Created
```javascript
socket.on('room:created', ({ roomId }) => {
  console.log('Room created:', roomId);
});
```

## Project Structure

```
server/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── roomController.js
│   │   └── messageController.js
│   ├── models/               # MongoDB schemas
│   │   ├── User.js
│   │   ├── Room.js
│   │   └── Message.js
│   ├── routes/               # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── rooms.js
│   │   └── messages.js
│   ├── middleware/           # Custom middleware
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── services/             # Business logic
│   │   └── socketService.js
│   ├── utils/                # Helpers
│   │   ├── jwt.js
│   │   └── validators.js
│   ├── app.js                # Express app setup
│   └── server.js             # Server entry point
├── tests/                    # Test files
├── .env.example              # Environment template
├── .gitignore
├── package.json
└── README.md
```

## Testing

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Deployment

### Heroku
```bash
heroku create secretcalc-api
heroku config:set JWT_SECRET=your_secret
heroku config:set MONGO_URI=your_mongodb_uri
git push heroku main
```

### Docker
```bash
docker build -t secretcalc-server .
docker run -p 4000:4000 --env-file .env secretcalc-server
```

## Security Best Practices

1. **Never commit .env file** - Contains sensitive credentials
2. **Use strong JWT_SECRET** - Generate with: `openssl rand -base64 64`
3. **Enable HTTPS** in production
4. **Set NODE_ENV=production** in production
5. **Use MongoDB Atlas** with IP whitelist
6. **Enable rate limiting** - Already configured
7. **Validate all inputs** - express-validator in place
8. **Sanitize base64 data** - Size limits enforced

## Common Issues

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running: `mongod`

### JWT Secret Missing
```
Error: secretOrPrivateKey must have a value
```
**Solution:** Set `JWT_SECRET` in .env file

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Add your frontend URL to `ALLOWED_ORIGINS` in .env

## Performance Tips

- Use MongoDB indexes (already configured in models)
- Enable compression middleware (included)
- Use connection pooling for MongoDB
- Implement caching for frequently accessed data (Redis)
- Use CDN for media files in production (instead of base64)

## License

MIT

## Author

Syed Abbas Ali

## Support

For issues and questions, please open an issue on GitHub.
