const { server, connectDB } = require('./app');

const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB();

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   SecretCalc Server                   ║
║   🚀 Server running on port ${PORT}     ║
║   📡 Socket.IO enabled                ║
║   🔐 Authentication: JWT              ║
║   📦 Environment: ${process.env.NODE_ENV || 'development'}        ║
╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
