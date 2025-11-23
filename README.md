# 4WGame Project

A real-time multiplayer game built with React + Vite, Node.js, Socket.IO, Express, and CapacitorJS (Android/iOS).

Players create or join a room, mark themselves ready, get category assignments (WHEN / WHERE / WHO / WHAT), submit words, generate a funny sentence, vote with 👍, and repeat rounds until the game ends.

🚀 Features
Lobby / Room Service (Port 3002)

Create / join rooms

JWT-based login

Host and Player role handling

Ready check (all players must press “Ready”)

Host starts the game

Real-time player list updates

WebSocket reconnection supported

Game Rules Service (Port 3003)

Category assignment per round

Multiple submissions per player

Sentence builder based on submissions

Live voting using thumbs

Round system

Game over + Score calculation

Keeps sentence history and best sentence

Frontend (Vite + React + Socket.IO Client)

Lobby UI (create / join)

Ready status UI

Game Room UI

Real-time submission UI

Voting interface

Final score + best sentence screen

Fully LAN compatible

Prepared for CapacitorJS mobile build

# 📦 Project Structure

```bash
Prog5/
│
├── BackEnd/
│   ├── room-service/        # Port 3002
│   └── game-rules-service/  # Port 3003
│
└── FrontEnd/
    └── WebFolder/
        └── frontend/
            ├── src/
            │   ├── App.jsx
            │   ├── room-service.tsx
            │   ├── GameRoom.jsx
            │   └── ...
            ├── capacitor.config.json
            ├── package.json
            └── ...
```
⚙️ Install
Backend
```bash
cd BackEnd/room-service
npm install
node index.js
```
```bash
cd BackEnd/game-rules-service
npm install
node index.js
```

Frontend
```bash
cd FrontEnd/WebFolder/frontend
npm install
npm run dev -- --host
```

🌐 LAN Configuration

To run on mobile over Wi-Fi:

Frontend
```bash
export const LANPORT = "192.168.0.103";
export const socket = io(`http://${LANPORT}:3003`, {
  transports: ["websocket"],
});
```

Backend service logs
```bash
server.listen(port, "0.0.0.0", () => {
  console.log(`Running on http://192.168.0.103:${port}`);
});
```

Ensure:

PC and mobile are on same Wi-Fi

Windows Firewall allows Node.js

Mobile browser accesses:
http://192.168.0.103:5173/

📱 CapacitorJS Mobile Build
1️⃣ Initialize Capacitor
```bash
npx cap init 4WGame com.game4w.app
```

2️⃣ Build frontend
```bash
npm run build
```
3️⃣ Copy to Capacitor
```bash
npx cap copy
```
4️⃣ Add platforms
```bash
npx cap add android
npx cap add ios
```
5️⃣ Open platform project
```bash
npx cap open android
npx cap open ios
```

Run simulators or real devices from Android Studio / Xcode.

🎮 How to Play

Host creates a room

Players join using room ID

Everyone presses Ready

Host presses Start Game

Game rules service generates category assignments

Players submit words

Sentence is generated

Everyone votes (👍)

Repeat rounds

Final results shown

🏆 Final Score Screen

Shows:

All player scores

Best scoring sentence

Which round it came from

Example:

{
  "2e853907-player": 32,
  "4f83bd-player": 32
}

📘 License

MIT

