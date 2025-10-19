const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');


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


let rooms = [];

//Create a team 
app.post('/create', (req, res)=> {
    const {roomName} = req.body;
    if (!roomName) return res.status(400).json({ error: 'roomName is required' });

    const roomId = uuidv4();
    rooms[roomId] = {name : roomName, players:[], messages: []};

    console.log(`🏠 Room created: ${roomName} (${roomId})`);
    res.json({ success: true, roomId });
});



//websocket real-time connection
io.on('connection', (socket)=> {
    console.log(`⚡ Client connected: ${socket.id}`);


    //join, chat, leave. 

    //username is shared with user-service? 
    socket.on('join_room', ({roomId, username}) => {

        if(!rooms[roomId]){
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        socket.join(roomId);
        rooms[roomId].players.push(username);

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

    socket.on('leave_room', ({roomId, username})=>{
        if(!rooms[roomId]) return;

        socket.leave(roomId);
        rooms[roomId].players = rooms[roomId].players.filter(p =>p != username ); 

        console.log(`👥 ${username} left room ${roomId}`);

        io.to(roomId).emit('system_message', `${username} left the room.`);
        io.to(roomId).emit('update_players', rooms[roomId].players);
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