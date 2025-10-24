import React, { useState, useEffect } from 'react'

import './App.css'
import{ io }from "socket.io-client";
import { useNavigate } from 'react-router-dom';


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

  }, []);


  const handleLogin = async()=> {
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
        console.log("✅ Logged in:", user);

        // Save locally
        localStorage.setItem("userId", user.userId);
        localStorage.setItem("username", user.username);
        localStorage.setItem("token", user.token);

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
      <h2>👋 Login to Funny Game</h2>
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
