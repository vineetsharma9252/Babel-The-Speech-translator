import { Alert, StyleSheet, Text, View } from "react-native";
import { useContext, useEffect, useRef } from "react";
import ScanningIndicator from "./ScanningIndicator";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import AudioRecord from "react-native-audio-record";
import * as FileSystem from "expo-file-system";
import Sound from "react-native-sound";
import { Buffer } from "buffer";

import Colors from "../../colors/colors";
import { ConnectionContext } from "../../store/ConnectionContext";
import { Context } from "../../store/Context";

export default function Conn() {

    const { connectionState, setConnectionState, qrCodeText, 
            setQrCodeText, selectedLanguage, localMicOn, setLocalMicOn } = useContext(Context);

    // Audio Transmission: Logic Here
        const interval = useRef(null);
        const { ws, roomId, SERVER_URL } = useContext(ConnectionContext);

        useEffect(() => {
            if(connectionState == "sender")
                roomId.current = uuidv4();
             if(connectionState == "receiver" && qrCodeText !== "")
                roomId.current = qrCodeText;
            // else if(connectionState == "connecting") {
                
            // }
            console.log("useEffect[roomId]: ", roomId.current);
        }, [connectionState, roomId, qrCodeText]);

        useEffect(() => {
                     
        }, [ws]);

        const startConnection = async () => {
        try {
            console.log("start[roomId]: ", roomId.current);
            ws.current = new WebSocket(SERVER_URL);
            ws.current.onopen = () => {
                ws.current.send(JSON.stringify(
                    { type: "join", roomId: roomId.current, language: selectedLanguage.current }
                ));
            };

            await setConnectionState("connected");
            console.debug("connected");

            ws.current.onerror = e => console.error("WebSocket[initialization] error: ", e);
        } catch (error) {
            Alert.alert(
                "Error Connecting Server", 
                "Please try again later", 
                [{ type: "OK" , onPress: async () => {
                    await setConnectionState("initial");
                } }]
            );
            console.log("[start] Error creating WebSocket:", error);
        }

        const options = {
            sampleRate: 16000, 
            channels: 1,
            bitsPerSample: 16, 
            audioSource: 6, 
        };
        AudioRecord.init(options);
        AudioRecord.start();

        interval.current = setInterval(async () => {
            ws.current.onmessage = (e) => {
                const msg = JSON.parse(e.data);

                if(msg.type === "audio") 
                    playAudio(msg.chunk);
            };   

            if(!localMicOn.current) return;
            const chunk = await AudioRecord.read(2048);
            if(chunk && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify(
                    { type: "audio", roomId,
                         chunk: Buffer.from(chunk, "base64").toString("base64")
                    }
                ));
            }
        }, 100);
    };   

    const playAudio = async chunkBase64 => {
        const filepath = `${FileSystem.documentDirectory}temp.wav`;
        console.log("I am here");
        try {
            await FileSystem.writeAsStringAsync(filepath, chunkBase64, {
                encoding: FileSystem.EncodingType.Base64,
            });
            if(FileSystem.getInfoAsync(filepath).exists) {
                const sound = new Sound(filepath, "", error => {
                    if (error) {
                        console.log('failed to load the sound', error);
                        return;
                    }
                    sound.play(() => sound.release());
                });
            }
        }
         catch (error) {
            console.log("Error writing or playing audio file:", error);
        }
    };

    // Audio Transmission: Logic Ends

    return (
        <>
        <View style={styles.upperContainer}>
            {connectionState == "initial" ?
                <Text style={styles.headerText}>
                    {"Start the App by pressing one of the buttons below."}
                </Text>
                :
                undefined
            }
            {connectionState != "initial" && connectionState == "sender" ?
                <Text style={styles.headerText}>
                    {"You are the sender"}
                </Text>
                :
                undefined
            }
            {connectionState != "initial" && connectionState == "receiver" ?
                <Text style={styles.headerText}>
                    {"You are the receiver"}
                </Text>
                :
                undefined
            }
            {connectionState == "connected" || connectionState == "connecting" ?
                <Text style={styles.headerText}>
                    {"Connected"}
                </Text>
                :
                undefined
            }
            {connectionState != "initial" ?
                <ScanningIndicator 
                    connectHandler={startConnection}
                    toggleMic={ () => {
                        setLocalMicOn(!localMicOn);
                    } }
                /> : undefined
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
    }
});