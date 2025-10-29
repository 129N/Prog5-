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

import { v4 as uuidv4, validate } from "uuid";
import { validate as uuidValidate } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

//to use jwt, the secret key is needed.
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;

//set up the port in this case 3002
const port = process.env.port || 3002;

// create HTTP + WebSocket serevr
const server = http.createServer(app);
const io = new Server(server, {
    cors:{origin: "*"}
});

// const {validate: uuidValidate} = require("uuid");


const rooms = [];

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
    players:[{username, userId}], messages: []};

    console.log(`🏠 Room created by ${username} (${userId}) — ${roomName} (${roomId})`);

    res.json({
      success: true,
      roomId,
      roomName,
      host: username,
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
    socket.on('join_room', ({roomId, token}) => {
    try{    
      
      const decoded = jwt.verify(token, SECRET_KEY);
      const { username, userId } = decoded;

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

        //
        if(!Array.isArray(room.players)){
          room.players = [];
        }

        //continue only if the room exist
        const duplicate = room.players.find(p => p.username === username);
        if(duplicate){
          socket.emit("error", { message: 'User name already taken in this room' });
          return;
        }

// ✅ Add player object with socket.id
        const player = {username,userId, socketId: socket.id};
        room.players.push(player);

        // const alreadyInRooom = room.players.includes(username);
        // if(!alreadyInRooom){
        //     room.players.push(username);
        //     console.log(`👥 ${username} joined room ${roomId}`);
        // }

        
  // ✅ 4. Valid join — proceed
        socket.join(roomId);
        socket.username = username;
        socket.userId = userId;

        console.log(`👥 ${username} joined room ${roomId}`);

        socket.emit('join_success', { roomId, username });
        io.to(roomId).emit('system_message', `${username} joined the room.`);
        io.to(roomId).emit('update_players', rooms[roomId].players);
      } catch(err){
          console.error("JWT verification failed:", err);
          socket.emit('error', { message: 'Invalid or expired token' });
        }
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
       const room = rooms[roomId];
        if(!room){
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if(!room.readyPlayers) {
          room.readyPlayers = new Set();
        }

        if(ready){
          room.readyPlayers.add(username);
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
        io.to(roomId).emit("game_start", room.players);
      } catch (err) {
        console.error("❌ Error starting game:", err);
        console.error("the port has not created yet !!");
        io.to(roomId).emit("system messgae", "Failed to start game");
      }
  }

    });
    

    socket.on('leave_room', ({roomId, username})=>{
        const room = rooms[roomId];
        if(!room) return;

        socket.leave(roomId);

        //Remove Player
       room.players = rooms[roomId].players.filter(p =>p !== username ); 
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
    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        const room = rooms[roomId];
        if (!room.players) continue;
        const idx = room.players.findIndex(p =>p.socketId === socket.id);
        if(idx !== -1){
          const [left] = room.players.splice(idx, 1);
          console.log(`❌ ${left.username} disconnected from ${roomId}`);
          io.to(roomId).emit("system_message", `${left.username} left the room.`);
          io.to(roomId).emit("update_players", room.players);
        }
      }
    });

});


    // socket.on('disconnect', ()=> {
    //     console.log(`❌ Client disconnected: ${socket.id}`);  
    // });

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