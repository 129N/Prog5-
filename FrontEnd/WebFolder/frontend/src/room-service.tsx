
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

  if (username && roomId) {
    socket.emit("join_room", { roomId, username });
  }

  socket.on("chat_message", (msg) =>
    setMessages((prev) => [...prev, msg])
  );

  socket.on("system_message", (msg) =>
    setMessages((prev) => [...prev, { username: "System", text: msg }])
  );

  socket.on("update_players", (list) => setPlayers(list));

  return () => {
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

    // try{
    //   const response = await fetch(`http://localhost:3003/start`,  {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({ roomId, username }),
    //     });

    //     const data = await response.json();
    //   console.log("Backend response:", data); // 👈 debug here
      
    //   if(response.ok && data.success){

    //      // Save username globally before navigation
    //     localStorage.setItem("username", username);
    //     setUserName(username);

    //     //join the gameroom
    //     socket.emit("player_ready_join", {roomId, username});
    //     navigate(`/Gameroom/${roomId}`);
    //   }

    //   else {
    //   console.error("Failed to start game:", data);
    //   alert("⚠️ Failed to start the game. Please try again.");
    //   }

    // } 
    // catch (error) {
    //     console.error("Error starting game:", error);
    //     alert("⚠️ Error connecting to game server.");
    // }  


  navigate(`/Gameroom/${roomId}`);

  };


  const leaveRoom = async() => {
      if (username && roomId) {
      socket.emit("leave_room", { roomId, username });
      navigate("/");
      socket.disconnect();
    }
  }


const handleReady = () => {
  if (!roomId || !username) return;
  const newReady = !isReady;
  setIsReady(newReady);
  socket.emit("player_ready", { roomId, username, ready: newReady });
};

    return(
        <>
        <div style={{ padding: "2rem", fontFamily: "Arial" }}>
        <h1>🏠 Lobby Room</h1>
        <p>Connected Room ID: <strong>{roomId}</strong></p>
        <p>username is {username}</p>
        </div>

      
                 
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

        <button onClick={handleReady}></button>
            <input type="button" value="ready?"  onClick={handleReady}/>
          {isReady ? (<button onClick={Gameroom}>GameRoom</button>
          ) : ("🕒 Not Ready")}


          <button onClick={leaveRoom}>Leave</button>
        </>
    );
};