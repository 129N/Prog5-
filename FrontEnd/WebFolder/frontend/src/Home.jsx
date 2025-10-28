import React, { useState, useEffect } from 'react'
import './App.css'
import{ io }from "socket.io-client";
import { useNavigate } from 'react-router-dom';



// temporary the localhost is used/
const socket = io("http://localhost:3002", {transports: ["websocket"]});

function UserService() {

const navigate = useNavigate();



  const [roomId, setRoomId] = useState(""); //from index.js of user-service 

  const [messages, setMessages] = useState([]);
  const [players, setPlayers] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [room, setRoom] = useState("");

// boolean
  const [created, setCreated] = useState(false); 
  const [connected, setConnected] = useState(false);
  const [joning, setJoining] = useState(false);
  // to communicate with io in on the FE side, useEffect() is used.
  const [username, setUserName] = useState ("");
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");
  useEffect(() => {

    const username = localStorage.getItem("username");
    const LoadId =localStorage.getItem("userId");
    const LoadToken =localStorage.getItem("token");

      if (username && LoadId && LoadToken) {
      setUserName(username);
      setUserId(LoadId);
      setToken(LoadToken);
    } else {
      // if missing, redirect back to login
      alert("⚠️ Please log in first!");
      navigate("/");
    }
  }, [navigate]);


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
    
    socket.on("error", (err)=> {
      alert(err.message || "Error occured");
    });

    return() => {
      socket.off("system_message");
      socket.off("chat_message");
      socket.off("update_players");
      socket.off("error");
    };


  }, []);


  useEffect(()=>{
    socket.on("join_success",({roomId})=>{
      console.log("✅ Successfully joined room:", roomId);
      setJoining(false);
    navigate(`/room/${roomId}`);
    });

    socket.on("error", (err)=>{
      alert(err.message || "Server error");
      setJoining(false);
    });

     return () => {
    socket.off("join_success");
    socket.off("error");
  };
  }, [navigate]);

  const createRoom = async() => {
    if(!roomName || !username){
      alert("Please fill the blunk!");
      return;
    }

    try{
        const res = await fetch("http://localhost:3002/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName, username }),
        });

        const data = await res.json();
      console.log("Backend response:", data); // 👈 debug here
      
      if(data.success){
        console.log("✅ Room created:", data);
        alert(`Room ${data.roomName} created successfully!`);

         // Save username globally before navigation

        // setUserName(username);
        setRoomId(data.roomId); // optional: auto-fill roomId field
        setRoomName(data.roomName);
        setRoom(room);

        //toggle function
        setCreated(true);

        socket.emit("join_room", { roomId: data.roomId, username });
      }

    }
    catch(error){
      console.error("Error creating room:", error);
      alert("⚠️ Error connecting to server.");
    }

  };

  const handleLogin = async()=> {
    //checks the blunk
    if(!roomId){
      alert("Please fill the blunk!");
      return;
    }

    // open the useEffect and the typed id will sent to the backend.
    else{
      setJoining(true);
      socket.emit("join_room", { roomId, username });  // username from localStorage
      setTimeout(() => setJoining(false), 3000);
    }
 
  };

  const sendMSG = () => {
     if (messageInput.trim()) {
      console.log("📤 Sending message:", messageInput);
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

const handleLogout = () => {
  localStorage.clear();
  alert("✅ Logged out and localStorage cleared!");
  navigate("/");
};

  return (

      <div style={{ padding: "2rem", fontFamily: "Arial" }}>
        <h2>🏠 Room Service Test Client</h2>
        <h1> This is header user-service room</h1>
        <h2>create button to connecttion test</h2>
        <h2>create room</h2>


{!connected ? (

        <div>
                    <button onClick={handleLogout}>Logout</button>
          <input
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
          />
          <input
            placeholder="Enter new room name"
            value={roomName || ""}
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

export default UserService;
