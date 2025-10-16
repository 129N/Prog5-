// testClient.js
const { io } = require('socket.io-client');
// Connect to your Room Service
const socket = io('http://localhost:3002', {
  transports: ['websocket'],
});


const roomId = 'f7698463-0988-4012-bdf2-a4187c92b655'; // Replace with actual ID
const username = 'Alice';

socket.on('connect', () => {
  console.log(`✅ Connected to Room Service as ${username}`);

  setTimeout(() => {
     console.log(`👉${username} Joining room now..`);
    socket.emit('join_room', { roomId, username })}, 500);
  setTimeout(() => {
    socket.emit('chat_message', { roomId, username, message: 'Hello everyone!' });
  }, 3000);
});

socket.on('system_message', (msg) => console.log('[System]', msg));
socket.on('chat_message', (msg) => console.log('[Chat]', msg.username + ':', msg.message));
socket.on('update_players', (list) => console.log('[Players]', list));
