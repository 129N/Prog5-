import { Routes, Route, useNavigate } from "react-router-dom";
// import Home from "./Home.jsx";
import LobbyRoom from "./room-service.js";
import App_main from "./App.jsx";

export default function RouteManual() {
  return (
    <Routes>
      <Route path="/" element={<App_main />} />
      {/* <Route path="/room/:roomId" element={<Room />} /> */}
    <Route path="/room/:roomId" element={<LobbyRoom />} />
    </Routes>
  );
}
