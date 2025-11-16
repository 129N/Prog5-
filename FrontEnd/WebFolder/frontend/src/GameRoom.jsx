

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


  // this is main useEffect
useEffect(() => {
  if(!socket) return;
  if(!roomId || !username) return;

  socket.on("connect", () => console.log("✅ Connected to Room Service"));

  if (username && roomId) {
    socket.emit("player_ready_join", { roomId, username });
  }

  socket.on("system_message", (msg) =>
    setMessages((prev) => [...prev, { username: "System", text: msg }])
  );

  socket.on("update_players", (list) => setPlayers(list));


  // this is the main frame to run the game.
  socket.on("room_update", (data)=> {
    setPlayers(data.players);
    // not created yet with const
    setAssignments(data.assignments || {});
    setRound(data.currentRound);
    setGameState(data.state);
  })

  // when host starts game
  socket.on("game_start", (data) => {
    console.log("🎮 Game started!");
    console.log("🎮 Players in this game:", list);
    const list = Array.isArray(data) ? data  : data.players;
    setPlayers(data.list);
    setGameState("assignment"); 

  });

  return () => {
    socket.off("chat_message");
    socket.off("system_message");
    socket.off("update_players");
    socket.off("player_ready_join");
    socket.off("game_start");
  };
}, [roomId, username, socket]);

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

  // Game content is here.


              ) : (
                <p>🕓 Waiting for players...</p>
              )}
           
          <button onClick={leaveRoom}>Leave</button>
          <button onClick={BackToLobby}>Back</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
    );
};