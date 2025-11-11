import { createContext, useState, useRef } from "react";

export const ConnectionContext = createContext();

export default function ConnectionContextProvider({ children }) {
    const ws = useRef(null);
    // roomId = url in ScanningIndicator.js
    const roomId = useRef(undefined);
    const SERVER_URL = "ws://10.153.117.78:3000";
    
    return (
        <ConnectionContext.Provider value={
            { ws, roomId, SERVER_URL }
        }>
            {children}
        </ConnectionContext.Provider>
    );
}