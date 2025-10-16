
import { useParams } from "react-router-dom";


export default function LobbyRoom(){

  const { roomId } = useParams();
    return(
        <>
            <h1>Room-service</h1>        
            <h1>Lobby Room</h1>
             <h2>Room ID: {roomId}</h2>
        </>
    );
};