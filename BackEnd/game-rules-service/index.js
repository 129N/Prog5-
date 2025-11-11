const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

//set up the port in this case the game-rule service has 3003
const port = process.env.port || 3003;

// create HTTP + WebSocket serevr
const server = http.createServer(app);
const io = new Server(server, {
    cors:{origin: "*"}
});


//game = {roomId: { players: [names], scores: {name: points}, messages: [] }};

const gamerooms = {};

// make the words players need to use in the game.
const CATS = ["WHEN", "WHERE", "WHO", "WHAT"];

const chooseRandom = (players, round) => {
  // Rotate players per round; if players < 4, wrap
  // Return { WHEN: userId, WHERE: userId, WHO: userId, WHAT: userId }
  const ids = players.map(p => p.userId);

  const pick = i => ids[(i + round) % ids.length];
    return {
    WHEN: pick(0),
    WHERE: pick(1),
    WHO:  pick(2),
    WHAT: pick(3),
  };
};

const allSubmitted = (sub) => CATS.every(c => typeof sub[c] === "string" && sub[c].trim().length > 0);
const makeSentence = (s) =>
  `${s.WHEN}, ${s.WHERE}, ${s.WHO}, ${s.WHAT}.`;

app.post('/start',(req, res)=> {
    const {roomId, players, maxRounds = 3} = req.body;
    console.log();
    
  if (!roomId || !players || !Array.isArray(players)) {
    return res.status(400).json({ error: 'roomId and players[] are required' });
  }

  if(gamerooms[roomId]){
    return res.status(400).json({error: 'Game already exists for this room' });
  }


  //the necesarry components to be used in this index.js
  gamerooms[roomId] ={
    roomId,
    players: players.map(p=> ({userId: p.userId, username: p.username})),
    round: 1, 
    //scores: players.reduce((acc, p) => ({ ...acc, [p]: 0 }), {}), //
    scores: Object.fromEntries(players.map(p => [p.userId, 0])),
    assignments : chooseRandom(players, 0), 
    submissions: {},
    votes: {},
    history: [],
    messages: [],
  };

  io.to(roomId).emit("round_start", {
    round: gamerooms[roomId].round,
    maxRounds,
    categories: CATS,
  });

  console.log(`${roomId} in ${players.join(', ')}`);
    res.json({ success: true, message: `Game room ${roomId} created`, players });
});


io.on('connection', (socket)=> {
    console.log(`⚡ Client connected: ${socket.id}`);

//notification of joining a new player
    socket.on('player_ready_join', ({roomId, username})=>{

      const room = gamerooms[roomId];
        if(!room){
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        socket.join(roomId);
        console.log(`👥 ${username} joined room ${roomId}`);

        // sends this msg
         io.to(roomId).emit('system_message', `${username} joined the game.`);
    } );


//send msg 
socket.on('send_message', ({roomId, username, text}) =>{
    if (!gamerooms[roomId]) return;
    const msg = {username, text};
    gamerooms[roomId].messages.push(msg);
    io.to(roomId).emit('chat_message', msg);
    console.log(`${username} sent ${text}`);
});

// Simple scoring system (thumb up)
  socket.on('add_point', ({ roomId, target }) => {
    if (!gamerooms[roomId] || !gamerooms[roomId].scores[target]) return;

    gamerooms[roomId].scores[target] += 1;
    console.log(`🏆 ${target} now has ${gamerooms[roomId].scores[target]} points`);

    io.to(roomId).emit('update_scores', gamerooms[roomId].scores);
  });

    socket.on('disconnect', ()=> {
        console.log(`❌ Client disconnected: ${socket.id}`);  
    });
});




app.get('/', (req, res) => {
    res.send(`User room is running on ${port}`);
});

app.get('/status', (req, res) => {
     res.json({ status: "ok", message: "GameRules Service is running" });
});

server.listen(port, ()=> {
    console.log(`✅ Service started on http://localhost:${port}`);
    // console.log(`the roomId is ${roomId}`);
});