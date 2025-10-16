import React, { useState, useEffect } from 'react'

import './App.css'
import{ io }from "socket.io-client";


// temporary the localhost is used/
const socket = io("http://localhost:3002", {transports: ["websocket"]});

function App() {


  const [username, setUserName] = useState ("");
  const [roomId, setRoomId] = useState(""); //from index.js of user-service 

  const [messages, setMessages] = useState([]);
  const [players, setPlayers] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [roomName, setRoomName] = useState("");

// boolean
  const [created, setCreated] = useState(false); 
  const [connected, setConnected] = useState(false);

  // to communicate with io in on the FE side, useEffect() is used.

  useEffect( () => {
    socket.on("connect", () => console.log("✅ Connected to Room Service"));
    socket.on("system_message", (msg) =>
          setMessages((prev) => [...prev, { username: "System", text: msg }])
    );
    // what is the meaning of prev? role?
    socket.on("chat_message", (msg)=> {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("update_players", (list)=> setPlayers(list));

    return() => {
      socket.off("system_message");
      socket.off("chat_message");
      socket.off("update_players");
    };


  }, []);


  const createRoom = async() => {
    if(!username){
      alert("Please type your name!");
      return;
    }

    try{

        const res = await fetch("http://localhost:3002/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });

        const data = await res.json();

      if(data.success){
        console.log("✅ Room created:", data);
        alert(`Room "${data.roomName}" created successfully!`);
        setRoomId(data.roomName); // optional: auto-fill roomId field
        setCreated(true);
      }

    }
    catch(error){
      console.error("Error creating room:", error);
      alert("⚠️ Error connecting to server.");
    }

  };

  const handleLogin = async()=> {
     if (username && roomId) {
      socket.emit("join_room", { roomId, username });
      setConnected(true);
    }
  };

  const sendMSG = () => {
     if (messageInput.trim()) {
      socket.emit("chat_message", {
        roomId,
        username,
        message: messageInput,
      });
      setMessageInput("");
    }
  }; 

  const handleNavigate = () => {
    navigate(`/room/${roomId}`);
  };

  return (

      <div style={{ padding: "2rem", fontFamily: "Arial" }}>
        <h2>🏠 Room Service Test Client</h2>
        <h1> This is header user-service room</h1>
        <h2>create button to connecttion test</h2>
        <h2>create room</h2>


{!connected ? (

        <div>
          <input
            placeholder="Enter new room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button onClick={createRoom}>Create Room</button>

          {created ? (
              <>
                <p>✅ Room created successfully — you can now join it!</p>
                <button onClick={handleNavigate}> Goto room</button>
              </>

          ) : (
            <p>💡 You can create a new room above.</p>
          )}

          <hr/>

        <h2>join room </h2>
           <input
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
          />
          <input
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={handleLogin}>Join Room</button>

        </div>

        ):(
          
        <div>
           <h3>Room: {roomId}</h3>
          <p>Players: {players.join(", ")}</p>

          <div
            style={{
              border: "1px solid gray",
              height: "200px",
              overflowY: "auto",
              padding: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            {messages.map((msg, idx) => (
              <div key={idx}>
                <strong>{msg.username}:</strong> {msg.text || msg.message}
              </div>
            ))}
          </div>

          <input
            placeholder="Type message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
          />
          <button onClick={sendMSG}>Send</button>
        </div>

        )}

 </div>

  );
}

export default App;
