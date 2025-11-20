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

//room updates 
function broadcastRoomUpdates (io, roomId) {
  const broadCastRoom = gamerooms[roomId];

  if(!broadCastRoom)return;
//room update 
    io.to(roomId).emit('room_update',{
        players: broadCastRoom.players,
        assignments: broadCastRoom.assignments || {},
        currentRound: broadCastRoom.currentRound || 0,
        state: broadCastRoom.state || "waiting",
    });

}

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

function finishRound(roomId){
  const room = gamerooms[roomId];
  const totalThumbs = room.thumbcount || 0;


  const authors = room.assignments;

  for(let cat of CATS){
    const author = authors[cat];
    room.scores[author] = (room.scores[author] || 0) + totalThumbs;
  }

  io.to(roomId).emit("round_end", {
    summary: totalThumbs,
    scores: room.scores,
  });

  //reset 
  room.thumbcount = 0;
  room.doneUsers = {};
  room.submissions = {};

   // Advance to next round
  room.currentRound++;

  //If game is over,
   if (room.currentRound > room.maxRounds) {
    io.to(roomId).emit("game_over", {
      scores: room.scores
    });
    return;
  }

   // New assignments
  room.assignments = chooseRandom(room.players, room.currentRound - 1);

  // 🔥 Start next round
  io.to(roomId).emit("round_start", {
    round: room.currentRound,
    assignments: room.assignments,
    categories: CATS,
  });
room.state = "assignment";
broadcastRoomUpdates(io, roomId);

}

//const allSubmitted = (sub) => CATS.every(c => typeof sub[c] === "string" && sub[c].trim().length > 0);
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
    currentRound: 1, 
    maxRounds,
    //scores: players.reduce((acc, p) => ({ ...acc, [p]: 0 }), {}), //
    scores: Object.fromEntries(players.map(p => [p.userId, 0])),
assignments : chooseRandom(players, 0), //    assignments : chooseRandom(gamerooms[roomId].players, 0),
    submissions: {},
    votes: {},
    history: [],
    messages: [],
  };

  io.to(roomId).emit("round_start", {
    round: gamerooms[roomId].currentRound,
    assignments: gamerooms[roomId].assignments,
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

         broadcastRoomUpdates(io, roomId);
    } );

//room update 

//play game, 
    socket.on ('game_start', (roomId) => {

    const GMstartroom = gamerooms[roomId];
    if (!GMstartroom) return;

    GMstartroom.state = "playing";

    io.to(roomId).emit("game_start", {
      players: GMstartroom.players, 
    });

      broadcastRoomUpdates(io, roomId);
    });

//submit the word 
socket.on('submit_word', ({roomId, cat, text, username}) =>{

  const room = gamerooms[roomId];
  if(!room) return;

  room.submissions = room.submissions || {};
  room.submissions[cat] = {text, username};
  // All categories submitted?
 if (CATS.every(c => room.submissions[c])) {
    // Build sentence
    const sentence = makeSentence({
      WHEN: room.submissions.WHEN.text,
      WHERE: room.submissions.WHERE.text,
      WHO: room.submissions.WHO.text,
      WHAT: room.submissions.WHAT.text
    });

    // Send to all FE
    io.to(roomId).emit("sentence_ready", {
      sentence,
      submissions: room.submissions,
      assignments: room.assignments,
    });
  }

  broadcastRoomUpdates(io, roomId);

});

//send msg 
socket.on('send_message', ({roomId, username, text}) =>{
    if (!gamerooms[roomId]) return;
    const msg = {username, text};
    gamerooms[roomId].messages.push(msg);
    io.to(roomId).emit('chat_message', msg);
    console.log(`${username} sent ${text}`);
});

//decalre the starting the vote
socket.on("start_thumbs", ({ roomId }) => {
  const room = gamerooms[roomId];
  if (!room) return;

  room.state = "thumbs";
  broadcastRoomUpdates(io, roomId);
});


// Simple scoring system (thumb up)
  socket.on('thumb_click', ({ roomId, username }) => {
    const room = gamerooms[roomId];
    if(!room) return;

     room.thumbcount = (room.thumbcount || 0) + 1;

     io.to(roomId).emit("thumb_live_update", room.thumbcount);
      broadcastRoomUpdates(io, roomId);
  });

// User finishes voting
socket.on("thumb_done", ({ roomId, username }) => {
  const room = gamerooms[roomId];
  if (!room) return;

  room.doneUsers = room.doneUsers || {};
  room.doneUsers[username] = true;

  //stores 
  if (Object.keys(room.doneUsers).length === room.players.length) {
    finishRound(roomId);
  }
});



// when someone leave room, 
socket.on("leave_room", ({ roomId, username }) => {
    socket.leave(roomId);

    // rooms[roomId].players = rooms[roomId].players.filter(p => p !== username);
  const room = gamerooms[roomId];
    if (!room) return;

    room.players = room.players.filter(p => p.username !== username);
    broadcastRoomUpdates(io, roomId);
});


  //disconecct 
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