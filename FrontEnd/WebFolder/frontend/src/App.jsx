import React, { useState, useEffect } from 'react'

import './App.css'
import{ io }from "socket.io-client";
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4} from  'uuid';

// temporary the localhost is used/
const socket = io("http://localhost:3002", {transports: ["websocket"]});

function App_main({onLogin}) {

const navigate = useNavigate();

  const [username, setUserName] = useState ("");
  const [roomId, setRoomId] = useState(""); //from index.js of user-service 
// boolean
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // to communicate with io in on the FE side, useEffect() is used.

  useEffect( () => {
    // 🧹 Clear all old user/session data
    localStorage.clear();
    console.log("🧹 Cleared localStorage for a clean start");

     // 🔥 per-tab session
  const sessionId = uuidv4();
  localStorage.setItem("sessionId", sessionId);
  console.log("🆔 Tab sessionId:", sessionId);
  }, []); // ✅ runs only once when the app first loads


  const handleLogin = async()=> {
  const savedToken = localStorage.getItem("token");
  const savedUserId = localStorage.getItem("userId");
  const savedUsername = localStorage.getItem("username");
  // 1. If a user already has valid info, reuse it instead of re-logging
if (savedToken && savedUserId && savedUsername) {
    console.log("🔁 Reusing existing login:", savedUsername, savedUserId);
    onLogin({ username: savedUsername, userId: savedUserId, token: savedToken });
    navigate("/Home");
    return;
  }
  // 2. Only call /login once (first time)
   if (!username.trim()){
     alert("Please enter a username!");
      return;
    }
    setLoading(true);

    try{
      const res = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
        if (data.success) {
        const { user } = data;
        console.log("✅ Logged in:", data.user);

        // Save locally
        localStorage.setItem("userId", data.user.userId);
        localStorage.setItem("username", data.user.username);
        localStorage.setItem("token", data.user.token);

        onLogin(user); // callback to App
        navigate("/Home");
      } else {
        alert(data.message || "Login failed");
      }
    }
    catch(error){
      console.error("The server error ",error);
      alert("The server error");
    }finally{
      setLoading(false);
    };
  };


  return (
      
      <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>👋 Login to Game</h2>
      <input
        placeholder="Enter username"
        value={username}
        onChange={(e) => setUserName(e.target.value)}
        disabled={loading}
      />
      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>

  );
}

export default App_main;
