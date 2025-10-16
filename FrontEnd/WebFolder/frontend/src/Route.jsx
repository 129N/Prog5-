import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "./Home.jsx";
import Room from "./Room.jsx";
import LobbyRoom from "./room-service.js";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
    <Route path="/room/:roomId" element={<LobbyRoom />} />
    </Routes>
  );
}
