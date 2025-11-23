
import { cache, useEffect, useState } from "react";
import { data, useNavigate, useParams } from "react-router-dom";
import { getValidToken } from "./auth";
import { socket } from "./socket";
interface Message {
  username: string;
  text?: string;
  message?: string;
}
interface Host {
  username: string;
  userId: string;
}

interface Player {
  username: string;
  userId: string;
  socketId?: string;
}

interface RoomData {
  roomId: string;
  roomName: string;
  host: Host;
  players: Player[];
}

interface GameStartData {
  roomId: string;
  players: { username: string; userId: string }[];
}
export default function LobbyRoom(){

  const { roomId } = useParams();  //from index.js of user-service 
  const [username, setUserName] = useState(localStorage.getItem("username") || "");


  const [messages, setMessages] = useState<Message[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messageInput, setMessageInput] = useState("");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isReady, setIsReady] = useState(false);
const [ReadyPlayer ,setReadyPlayers] = useState([]);
const [totalPlayers, setTotalPlayers] = useState(0);
  const [host, setHost] = useState( () => localStorage.getItem("host") || "");

  const userId = localStorage.getItem("userId");
  const hostId = localStorage.getItem("hostId");
  const isHost = (userId === hostId);


  const [roomData, setRoomData] = useState<RoomData | null>(null);
// from server later:
const [allReady, setAllReady] = useState(false);

  const navigate = useNavigate();


//activate navigatiing to the game room 
useEffect(() => {
   if (!socket) return;

 const handleGameStart = (data : GameStartData) => {
    console.log("🎮 Game starting!", data);
    navigate(`/Gameroom/${data.roomId}`);
  };

  socket.on("game_start", handleGameStart);
    return () => {socket.off("game_start", handleGameStart)};
}, [navigate]);

useEffect(() => {

const init = async() => {
  const validToken = await getValidToken();
  if(!validToken || !roomId || !username) return;

     console.log("✅ Using valid token:", validToken);
    setToken(validToken);
    socket.emit("join_room", { roomId, token: validToken });
};

init();

  socket.on("connect", () => console.log("✅ Connected to Room Service"));
    if (!username || !roomId) {
    return
  }

  socket.on("chat_message", (msg) =>
    setMessages((prev) => [...prev, msg])
  );

  socket.on("system_message", (msg) =>
    setMessages((prev) => [...prev, { username: "System", text: msg }])
  );

  socket.on("update_players", (list) => 
  setPlayers(list)
  );

  socket.on("reconnect", () => {
  const roomId = localStorage.getItem("roomId");
  const token = localStorage.getItem("token");
  if (roomId && token) {
    console.log("🔁 Rejoining room after reconnect...");
    socket.emit("join_room", { roomId, token });
  }
});

socket.emit("get_ready_state", { roomId });

socket.on("ready_update", ({readyPlayers, totalPlayers}) =>{
  console.log("DEBUG READY_UPDATE:", {
    readyPlayers,
    readyCount: readyPlayers.length,
    totalPlayers,
  });

  setReadyPlayers(readyPlayers);
  setTotalPlayers(totalPlayers);
  setAllReady(readyPlayers.length === totalPlayers);
   
});

socket.on("not_ready_alert", (data) => {
  alert(`⛔ Cannot start game.\nNot ready players:\n- ${data.notReady.join("\n- ")}`);
});


  return () => {

    socket.off("chat_message");
    socket.off("system_message");
    socket.off("update_players");
    socket.off("reconnect");
    socket.off("ready_update");
    socket.off("not_ready_alert");
  };
}, [roomId, username, token]);


  const sendMSG = async() => {
    const trimmed = messageInput.trim();
      if (!trimmed) return;
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

  const leaveRoom = async() => {
      if (username && roomId) {
      socket.emit("leave_room", { roomId, username });
      navigate("/Home");
      socket.disconnect();
    }
  }

//ready non-host side 
const handlePlayerReady = async() => {
  if (!roomId || !username) return;
    const newReady = !isReady;
    setIsReady(newReady);
    socket.emit("player_ready", { roomId, username, ready: newReady });
};

//ready host side 
  const handleHostStart = async() =>{
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
      // navigate(`/Gameroom/${roomId}`);
      socket.emit("host_start_game", { roomId, username });
    } else {
      alert("⚠️ Game Service is responding but not ready yet.");
    }

    }catch(err){  
      console.error("❌ Game service unavailable:", err);
      alert("❌ GameRules Service (port 3003) is not active. Please start it first.");
    }

  };

useEffect(() =>{
  const loadRoom = async()=>{
 try {
        const res = await fetch(`http://localhost:3002/room/${roomId}`);
        const data = await res.json();
        if (data.success) {
          setRoomData(data);
        } else {
          console.error("Failed to load room:", data.message);
        }
      } catch (err) {
        console.error("Error loading room:", err);
      }
  };


if (roomId) loadRoom();
}, [roomId]);

    return(
        <>
      <div style={{ padding: "2rem", fontFamily: "Arial" }}>
        <h1>🏠 Lobby Room</h1>
        <p>Connected Room ID: <strong>{roomId}</strong></p>
        <p>username is {username}</p>
        {!roomData ? (

            <p>Loading room data...</p>

        ) : (
          <>
           <h3>Room: {roomData.roomName}</h3>
            <p> Host : {roomData?.host?.username || "Loading..."}</p>
            <h3>Room: {roomId}</h3>
            <div>
              <h3>Players:</h3>
  <p>
    Players: {players.length > 0 ? players.map(p => p.username).join(", ") : "No players yet"}
  </p>

</div>

     
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

  {isHost ?
  <button onClick={handleHostStart} disabled={!allReady} >
    {allReady ? "🚀 Start Game" : "⏳ Waiting for players..."}
  </button> 
  : <button onClick={handlePlayerReady}>
      {isReady ? "✅ Ready (click to cancel)" : "🟡 Ready up"}
    </button>
  }

          <button onClick={leaveRoom}>Leave</button>
     </>

        )};
        </div>
        </>
    );
}