const { Expo } = require('expo-server-sdk');

const expo = new Expo();

async function sendPushAsync(messages) {
  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    return tickets;
  } catch (err) {
    console.error('Expo push error:', err);
    return [];
  }
}

async function notifyUsers(tokens = [], { title, body, data = {}, sound = 'default', ttl = 86400 }) {
  if (!tokens.length) return [];
  const messages = tokens
    .filter((to) => Expo.isExpoPushToken(to))
    .map((to) => ({ to, title, body, data, sound, priority: 'high', ttl }));
  if (!messages.length) return [];
  return await sendPushAsync(messages);
}

module.exports = { notifyUsers };
