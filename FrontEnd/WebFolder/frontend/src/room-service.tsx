
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

export default function LobbyRoom(){

  const { roomId } = useParams();  //from index.js of user-service 
  const [username, setUserName] = useState(localStorage.getItem("username") || "");


  const [messages, setMessages] = useState<Message[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messageInput, setMessageInput] = useState("");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isReady, setIsReady] = useState(false);

  const [host, setHost] = useState(localStorage.getItem("host") || "");
  const [roomData, setRoomData] = useState<RoomData | null>(null);

  const navigate = useNavigate();


useEffect(() => {
// 

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
  //   if(roomId && username){
  //     socket.emit("join_room", { roomId, token }); //should be parsed token, not the username.
  // };


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


  return () => {
    // socket.off("connect");
    socket.off("chat_message");
    socket.off("system_message");
    socket.off("update_players");
    socket.off("reconnect");
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
          <input type="button" value="ready?"  onClick={handleReady}/>

             
          {isReady ? (<button onClick={Gameroom}>GameRoom</button>
          ) : ("🕒 Not Ready")}


          <button onClick={leaveRoom}>Leave</button>
     </>

        )};
        </div>
        </>
    );
}