import { createContext, useState, useRef, useMemo, useEffect } from "react";
import { io } from "socket.io-client";

export const ConnectionContext = createContext();

export default function ConnectionContextProvider({ children }) {
    // roomId = url in ScanningIndicator.js
    const [roomId, setRoomId] = useState(undefined);
    const [SERVER_URL, setSERVER_URL] = useState("http://192.168.1.34:3000");
    
    const socket = useMemo(() => 
        io(SERVER_URL, {
        transports: ["websocket"], 
        reconnectionAttempts: 5, 
        multiplex: false
        })
    , [SERVER_URL]);
    
    return (
        <ConnectionContext.Provider value={
            { socket, roomId, setRoomId, SERVER_URL, setSERVER_URL }
        }>
            {children}
        </ConnectionContext.Provider>
    );
}