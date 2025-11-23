// const express = require('express');
// const http = require('http');
// const {Server} = require('socket.io');
// const cors = require('cors');
// const { error } = require('console');
// const { v4: uuidv4 } = require('uuid'); // generate user IDs


import express from "express";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import jwt from "jsonwebtoken";
import { v4 as uuidv4, validate } from "uuid";
import dotenv from "dotenv";
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;
const REFRESH_KEY = process.env.REFRESH_KEY || "refresh_secret";

const app = express();
app.use(cors());
app.use(express.json());

//set up the port in this case 3001
const PORT = process.env.PORT || 3001;

// create HTTP + WebSocket serevr
const server = http.createServer(app);
const io = new Server(server, {
    cors:{origin: "*"}
});

io.on('connection', (socket)=> {
    console.log(`⚡ Client connected: ${socket.id}`);

    socket.on('disconnect', ()=> {
        console.log(`❌ Client disconnected: ${socket.id}`);  
    });
});


const users ={};


//Register or login 
app.post('/login', (req, res) => {
//Generate userId[]
  const { username } = req.body;

  //username check
  if (!username || username.trim() === "") {
    return res.status(400).json({ success: false, message: "Username is required" });
  }
    const userId = uuidv4();
    if(users[userId]) {
        console.log(`♻️ Existing user logged in again: ${username} & ${userId}`);
        return res.json({success:true, user:users[username]});
    }


    //create two tokens to prevent using an expiration token.
    const token = jwt.sign({username, userId}, SECRET_KEY, {expiresIn : "15m" });
    const refreshToken = jwt.sign({username, userId}, REFRESH_KEY, {expiresIn: "7d"});
      // Otherwise create new user
  const user = { username, userId, token, refreshToken };
    users[userId] = user;
  console.log(`🧍‍♂️ New user logged in: ${user.username} (${user.userId})`);
  console.log(`Token : ${user.token}`);
    return res.json({success : true, user });
});


//
app.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_KEY);
    const { username, userId } = decoded;
    const newToken = jwt.sign({ username, userId }, SECRET_KEY, { expiresIn: "15m" });

    users[username].token = newToken; // update stored access token

    res.json({ success: true, token: newToken });
  } catch (err) {
    console.error("Refresh failed:", err);
    res.status(403).json({ success: false, message: "Invalid refresh token" });
  }
});


//rendering zone 

app.get('/users', (req, res) => {
    res.json(users);
});

app.get('/users/:id', (req, res) => {
    const user = user.find(u => u.id === req.params.id);
    if(!user) return res.status(404).json({ error: 'User not found'});

    res.json(user);
});

app.get('/', (req, res) => {
    res.send(`User room is running on ${PORT}`);
});


server.listen(PORT,'0.0.0.0', ()=> {
    console.log(`✅ Service started on  http://192.168.0.103:${PORT}`);
});

