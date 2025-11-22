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
        state: broadCastRoom.state ,//FIXED
    });
console.log("📡 ROOM_UPDATE EMIT:", roomId, "STATE =", broadCastRoom.state);

}

// make the words players need to use in the game.
//const CATS = ["WHEN", "WHERE", "WHO", "WHAT"];


function getCategoriesForPlayerCount(n) {
  // if (n === 2) return ["WHEN", "WHERE"];
  // if (n === 3) return ["WHEN", "WHERE", "WHO"]; // each player has 4 categories 
  return ["WHEN", "WHERE", "WHO", "WHAT"];
}


const chooseRandom = (players, roundIndex, categories) => {
  // Rotate players per round; if players < 4, wrap
  // Return { WHEN: userId, WHERE: userId, WHO: userId, WHAT: userId }
  const ids = players.map(p => p.userId);
 let assignments = {};

  categories.forEach((cat, i) => {
    assignments[cat] = ids[(i + roundIndex) % ids.length];
  });

  return assignments;

};

function finishRound(roomId){
  const room = gamerooms[roomId];
  const totalThumbs = room.thumbcount || 0;
  const authors = room.assignments;

  for (let cat of room.categories){
    const author = authors[cat];
    room.scores[author] = (room.scores[author] || 0) + totalThumbs;
  }

  io.to(roomId).emit("round_end", {
    summary: totalThumbs,
    scores: room.scores,
    score: totalThumbs,
    sentence: makeSentence(room.submissions, room.categories),
  });

   room.history.push({
    round: room.currentRound,
    sentence: makeSentence(room.submissions, room.categories),
    score: totalThumbs
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
      scores: room.scores,
       history: room.history
    });
    return;
  }

   // New assignments
  room.assignments = chooseRandom(room.players, room.currentRound - 1, room.categories);

  // 🔥 Start next round
  io.to(roomId).emit("round_start", {
    round: room.currentRound,
    assignments: room.assignments,
    categories: room.categories,
  });
room.state = "assignment";
broadcastRoomUpdates(io, roomId);

}

//const allSubmitted = (sub) => CATS.every(c => typeof sub[c] === "string" && sub[c].trim().length > 0);
function makeSentence(submissions, categories) {
  return categories
    .map(cat => submissions[cat] || "")
    .join(", ") + ".";
}

//room.submissions[cat] = { text, username };
// FIXED submissions[cat] from submissions[cat].text

app.post('/start',(req, res)=> {
    const {roomId, players, maxRounds = 3} = req.body;
    
  if (!roomId || !players || !Array.isArray(players)) {
    return res.status(400).json({ error: 'roomId and players[] are required' });
  }

  if(gamerooms[roomId]){
    return res.status(400).json({error: 'Game already exists for this room' });
  }

//if 2 players, the CATS ditributed to 2, if 3 one of them needs to twice
  const categories = getCategoriesForPlayerCount(players.length);

  //the necesarry components to be used in this index.js
  gamerooms[roomId] ={
    roomId,
    players: players.map(p=> ({userId: p.userId, username: p.username})),
    currentRound: 1, 
    maxRounds,
    //scores: players.reduce((acc, p) => ({ ...acc, [p]: 0 }), {}), //
    scores: Object.fromEntries(players.map(p => [p.userId, 0])),
    categories,
    assignments : chooseRandom(players, 0, categories), // FIXED :   assignments : chooseRandom(gamerooms[roomId].players, 0),
    submissions: {},
    votes: {},
    history: [],
    messages: [],
    state: "assignment", //FIXED
  };

  
//FIXED
  console.log(`${roomId} in ${players.map(p => p.username).join(', ')}`);
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
        console.log(`👥 ${username} joined game room ${roomId}`);

         // FIXED
         io.to(socket.id).emit('round_start', {
          round: room.currentRound,
          assignments: room.assignments,
          categories: room.categories
         });

         //io.to(roomId).emit('system_message', `${username} joined the game.`);

        broadcastRoomUpdates(io, roomId);
    } );



//submit the word 
socket.on('submit_words', ({roomId, cat, text, username, words}) =>{

  const room = gamerooms[roomId];
  if(!room) return;

// ensure correct player assignment
  const player = room.players.find(p => p.username === username);
  if (!player) return;

const assignedCats = Object.keys(room.assignments);

for(const cat of assignedCats){
  if(room.assignments[cat] === player.userId){
    if(words[cat]){
      room.submissions[cat] = words[cat];
        console.log(`✅ ${username} submitted ${cat}: ${words[cat]}`);
    }
  }
}
console.log("Current submissions:", room.submissions);


// Check if everyone finished
const allDone = assignedCats.every(c => room.submissions[c]);
  if(allDone) {
    const sentence = makeSentence(room.submissions, room.categories);

  // Broadcast once to all clients
    io.to(roomId).emit("sentence_ready", {
      sentence,
      submissions: room.submissions,
      assignments: room.assignments,
      categories: room.categories // FIXED needs to be sent
    });

    room.state = "sentence_ready";
    broadcastRoomUpdates(io, roomId);
  }else{

    room.state = "submit_in_progress";
      io.to(socket.id).emit("room_update", {
        players: room.players,
        assignments: room.assignments,
        currentRound: room.currentRound,
        state: room.state
      });
  }

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