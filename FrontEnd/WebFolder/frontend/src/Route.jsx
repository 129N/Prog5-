import { Routes, Route } from "react-router-dom";
// import Home from "./Home.jsx";
import LobbyRoom from "./room-service.js";
import App_main from "./App.jsx";
import Gameroom from "./GameRoom.jsx";
import UserService from "./Home.jsx";
import { useEffect, useState} from "react";
export default function RouteManual() {
const [user, setUser] = useState(null);

    useEffect(() => {
    const savedUser = {
      username: localStorage.getItem("username"),
      userId: localStorage.getItem("userId"),
      token: localStorage.getItem("token"),
    };
    if (savedUser.username && savedUser.userId && savedUser.token) {
      setUser(savedUser);
    }
  }, []);


  return (
    
    <Routes>
      <Route path="/" element={<App_main onLogin={setUser}/>} />
      {/* <Route path="/room/:roomId" element={<Room />} /> */}
    <Route path="/room/:roomId" element={<LobbyRoom user={user} />} />
      <Route path="/Gameroom/:roomId" element={<Gameroom user={user} />} />
      <Route path="/Home" element={<UserService />} />
    </Routes>
  );
}
