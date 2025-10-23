const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const { v4: uuidv4, validate } = require('uuid');


const app = express();
app.use(cors());
app.use(express.json());

//set up the port in this case 3002
const port = process.env.port || 3002;

// create HTTP + WebSocket serevr
const server = http.createServer(app);
const io = new Server(server, {
    cors:{origin: "*"}
});

const {validate: uuidValidate} = require("uuid");


let rooms = [];

//Create a team 
app.post('/create', (req, res)=> {
    const {roomName} = req.body;
    if (!roomName) return res.status(400).json({ error: 'roomName is required' });

    const roomId = uuidv4();
    rooms[roomId] = {id : roomId, name : roomName, players:[], messages: []};

    console.log(`🏠 Room created: ${roomName} (${roomId})`);
    res.json({ success: true, roomId });
});



//websocket real-time connection
io.on('connection', (socket)=> {
    console.log(`⚡ Client connected: ${socket.id}`);

    //join, chat, leave. 

    //username is shared with user-service? 
    socket.on('join_room', ({roomId, username}) => {

      if(!uuidValidate(roomId)){
        socket.emit('error', { message: 'BE : Invalid room ID format' });
        return;
      }
      const room = rooms[roomId];

        if(!room){
            socket.emit('error', { message: 'BE : Room not found' });
            return;
        }

        //continue only if the room exist
        const duplicate = room.players.find(p => p.username === username);
        if(duplicate){
          socket.emit("error", { message: 'User name already taken in this room' });
          return;
        }

        socket.join(roomId);
        room.players.push(username);

        console.log(`👥 ${username} joined room ${roomId}`);
        io.to(roomId).emit('system_message', `${username} joined the room.`);
        io.to(roomId).emit('update_players', rooms[roomId].players);
    });

    //chat system 
    socket.on('chat_message', ({roomId, username, message}) => {
        
        if(!rooms[roomId]){
            socket.emit('error', { message: 'message error' });
            return;
        }

        const msg = {username, message};
        rooms[roomId].messages.push(msg);
        io.to(roomId).emit('chat_message', msg);
          console.log(`💬 ${username} in ${roomId}: ${message}`);
    });

       socket.on("player_ready", async ({roomId, username, ready}) => {
       const room = gamerooms[roomId];
        if(!room){
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if(!room.readyPlater) {
          room.readyPlater = new Set();
        }

        if(ready){
          room.readyPlater.add(username);
        }else{
          room.readyPlayers.delete(username);
        }

      io.to(roomId).emit(
      "system_message",
      `${username} is ${ready ? "ready" : "not ready"}.`
      );
      
     // ✅ If all players ready → trigger GameRules Service
    if (room.readyPlayers.size === room.players.length) {
     console.log(`✅ All players ready in ${roomId}. Starting game...`);
      try {
        const res = await fetch("http://localhost:3003/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, players: room.players }),
        });

        const data = await res.json();
        console.log("🎮 GameRules Service response:", data);

        io.to(roomId).emit("system_message", "🎮 Game starting!");
      } catch (err) {
        console.error("❌ Error starting game:", err);
        io.to(roomId).emit("system messgae", "Failed to start game");
      }
  }

    });
    

    socket.on('leave_room', ({roomId, username})=>{
        const room = rooms[roomId];
        if(!room) return;

        socket.leave(roomId);

        //Remove Player
       room.players = rooms[roomId].players.filter(p =>p != username ); 
        if (room.readyPlayers) room.readyPlayers.delete(username);

        console.log(`👥 ${username} left room ${roomId}`);

        io.to(roomId).emit('system_message', `${username} left the room.`);
        io.to(roomId).emit('update_players', rooms[roomId].players);

        socket.emit("left_success", { roomId });
         // ✅ Delete empty rooms
  if (room.players.length === 0) {
    delete rooms[roomId];
    console.log(`🗑️ Room ${roomId} deleted (no players left).`);
  }
    });



    //disconnect
    socket.on('disconnect', ()=> {
        console.log(`❌ Client disconnected: ${socket.id}`);  
    });
});


app.get('/', (req, res) => {
    res.send(`User room is running on ${port}`);
});

app.get('/rooms', (req, res)=> {

    res.json(rooms);
});


server.listen(port, ()=> {
    console.log(`✅ Service started on http://localhost:${port}`);
});