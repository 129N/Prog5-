import { io, Socket } from "socket.io-client";

const URL = "http://localhost:3002";
export const socket: Socket = io(URL, { transports: ["websocket"] });
