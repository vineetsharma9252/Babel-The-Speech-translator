import { createContext, useState, useRef } from "react";
import InCallManager from 'react-native-incall-manager';
import database from "@react-native-firebase/database";
import { v4 as uuidv4 } from "uuid";

export const ConnectionContext = createContext();

export default function ConnectionContextProvider({ children }) {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    // roomId = url in ScanningIndicator.js
    const [roomId, setRoomId] = useState(uuidv4());
    
    const pc = useRef(null);
    const uid = useRef(uuidv4());
    const candidatesRef = useRef(null);

    const cleanUp = async () => {
        try {
            // setIsUserConnected(false);
            if(roomId) {
                const roomRef = database().ref(`rooms/${roomId}`);
                roomRef.child("answer").off();
                roomRef.remove(); 
                if(candidatesRef.current)
                    candidatesRef.current.off();
            }
            if(pc.current) {
                pc.current.close();
                pc.current = null;
            }
            if(localStream) {
                localStream.getTracks().forEach(
                    track => track.stop()
                );
                setLocalStream(null);
                setRemoteStream(null);
            }
            // if(!isUserWantConnection) {
            //     InCallManager.stop();
            //     InCallManager.setKeepScreenOn(false);
            // }
            InCallManager.stop();
            InCallManager.setKeepScreenOn(false);
        } catch(error) {
            console.warn("cleanup: error", error);
        }
    };
    
    return (
        <ConnectionContext.Provider value={
            {
                localStream, setLocalStream, 
                remoteStream, setRemoteStream, 
                roomId, setRoomId, 
                pc, 
                uid, 
                candidatesRef, 
                cleanUp
            }
        }>
            {children}
        </ConnectionContext.Provider>
    );
}