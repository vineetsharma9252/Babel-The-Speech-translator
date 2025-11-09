import { createContext, useState, useRef } from "react";

export const ConnectionContext = createContext();

export default function ConnectionContextProvider({ children }) {
    const ws = useRef(null);
    const [device, setDevice] = useState(null);
    const [sendTransport, setSendTransport] = useState(null);
    const [receiveTransport, setReceiveTransport] = useState(null);
    
    // roomId = url in ScanningIndicator.js
    const [roomId, setRoomId] = useState(null);
    
    const SERVER_URL = "ws://10.192.58.78:3000";
    
    return (
        <ConnectionContext.Provider value={
            {
                ws, device, setDevice, sendTransport, setSendTransport, receiveTransport, setReceiveTransport,
                roomId, setRoomId, SERVER_URL
            }
        }>
            {children}
        </ConnectionContext.Provider>
    );
}