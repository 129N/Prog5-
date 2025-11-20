// const express = require('express');
// const {Server} = require('socket.io');
// const http = require('http');
//const cors = require('cors');
// const { v4: uuidv4, validate } = require('uuid');
import express from "express";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { validate as uuidValidate } from "uuid";
import { hostname } from "os";

const app = express();
app.use(cors());
app.use(express.json());

//to use jwt, the secret key is needed.
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;
const REFRESH_KEY = process.env.REFRESH_KEY;
//set up the port in this case 3002
const port = process.env.port || 3002;

// create HTTP + WebSocket serevr
const server = http.createServer(app);
const io = new Server(server, {
    cors:{origin: "*"}
});

// const {validate: uuidValidate} = require("uuid");


const rooms = {};

//Create a team 
app.post('/create', (req, res)=> {
    const {roomName} = req.body;
    const authHeader = req.headers.authorization;

    if (!roomName) return res.status(400).json({ error: 'roomName is required' });

      // 🔒 Require token
    if (!authHeader || !authHeader.startsWith("Bearer ") ) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(" ")[1];

    try{
      const decoded = jwt.verify(token, SECRET_KEY);
      const {username, userId} = decoded;
  
    const roomId = uuidv4();
    rooms[roomId] = {id : roomId, name : roomName, host:{username, userId}, 
    players:[{username, userId}], readyPlayers: new Set([username]), messages: []};
//host auto ready
    console.log(`🏠 Room created by ${username} (${userId}) — ${roomName} (${roomId})`);

    res.json({
      success: true,
      roomId,
      roomName,
      hostId: userId,   // ✔ store host userId
      hostname: username
    });
        console.log(`🏠 Room created: ${roomName} (${roomId})`);
    }
    catch  (err) {
    console.error("JWT verification failed:", err);
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
});



//websocket real-time connection
io.on('connection', (socket)=> {
    console.log(`⚡room Client connected: ${socket.id}`);
    //join, chat, leave. 

    //username is shared with user-service? 
    socket.on('join_room', ({roomId, token, sessionId }) => {
    try{    
      const decoded = jwt.verify(token, SECRET_KEY);
      const username = (decoded.username || "").trim();
      const userId = decoded.userId;

      console.log("✅ Token decoded:", { username, userId, roomId });
      // console.log("👥 Current players in room:", room.players.map(p => p.username));
      if (!username || !userId) {
        socket.emit("error", { message: "Invalid token payload" });
        return;
      }
//1 : check validation
      if(!uuidValidate(roomId)){
        socket.emit('error', { message: 'BE : Invalid room ID format' });
        return;
      }
//2 : after the Id is valid, checks the room being.
      const room = rooms[roomId];
        if(!room){
            socket.emit('error', { message: 'BE : Room not found' });
            return;
        }

        if(!Array.isArray(room.players)){ room.players = []; }

 // ✅ If the same userId already exists, allow rejoin
const existingPlayer = room.players.find(p => p.userId === userId);

if (existingPlayer) {
  existingPlayer.socketId = socket.id;
  console.log(`♻️ ${username} reconnected to room ${roomId}`);
} else {
  room.players.push({ userId, username, socketId: socket.id });
  console.log(`👥 NEW USER!! \n ${username} joined room ${roomId}`);
}

if (room.readyPlayers) {
  room.readyPlayers = new Set(
    Array.from(room.readyPlayers).filter(u => room.players.some(p => p.username === u))
  );
}


// ✅ Add player object with socket.id
        // const newplayer = { userId: userId, username: username, socketId: socket.id };
        // room.players.push(newplayer);
        
// ✅ 4. Valid join — proceed
        socket.join(roomId);
        socket.username = username;
        socket.userId = userId;

        console.log(`👥 ${username} joined room ${userId}`);
// join room success
socket.emit('join_success',{
 roomId,
  username,
  host: {
    userId: room.host.userId,
    username: room.host.username
  }
});

        io.to(roomId).emit('system_message', `${username} joined the room.`);
        io.to(roomId).emit('update_players', room.players); // const room = rooms[roomId];
      console.log(　"👥 Current players:",room.players.map(p => p.username) );
      } catch(err){
          console.error("JWT verification failed:", err);
          socket.emit('error', { message: 'Invalid or expired token' });
        }
    });

//chat system 
    socket.on('chat_message', ({roomId, message}) => 
    {
      const room = rooms[roomId];  
        if(!room){
            socket.emit('error', { message: 'message error' });
            return;
        }   
        
        if (!socket.username || !socket.userId) {
        socket.emit("error", { message: "Not joined; cannot send messages" });
        return;
        }

        const msg = {username: socket.username, userId: socket.userId, message};
        room.messages.push(msg);
        io.to(roomId).emit('chat_message', msg);
        console.log(`💬 ${socket.username} in ${roomId}: ${message}`);
    });

// player (Non-host) ready condition
    socket.on("player_ready", async ({roomId, username, ready}) => {
       const room = rooms[roomId];
      if(!room){
        socket.emit('error', { message: 'Room not found' });
        return;
      }

// Create set if missing
      if(!room.readyPlayers) {
        room.readyPlayers = new Set();
      }

      if(ready){room.readyPlayers.add(socket.userId);} 
      else{room.readyPlayers.delete(socket.userId); }

      io.to(roomId).emit(
      "system_message",
      `${username} is ${ready ? "ready" : "not ready"}.`
      );
      
  // Broadcast ready status to update UI
    io.to(roomId).emit("ready_update", {
      readyPlayers: Array.from(room.readyPlayers),
      totalPlayers: room.players.length,
    });
      console.log(`[READY] ${username}: ${ready} (${room.readyPlayers.size}/${room.players.length})`);
  });

socket.on("get_ready_state", ({ roomId }) => {
  const room = rooms[roomId];
  if (!room) return;

  io.to(socket.id).emit("ready_update", {
    readyPlayers: Array.from(room.readyPlayers || []),
    totalPlayers: room.players.length
  });
});


  socket.on ("host_start_game", async({ roomId, username }) => {
    const room = rooms[roomId];

    if (!room) {
    socket.emit("error", { message: "Room not found" });
    return;}

 // Ensure ONLY host can press start
  if (room.host.userId !== socket.userId) {
    socket.emit("error", { message: "Only the host can start the game." });
    return;
  }

// Ensure ALL players are ready 
  if (!room.readyPlayers || room.readyPlayers.size !== room.players.length) {
    socket.emit("error", { message: "Not all players are ready." });
    return;
  }

  console.log(`🚀 Host ${username} is starting game in room ${roomId}`);
  console.log(`✅ All players ready in ${roomId}. Starting game...`);

 // Tell FE that navigation should start
  io.to(roomId).emit("game_start", {
    roomId,
    players: room.players,
  });
try {
    const res = await fetch("http://localhost:3003/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, players: room.players }),
    });

      const data = await res.json();
      console.log("🎮 GameRules Service response:", data);

      io.to(roomId).emit("system_message", "🎮 Game starting!");
      // io.to(roomId).emit("game_start", room.players);

      } catch (err) {
      console.error("❌ Error starting game:", err);
      console.error("the port has not created yet !!");
      io.to(roomId).emit("system messgae", "Failed to start game");
    }


  });
    

socket.on('leave_room', ({ roomId }) => {
  const room = rooms[roomId];
  if (!room) return;

  socket.leave(roomId);

  // remove by socket.userId (set in join)
  room.players = room.players.filter(p => p.userId !== socket.userId);
  if (room.readyPlayers) room.readyPlayers.delete(socket.username); // or use userId if you switch

  console.log(`👥 ${socket.username} left room ${roomId}`);
  io.to(roomId).emit('system_message', `${socket.username} left the room.`);
  io.to(roomId).emit('update_players', room.players);

  socket.emit("left_success", { roomId });

  if (room.players.length === 0) {
    delete rooms[roomId];
    console.log(`🗑️ Room ${roomId} deleted (no players left).`);
  }
});


    //disconnect
socket.on("disconnect", () => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (!room.players) continue;

    const idx = room.players.findIndex(p => p.socketId === socket.id);
    if (idx !== -1) {
      const [left] = room.players.splice(idx, 1);
      console.log(`❌ ${left.username} disconnected from ${roomId}`);
      io.to(roomId).emit("update_players", room.players);

      // 🧹 optional: clear ready status
      if (room.readyPlayers) room.readyPlayers.delete(left.userId);
    }
  }
});


});


app.get('/', (req, res) => {
    res.send(`User room is running on ${port}`);
});

app.get('/rooms', (req, res)=> {

    res.json(rooms);
});

app.get("/room/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];

  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found" });
  }

  return res.json({
    success: true,
    roomId,
    roomName: room.roomName,
    host: room.host,
    players: room.players,
  });
});


server.listen(port, ()=> {
    console.log(`✅ Service started on http://localhost:${port}`);
});