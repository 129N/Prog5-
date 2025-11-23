import { cache, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

//import { socket } from "./socket";
import { io } from "socket.io-client";
export const socket = io("http://localhost:3003", {
  transports: ["websocket"],
});

// set the words
//const CATS = ["WHEN", "WHERE", "WHO", "WHAT"];

export default function Gameroom() {

  const { roomId } = useParams();  //from index.js of user-service 
  const [username, setUserName] = useState (localStorage.getItem("username") || "");
  const [players, setPlayers] = useState ([]);
  const [messageInput, setMessageInput] = useState({});
  // FE status consts 

const [roomCategories, setRoomCategories] = useState([]);
  const [gameState, setGameState] = useState("waiting");
const [assignments, setAssignments] = useState({});
const [submissions, setSubmissions] = useState({});
const [sentence, setSentence] = useState("");
const [thumbCount, setThumbCount] = useState(0);
const [scores, setScores] = useState({});
const [roundFinished, setRoundFinished] = useState(false);
const [cat, setCat] = useState([]);
const [round, setRound] = useState(1);
const [history, setHistory] = useState([]);

//navigation 
  const navigate = useNavigate();

  const leaveRoom = async() => {
      if (username && roomId) {
      socket.emit("leave_room", { roomId, username });
      navigate("/Home");
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
   if (Array.isArray(cat) && cat.length > 1) {
      setMessageInput(prev => ({ ...prev }));
   }
}, [cat]);


// this is main useEffect
  useEffect(() => {
    if(!socket) return;
    if(!roomId || !username) return;

    socket.on("connect", () => console.log("✅ Connected to Room Service"));

    if (username && roomId) {
      socket.emit("player_ready_join", { roomId, username });
    }


    socket.on("room_update", (data)=> {
      setPlayers(data.players);
      // not created yet with const
      setAssignments(data.assignments || {});
      setRound(data.currentRound);
      setGameState(data.state);
    })

  //round start 
    socket.on("round_start", (data) => {
      console.log("🌀 New round started:", data.round);
      setRound(data.round);
      setAssignments(data.assignments || {});
      setRoomCategories(data.categories || []);  // <-- FIXED
      setGameState("assignment");
    });

    //Receives update lives
    socket.on("thumb_live_update", (count) => {
      setThumbCount(count);
    });


const handleSentenceReady = (data) =>{
 console.log("📩 RECEIVED sentence_ready:", data);
  setSentence(data.sentence);
  setSubmissions(data.submissions);
  setGameState("sentence_ready");

};

//sentence finish
  socket.on("sentence_ready", handleSentenceReady);

// alert 
socket.on("waiting_for_players", (data) => {
   alert(`⏳ Waiting for: ${data.notDone.join(", ")}`);
});

//Game over socket
  socket.on("game_over", (data) => {
    setScores(data.scores);
    setGameState("game_over");
     setHistory(data.history || []);  // FIXED
  });
  return () => {
    socket.off("room_update");
    socket.off("sentence_ready", handleSentenceReady);
    socket.off("chat_message");
    socket.off("player_ready_join");
    socket.off("game_start"); //  (from room-service) → only once, when lobby says “game begins”
    socket.off("round_start");// (from game-rules) → each round, gives round + assignments
    socket.off("thumb_live_update");
    socket.off("waiting_for_players");
    socket.off("round_end");
  };
}, [roomId, username, socket]);


//assignmentStage
  useEffect(() =>{

    const userId = localStorage.getItem("userId");
    if(!assignments && roomCategories.length === 0 ) return;

  // filter which category belongs to me:
    const myCats = roomCategories
      .filter((cat) => {return assignments[cat] === userId});
      setCat(myCats); // ← this gives “WHO”, “WHAT”, 
  }, [assignments, roomCategories]);

//rendeirng players list 
function renderPlayers () {
  return(
    <div>
      <h3>Players</h3>
       {players.map((p, i) => (
        <p key={i}>👤 { p.username } </p>
      ))}
    </div>
  )
}

// Waiting screen
function renderWaitingScreen() {
  return ( 
    <div>
      <h3> </h3>
      <p>⌛ Waiting for host to start...</p>
    </div>

);
}

// Assignment input phase
function assingmentPhase() {

  return(
  <div>
    <h2>Enter your words</h2>

    {cat.map(catItem => (
      <div key={catItem}>
        <p>You are responsible for: <strong>{catItem}</strong></p>

        <input
          value={messageInput[catItem] || ""}
          onChange={e =>
            setMessageInput({ ...messageInput, [catItem]: e.target.value })
          }
          placeholder={`Type your ${catItem} word...`}
        />
      </div>
      
    ))}
            <button onClick={submitAllWords}>
              Submit All
            </button>
    </div>
  );
}

const submitAllWords = async() =>{
// validate all assigned categories
  for (const c of cat) {
    if (!messageInput[c] || !messageInput[c].trim()) {
      alert(`Please fill your ${c}!`);
      return;
    }
  }

  socket.emit("submit_words", {
    roomId,
    username,
    words: messageInput
  });

  setMessageInput({});

};


//waiting submission
function WaitingForSubmissions(){
  return <p>⌛ Waiting for submission to end...</p>;
}

//input
function SentenceResult(){
   return (
    <div>
      <h2>Sentence (sentence_ready)</h2>
      <p>{sentence}</p>
      <button onClick={gotoThumb}>Start voting</button>
    </div>
  );
}
const gotoThumb = async() =>{
  socket.emit("start_thumbs", { roomId });
  setGameState("thumbs"); // it goes to {gameState === "thumbs" && renderThumbsPhase()}
};

//thumbs up phase 
function renderThumbsPhase(){
 return (
    <div>
      <h2>Thumbs-up Voting</h2>
      <h3>Live score: {thumbCount}</h3>

      <button onClick={Thumb}>👍</button>
<button onClick={finishThumbs}>Done</button> {/*  FIXED */}
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
  console.log(thumbCount, "times will be scored");
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
      <p>⌛ Waiting for next round...</p>
    </div>
  );
}

function renderFinalResults() {
   const best =
    history.length > 0
      ? history.reduce((max, item) =>
          item.score > max.score ? item : max,
          { score: -1 }
        )
      : null;

  return (
  <div>
      <h1>🏆 Game Over! Final Scores</h1>
      {best && (
        <div>
          <h2>⭐ Best Sentence of the Game</h2>
          <p><strong>{best.sentence}</strong></p>
          <p>👍 Score: {best.score}</p>
          <p>📘 Round: {best.round}</p>
        </div>
      )}
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
    {gameState === "submit_in_progress" && WaitingForSubmissions()}
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