

import { cache, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { socket } from "./socket";

export default function Gameroom() {

  const { roomId } = useParams();  //from index.js of user-service 
  const [username, setUserName] = useState (localStorage.getItem("username") || "");

  const navigate = useNavigate();


  const leaveRoom = async() => {
      if (username && roomId) {
      socket.emit("leave_room", { roomId, username });
      navigate("/");
      socket.disconnect();
    }
  }

  
  const BackToLobby = async() => {
      if (username && roomId) {
      socket.emit("leave_room", { roomId, username });
      navigate("/room/:roomId");
      socket.disconnect();
    }
  }

useEffect(() => {
  socket.on("connect", () => console.log("✅ Connected to Room Service"));

  if (username && roomId) {
    socket.emit("player_ready_join", { roomId, username });
  }

  socket.on("system_message", (msg) =>
    setMessages((prev) => [...prev, { username: "System", text: msg }])
  );

  socket.on("update_players", (list) => setPlayers(list));

  return () => {
    socket.off("chat_message");
    socket.off("system_message");
    socket.off("update_players");
    socket.off("player_ready_join");
  };
}, [roomId, username]);

    return(

        <div>
            <h1>The game room is here</h1>
            <h2>Your user name is {username}</h2>
            <h2>This room is {roomId}</h2>
        <button onClick={leaveRoom}>Leave</button>
                <button onClick={BackToLobby}>Back</button>
        </div>
    );
};