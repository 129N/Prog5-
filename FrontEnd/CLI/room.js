import fs from "fs";
import { bar } from "./index.js";
import path from "path";
import { runGame,waitFor } from "./play.js";
const ROOM_FILE = path.resolve("./rooms.json");

function ensureRoomFile() {
  if (!fs.existsSync(ROOM_FILE)) {
    fs.writeFileSync(ROOM_FILE, JSON.stringify({}, null, 2));
  }
}

export function loadRooms(){
    ensureRoomFile();

    try {
        return JSON.parse(fs.readFileSync(ROOM_FILE, "utf-8"));
    } catch {
        return {};
    }
}

export function saveRooms(rooms){
    fs.writeFileSync(ROOM_FILE, JSON.stringify(rooms, null, 2));
}


export function getRoom(code){
    const rooms = loadRooms();
    return rooms[code];
}

export function deleteRoom(code) {
  const rooms = loadRooms();
  if (rooms[code]) {
    delete rooms[code];
    saveRooms(rooms);
  }
}
export function setRoom(code, roomData) {
  const rooms = loadRooms();
  rooms[code] = roomData;
  saveRooms(rooms);
}
//{
//   "AB12C": {
//     "host": "test1",
//     "players": ["test1"],
//     "maxRounds": 3
//   }
// }

export function updateRoom(code, roomData){
    const rooms = loadRooms();
    rooms[code] = roomData;
    saveRooms(rooms);
}

// create password (very impressive)
function randomRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += letters[Math.floor(Math.random()*letters.length)];
  return s;
}

function ask(rl, question){
    return new Promise(resolve => rl.question(question, ans => resolve(ans.trim()) ));
}

export async function lobbyMenu(userName, rl) {
    while(true){
        console.log(bar);
        console.log("Lobby room");
        console.log(bar);
        console.log(`\n👋 Hi ${userName}!`);

    console.log("1) Create room");
    console.log("2) Join room");
    console.log("3) Exit");
    const c = await ask(rl, "Choose (1-3): ");

    if (c === "1") await createRoomFlow(userName, rl);
    else if (c === "2") await joinRoomFlow(userName, rl);
    else if (c === "3") { console.log("👋 Bye!"); rl.close(); return; }
    else console.log("Invalid choice.\n");
    }
}

//CREATE ROOM FUNCTION
async function createRoomFlow(userName, rl) {
    const code = randomRoomCode();
    const newRoom = {host : userName,players: [userName], maxRounds:3 };
    console.log("DEBUG ROOM STRUCTURE:", newRoom);
//DEBUG ROOM STRUCTURE: { host: 'test1', players: [ 'test1' ], maxRounds: 3 }
    updateRoom(code, newRoom);
    console.log(`Host: ${userName}\n🏠 Room created! Code: ${code}`);
    await roomLobbyLoop(code, userName, rl);
}

//JOIN ROOM FUNCTION
async function joinRoomFlow(userName, rl) {
    const code = (await ask(rl, "Enter room code: ")).toUpperCase();
    const room = getRoom(code);
    if (!room) { console.log("❌ Room not found."); return; }
    if (!room.players.includes(userName)) {
        room.players.push(userName);
        setRoom(code, room);       
    };

    console.log(`✅ Joined room ${code}`);
    await roomLobbyLoop(code, userName, rl);
}

// Small helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function roomLobbyLoop(code, userName, rl) {
while(true){
    const room = getRoom(code);
    if(!room){
        console.log("❌ Room was closed.");
        console.log("🪶 Debug: rooms.json contents ->", loadRooms());
        return;
     }

    console.log(`\n🏠 Room ${code} | Host: ${room.host} | Rounds: ${room.maxRounds}`);
    console.log("Players:", room.players.join(", ") || "(none)");
    console.log("\nOptions:");

    // the username needs to be the same with the host name.
    if(userName === room.host){
        console.log("1) Start game");
        console.log("2) Set rounds");
        console.log("3) Kick player");
        console.log("4) Leave room / Close (if host)");   
        console.log("5) Refresh room info");

    const c = await ask(rl, "Choose (1-4): ");
      if (c === "1") {
        if (room.players.length < 2) { console.log("⚠️ Need at least 2 players."); continue; }

        //if there are 2 ppl, it goes to the play.js
        room.gameState = "started";
       updateRoom(code, room);
      await runGame(room, rl, userName, code);

         // after game end, close room:
        deleteRoom(code);
        return;
      } 
      else if (c === "2") {
        const r = await ask(rl, "Rounds? (2-5): ");
        const n = Number(r);
        if (Number.isInteger(n) && n >= 2 && n <= 5) { 
            room.maxRounds = n; console.log(`✅ Rounds set to ${n}`); 
            setRoom(code, room); // ✅ persist change
        }
        else console.log("❌ Invalid number.");
      } 
      else if (c === "3") {
        const who = await ask(rl, "Kick player name: ");
        if (who === room.host) { console.log("⚠️ Cannot kick host."); continue; }
        const i = room.players.indexOf(who);
        if (i >= 0) {
            room.players.splice(i, 1); console.log(`👢 Kicked ${who}.`); 
            setRoom(code, room); // ✅ persist change
        }
        else console.log("❌ Player not in room.");
      } else if (c === "4") {
        console.log("🚪 Room closed.");
         deleteRoom(code);
        return;
      } else if(c === "5"){
        console.log("🔄 Reloading room data...");
        const updated = getRoom(code);
        console.log(`✅ Refreshed. Players now: ${updated.players.join(", ")}`);
      }else {
        console.log("Invalid choice.");
      }
    }

    // player option
    else{
        console.log("1) Leave room");
        console.log(bar);
        console.log("⏳ Waiting for host to start the game...");
          // Poll for game start

          await waitFor(() =>{
            const updated = getRoom(code);
            return updated?.gameState === "started";
          });

          const updatedRoom = getRoom(code);
          console.log("🎮 Game is starting!");
          await runGame(updatedRoom, rl, userName, code);

        const c = await ask(rl, "Choose (1): ");
        if (c === "1") {
            // remove player
            const i = room.players.indexOf(userName);
            if (i >= 0) {
                room.players.splice(i, 1);
                setRoom(code, room); // ✅ persist removal
            }
            console.log("🚪 Left room.");
            return;
        } else {
            console.log("Invalid choice.");
            return roomLobbyLoop();
        }    
    }


// Small delay before reloading (2–3 sec works well)
    await sleep(2000);


}
}