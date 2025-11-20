

import { cache, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { socket } from "./socket";

// set the words
const CATS = ["WHEN", "WHERE", "WHO", "WHAT"];

export default function Gameroom() {

  const { roomId } = useParams();  //from index.js of user-service 
  const [username, setUserName] = useState (localStorage.getItem("username") || "");
  const [players, setPlayers] = useState ([]);
  const [messageInput, setMessageInput] = useState("");


  // FE status consts 

  const [gameState, setGameState] = useState("waiting");
const [assignments, setAssignments] = useState({});
const [submissions, setSubmissions] = useState({});
const [sentence, setSentence] = useState("");
const [thumbCount, setThumbCount] = useState(0);
const [scores, setScores] = useState({});
const [roundFinished, setRoundFinished] = useState(false);
const [cat, setCat] = useState("");

//navigation 
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

//   submit_word aggregation logic



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

    const list = data.players;
    console.log("🎮 Players in this game:", list);
    setPlayers(list);
  });
//round start 
  socket.on("round_start", (data) => {
    console.log("🌀 New round started:", data.round);
    setRound(data.round);
    setAssignments(data.assignments || {});
    setGameState("assignment");
  });

//Receives update lives
socket.on("thumb_live_update", (count) => {
  setThumbCount(count);
});

  socket.on("sentence_ready", data => {
  setSentence(data.sentence);
  setSubmissions(data.submissions);
  setGameState("sentence_ready");
});

  socket.on("game_over", (data) => {
    setScores(data.scores);
    setGameState("game_over");
  });
  return () => {
    socket.off("room_update");
    socket.off("sentence_ready");
    socket.off("chat_message");
    socket.off("system_message");
    socket.off("update_players");
    socket.off("player_ready_join");
    socket.off("game_start"); //  (from room-service) → only once, when lobby says “game begins”
    socket.off("round_start");// (from game-rules) → each round, gives round + assignments
    socket.off("thumb_live_update");
    socket.off("round_end");
  };
}, [roomId, username, socket]);



//rendeirng players list 
function renderPlayers () {
  return(
    <div>
      <h3>Players</h3>
       {players.map((p, i) => (
        <p key={i}>👤 {p.username}</p>
      ))}
    </div>
  )
}

// Waiting screen
function renderWaitingScreen() {
  return <p>⌛ Waiting for host to start...</p>;
}

function renderUserWaitingScreen() {
    return <p>⌛ Waiting for users to start...</p>;
}
// Assignment input phase
function assingmentPhase() {
  const userId = localStorage.getItem("userId");
 // find which category belongs to me:
  const myCat = Object.keys(assignments).find(
    (cat) => assignments[cat] === userId
  );
  setCat(myCat);

  return(
    <div>
      <h2>Enter your word</h2>
<p>You are responsible for: <strong>{myCat}</strong></p>
      <input 
        value={messageInput}
        onChange={(e)=>setMessageInput(e.target.value)}
        placeholder="Type your word..."
      />
      <button onClick={submit}>Submit</button>
    </div>
  );
}
const submit = async() =>{
  const trimmed = messageInput.trim();
  if (!trimmed) return;
     if (messageInput.trim() && socket) {
        console.log("📤 Sending message:", messageInput); // debug log
        socket.emit("submit_word", {
          roomId,
          username,
          text: messageInput,
          cat: cat,
        });
        setMessageInput("");
        setGameState("submitting");   
    }
};


//waiting submission
function WaitingForSubmissions(){
  return <p>⌛ Waiting for host to start...</p>;
}

//input
function SentenceResult(){
   return (
    <div>
      <h2>Sentence</h2>
      <p>{sentence}</p>
      <button onClick={gotoThumb}>Start voting</button>
    </div>
  );
}
const gotoThumb = async() =>{
  socket.emit("start_thumbs", { roomId });
  setGameState("thumbs"); // it goes to     {gameState === "thumbs" && renderThumbsPhase()}
};

//thumbs up phase 
function renderThumbsPhase(){
 return (
    <div>
      <h2>Thumbs-up Voting</h2>
      <h3>Live score: {thumbCount}</h3>

      <button onClick={Thumb}>👍</button>
      <button onClick={finishThumbs}>Done</button>
    </div>
  );
}
const Thumb = async() =>{
  socket.emit("thumb_click",{
    roomId,
    username
  });
};

const finishThumbs = async() =>{
   socket.emit("thumb_done", {
    roomId,
    username
  });
};


function renderRoundResults(){
  return(
    <div>
      <h2>Round Finished</h2>
      <pre>{JSON.stringify(scores, null, 2)}</pre>
      <button onClick={() => setGameState("waiting")}>Next Round</button>
    </div>
  );
}

function renderFinalResults() {
  return (
    <div>
      <h1>🏆 Game Over! Final Scores</h1>
      <pre>{JSON.stringify(scores, null, 2)}</pre>
    </div>
  );
}


    return(

      <div>
          <h1>The game room is here</h1>
          <h2>Your user name is {username}</h2>
          <h2>This room is {roomId}</h2>

          <h3>Player Lists</h3>
          {renderPlayers()}

    <hr />

    {gameState === "waiting" && renderWaitingScreen()}
    {gameState === "assignment" && assingmentPhase()}
    {gameState === "submitting" && WaitingForSubmissions()}
    {gameState === "sentence_ready" && SentenceResult()}
    {gameState === "thumbs" && renderThumbsPhase()}
    {gameState === "round_end" && renderRoundResults()}
    {gameState === "game_over" && renderFinalResults()}
                      
            <button onClick={leaveRoom}>Leave</button>
            <button onClick={BackToLobby}>Back</button>
            <button onClick={handleLogout}>Logout</button>
        </div>

     
    );
};