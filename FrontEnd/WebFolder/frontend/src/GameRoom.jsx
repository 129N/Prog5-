

import { cache, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { socket } from "./socket";

export default function Gameroom() {

  const { roomId } = useParams();  //from index.js of user-service 
  const [username, setUserName] = useState (localStorage.getItem("username") || "");
  const [players, setPlayers] = useState ([]);
  const navigate = useNavigate();


  const leaveRoom = async() => {
      if (username && roomId) {
      socket.emit("leave_room", { roomId, username });
      navigate("/");
      socket.disconnect();
    }
  }

  const handleLogout = () => {
  localStorage.clear();
  alert("✅ Logged out and localStorage cleared!");
  navigate("/");
};

  
  const BackToLobby = async() => {
      if (username && roomId) {
      socket.emit("leave_room", { roomId, username });
      navigate(`/room/${roomId}`); 
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

  socket.on("game_start", (data) => {
    const list = Array.isArray(data) ? data  : data.players;
    setPlayers(list);
    console.log("🎮 Players in this game:", list);
  });

  return () => {
    socket.off("chat_message");
    socket.off("system_message");
    socket.off("update_players");
    socket.off("player_ready_join");
    socket.off("game_start");
  };
}, [roomId, username]);

    return(

        <div>
            <h1>The game room is here</h1>
            <h2>Your user name is {username}</h2>
            <h2>This room is {roomId}</h2>


            <h3>Player Lists</h3>
         
              { players.length > 0 ? (

                <div>
                  {players.map((p,i) => {
                    return <p key={i}> 👤 {p.username || p} ({p.userId || "no ID"}) </p>
                  })}

                </div>

              ) : (
                <p>🕓 Waiting for players...</p>
              )}
           
          <button onClick={leaveRoom}>Leave</button>
          <button onClick={BackToLobby}>Back</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
    );
};