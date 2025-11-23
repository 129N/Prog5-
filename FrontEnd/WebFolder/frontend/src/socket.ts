import { io, Socket } from "socket.io-client";
// const URL = "http://localhost:3002";
const URL = "http://192.168.0.103:3002";
export const socket: Socket = io(URL, { transports: ["websocket"] });
