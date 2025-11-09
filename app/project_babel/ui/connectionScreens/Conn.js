import { Alert, StyleSheet, Text, View } from "react-native";
import { Buffer } from "buffer";
import { useContext, useState, useEffect, useRef } from "react";
// import AudioRecord from "react-native-audio-record";
// import Sound from "react-native-sound";
import * as FileSystem from "expo-file-system";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

import Colors from "../../colors/colors";
import { Context } from "../../store/Context";
import ScanningIndicator from "./ScanningIndicator";
import { ConnectionContext } from "../../store/ConnectionContext";

export default function Conn() {
    const { isSender, setIsSender, isReceiver, 
            setIsReceiver, isUserWantConnection, setIsUserWantConnection, isUserConnected,
            setIsUserConnected, localMicOn, setLocalMicOn, qrCodeText, setQrCodeText, 
            selectedLanguage, setSelectedLanguage
        } = useContext(Context);
    const [headerText, setHeaderText] = useState("Start the App by pressing one of the buttons below.");

    useEffect(() => {
        console.log("isSender: ", isSender);
        console.log("isReceiver: ", isReceiver);
        console.log("isUserWantConnection: ", isUserWantConnection);
        console.log("isUserConnected: ", isUserConnected);

        console.log("side effect[1]");
        if(!isUserWantConnection && !isUserConnected && !(isReceiver || isSender)) {
            setHeaderText("Start the App by pressing one of the buttons below.");
            return;
        }
        else if(!isUserConnected) setHeaderText((isSender) ?
         "You are the sender" : "You are the receiver");
    }, [isSender, isReceiver, isUserWantConnection, isUserConnected]);

    // ** web-rtc logic here **
    const interval = useRef(null);
    const {
        ws, device, setDevice, sendTransport, setSendTransport, receiveTransport, setReceiveTransport,
        roomId, setRoomId, SERVER_URL
    } = useContext(ConnectionContext);

    useEffect(() => {
        if(!isUserConnected && isSender)
            setRoomId(uuidv4());
        console.log("side effect[1]");
        if(!isUserConnected && isReceiver)
            setRoomId(qrCodeText);
    }, [isUserConnected, isSender, isReceiver]);

    useEffect(() => {
        
        if(!isUserWantConnection)   
            clearInterval(interval.current);
    }, [isUserWantConnection]);
    
    const start = async () => {
        try {
            console.log("start[roomId]: ", roomId);
            ws.current = new WebSocket(SERVER_URL);
            ws.current.onopen = () => {
                ws.current.send(JSON.stringify(
                    { type: "join", roomId: roomId, language: selectedLanguage }
                ));
            };

            setIsUserConnected(true);

            ws.current.onmessage = (e) => {
                const msg = JSON.parse(e.data);

                // if(msg.type === "audio") 
                //     playAudio(msg.chunk);
            };
            ws.current.onerror = e => console.error("WebSocket[initialization] error: ", e);
        } catch (error) {
            // setIsUserConnected(false);
            // setIsUserWantConnection(false);
            console.log("[start] Error creating WebSocket:", error);
        }

        // AudioRecord.start();

        // interval.current = setInterval(async () => {
        //     const chunk = await AudioRecord.read(2048);
        //     if(chunk && ws.current.readyState === WebSocket.OPEN) {
        //         ws.current.send(JSON.stringify(
        //             { type: "audio", roomId,
        //                  chunk: Buffer.from(chunk, "base64").toString("base64")
        //             }
        //         ));
        //     }
        // }, 100);
    };   
    
    useEffect(() => {
        console.log("side effect[2]");
        if((isReceiver || isSender) && isUserWantConnection && roomId) {
            // const options = {
            //     sampleRate: 16000, 
            //     channels: 1,
            //     bitsPerSample: 16, 
            //     audioSource: 6
            // };
            console.log("start[reached this level]: ")
            // AudioRecord.init(options);
            start();
        }
    }, [isUserWantConnection, isSender, isReceiver, roomId]);

    // const playAudio = async chunkBase64 => {
    //     const filepath = `${FileSystem.documentDirectory}temp.wav`;
    //     try {
    //         await FileSystem.writeAsStringAsync(filepath, chunkBase64, {
    //             encoding: FileSystem.EncodingType.Base64,
    //         });
    //         if(FileSystem.getInfoAsync(filepath).exists) {
    //             const sound = new Sound(filepath, "", error => {
    //                 if (error) {
    //                     console.log('failed to load the sound', error);
    //                     return;
    //                 }
    //                 sound.play(() => sound.release());
    //             });
    //         }
    //     } catch (error) {
    //         console.log("Error writing or playing audio file:", error);
    //     }
    // };

    const toggleMic = () => {
        setLocalMicOn(!localMicOn);
    };

    // ** web-rtc logic ends ** //

    return (
    <>
    <View style={styles.upperContainer}>
        <Text style={styles.headerText}>{ headerText }</Text>
        { (isSender || isReceiver) ?
            <ScanningIndicator 
            text={(!isUserConnected) ? "Scanning...": "Connected"}
                connectHandler={start}
                toggleMic={toggleMic} /> : null
        } 
    </View>
    </>
    );
}

const styles = StyleSheet.create({
    upperContainer: {
        marginTop: "10%", 
        flex: 1, 
        margin: '8%', 
        backgroundColor: Colors.cardPrimary,  
        width: '70%', 
        height: "100%", 
        borderRadius: 20, 
        alignItems: "center",
        justifyContent: "flex-start" 
    }, 
    headerText: {
        color: Colors.buttonText,
        fontFamily: "Boldonse-Regular",
        fontSize: 24,  
        textAlign: "center", 
        padding: "5%"
    }, 
    scrollContainer: {
        width: "100%", 
        height: "70%"
    }
});