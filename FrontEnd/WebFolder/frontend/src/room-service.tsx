
import { cache, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { socket } from "./socket";
interface Message {
  username: string;
  text?: string;
  message?: string;
}

export default function LobbyRoom(){

  const { roomId } = useParams();  //from index.js of user-service 
  const [username, setUserName] = useState (localStorage.getItem("username") || "");


  const [messages, setMessages] = useState<Message[]>([]);
  const [players, setPlayers] = useState<String[]>([]);
  const [messageInput, setMessageInput] = useState("");

    const [roomBlunkId, setRoomId] = useState(""); //from index.js of user-service 

    const [isReady, setIsReady] = useState(false);

    // const [SC, setSocket] = useState<Socket | null>(null);

    const navigate = useNavigate();


useEffect(() => {
  socket.on("connect", () => console.log("✅ Connected to Room Service"));

    if (!username || !roomId) {
    return
  }
  
    if(roomId && username){
      socket.emit("join_room", { roomId, username });
  };


  socket.on("chat_message", (msg) =>
    setMessages((prev) => [...prev, msg])
  );

  socket.on("system_message", (msg) =>
    setMessages((prev) => [...prev, { username: "System", text: msg }])
  );

  socket.on("update_players", (list) => 
 setPlayers(list)
  );

  return () => {
    // socket.off("connect");
    socket.off("chat_message");
    socket.off("system_message");
    socket.off("update_players");
  };
}, [roomId, username]);


  const sendMSG = async() => {
     if (messageInput.trim() && socket) {
          console.log("📤 Sending message:", messageInput); // debug log
      socket.emit("chat_message", {
        roomId,
        username,
        message: messageInput,
      });
      setMessageInput("");
    }
  };


  const Gameroom = async() =>{

    if(!roomId || !username){
      alert("Please fill the blunk!");
      return;
    }

    try{

      const res = await fetch("http://localhost:3003/status");

      if(!res.ok){
        throw new Error(`Game service not responding (status ${res.status})`);
      }

      const data = await res.json();
    if (data.status === "ok") {
      alert("✅ Game Service is active! Moving to game room...");
      navigate(`/Gameroom/${roomId}`);
    } else {
      alert("⚠️ Game Service is responding but not ready yet.");
    }

    }catch(err){  
      console.error("❌ Game service unavailable:", err);
      alert("❌ GameRules Service (port 3003) is not active. Please start it first.");
    }

  navigate(`/Gameroom/${roomId}`);

  };


  const leaveRoom = async() => {
      if (username && roomId) {
      socket.emit("leave_room", { roomId, username });
      navigate("/Home");
      socket.disconnect();
    }
  }


const handleReady = async() => {

  if (!roomId || !username) return;

 try{
      const res = await fetch("http://localhost:3003/status");

      if(!res.ok){
        throw new Error(`Game service not responding (status ${res.status})`);
      }

      const data = await res.json();
    if (data.status === "ok") {
      alert("✅ Game Service is active! Moving to game room...");
      const newReady = !isReady;
    setIsReady(newReady);
    socket.emit("player_ready", { roomId, username, ready: newReady });
    } else {
      alert("⚠️ Game Service is responding but not ready yet.");
    }

    }catch(err){  
      console.error("❌ Game service unavailable:", err);
      alert("❌ GameRules Service (port 3003) is not active. Please start it first.");
    }

};

    return(
        <>
        <div style={{ padding: "2rem", fontFamily: "Arial" }}>
        <h1>🏠 Lobby Room</h1>
        <p>Connected Room ID: <strong>{roomId}</strong></p>
        <p>username is {username}</p>
        </div>
                 
           <h3>Room: {roomId}</h3>
          <p>Players: {Array.isArray(players) ? players.join(", ") : "NO Players yet"}</p>

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

    
            <input type="button" value="ready?"  onClick={handleReady}/>
          {isReady ? (<button onClick={Gameroom}>GameRoom</button>
          ) : ("🕒 Not Ready")}


          <button onClick={leaveRoom}>Leave</button>
        </>
    );
};