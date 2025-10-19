
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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
    // const [SC, setSocket] = useState<Socket | null>(null);


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


  const sendMSG = () => {
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



        </>
    );
};