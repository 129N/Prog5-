const { io } = require('socket.io-client');
const socket = io('http://localhost:3003', { transports: ['websocket'] });

const roomId = 'game1';
const username = process.argv[2] || 'Alice';

socket.on('connect', () => {
  console.log(`✅ Connected as ${username}`);
  socket.emit('join_game', { roomId, username });

  // send message
  setTimeout(() => {
    socket.emit('send_message', { roomId, username, text: 'Ready to play!' });
  }, 1000);

  // simulate thumb up
  setTimeout(() => {
    socket.emit('add_point', { roomId, target: 'Bob' });
  }, 2000);
});

socket.on('chat_message', (msg) => console.log(`[Chat] ${msg.username}: ${msg.text}`));
socket.on('update_scores', (scores) => console.log('🏆 Scores:', scores));
socket.on('system_message', (msg) => console.log('[System]', msg));
