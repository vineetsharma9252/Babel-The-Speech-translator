import { Alert, StyleSheet, Text, View } from "react-native";
import { useContext, useEffect, useRef } from "react";
import ScanningIndicator from "./ScanningIndicator";
import "react-native-get-random-values";
import { Buffer } from "buffer";
import Sound from "react-native-sound";
import LiveAudioStream from 'react-native-live-audio-stream';
import PCM from 'react-native-pcm-player-lite'

import Colors from "../../colors/colors";
import { ConnectionContext } from "../../store/ConnectionContext";
import { Context } from "../../store/Context";
import Toast from "react-native-toast-message";

export default function Conn() {

    const { connectionState, setConnectionState, qrCodeText, 
            setQrCodeText, selectedLanguage, localMicOn, setLocalMicOn } = useContext(Context);

    // Audio Transmission: Logic Here
        const { socket, roomId, setRoomId, SERVER_URL } = useContext(ConnectionContext);

        useEffect(() => {
            // if(roomId) return;
            if(connectionState == "sender")
                setRoomId(String(parseInt(Math.random() * 100000)));
             if(connectionState == "receiver" && qrCodeText !== "")
                setRoomId(qrCodeText);
            console.log("useEffect[roomId]: ", roomId);
        }, [connectionState, qrCodeText]);

        const startConnection = async () => {
            if(selectedLanguage.current === "" || selectedLanguage.current === null) {
                Alert.alert("No Incoming Language Selected", "Please Select the language", [{ type: "OK"}]);
                return;
            }
            try {
                // joining to the server side room
                if(connectionState == "sender")
                    socket.emit("joinRoom", { username: "sender", roomId: roomId }, response => {
                            if(response.roomIsFull || response.senderExists) {
                                Alert.alert("Room is Full or Sender already there", "Only 2 Client is supported !", 
                                    [{ type: "OK" }]);
                                setConnectionState("initial");
                                return;
                            }
                        });
                else if(connectionState == "receiver")
                    socket.emit("joinRoom", { username: "receiver", roomId: roomId }, response => {
                            if(response.roomIsFull || response.senderExists) {
                                Alert.alert("Room is Full or Receiver already there", "Only 2 Client is supported !", 
                                    [{ type: "OK" }]);
                                setConnectionState("initial");
                                return;
                            }
                        });
                else 
                    throw "Unknown State";

                setConnectionState("connecting");
                socket.once("connect_error", error => {
                    console.error("[connect_error]Problem in connecting to the server: ", error);
                    Alert.alert("Connection failed", "Try Again", [{ type: "OK" }]);
                    setConnectionState("initial");
                });

                socket.once("roomJoined", data => {
                    console.log(`Successfully connected room: ${data.roomId} as: ${data.username}`)
                    setConnectionState("connected");
                    setLocalMicOn(true);
                    Sound.setCategory("Playback");
                    console.debug("connected");
                });

                socket.on("newParticipantJoined", username => {
                    Toast.show({
                        type: "info", 
                        text1: `${username} has joined the your room: ${roomId}`
                    });
                });
                socket.on("participantLeft", username => {
                    Toast.show({
                        type: "info", 
                        text1: `${username} has left your room: ${roomId}`
                    });
                });

            } catch (error) {
                Alert.alert(
                    "Error Connecting Server", 
                    "Please try again later", 
                    [{ type: "OK" , onPress: async () => {
                        await setConnectionState("initial");
                    } }]
                );
                console.log("[start] Error creating WebSocket:", error);
                return;
            }
    };
    
    useEffect(() => {
        if(!socket) return;
        const options = {
            sampleRate: 16000, 
            channels: 1,
            bitsPerSample: 16, 
            audioSource: 1, 
            bufferSize: 4096
        };

        try {
        LiveAudioStream.init(options);

        const startPCMPlayer = async () => {
            await PCM.start(16000);
        };
        startPCMPlayer();
        } catch(error) {
            console.log("Error starting PCM player or LiveAudioStream: ", error);
        }

        const dataListener = LiveAudioStream.on("data", data => {
            // below in data language = i need this lanaguage from sender 
            const binBuffer = Buffer.from(data, "base64");
            socket.emit("audioFromClient", { data: binBuffer, roomId, language: selectedLanguage.current });
        });        

        return () => {
            try {
                if(localMicOn)
                    LiveAudioStream.stop();
                dataListener.remove();
            } catch(error) {
                console.warn("Error[LiveAudioStream.stop()]: ", error);
            }
        };
    }, [socket, roomId]);

    useEffect(() => {
        if (!socket || connectionState !== "connected") return;

        const handleIncomingAudio = (data) => {
            const data64 = Buffer.from(data).toString("base64");
            PCM.enqueueBase64(data64);
        };

        socket.on("audioFromServer", handleIncomingAudio);

        return () => {
            socket.off("audioFromServer", handleIncomingAudio);
        };
    }, [connectionState, socket]);

    useEffect(() => {
        if(!localMicOn)
            LiveAudioStream.stop();
        else if(localMicOn) LiveAudioStream.start();
    }, [localMicOn]);

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
            {connectionState == "connected" ?
                <Text style={styles.headerText}>
                    {"Connected"}
                </Text>
                :
                undefined
            }
            {connectionState == "connecting" ? 
                <Text style={styles.headerText}>
                    {"Connecting"}
                </Text>: undefined
            }
            {connectionState != "initial" ?
                <ScanningIndicator 
                    connectHandler={startConnection}
                    toggleMic={ () => {
                        setLocalMicOn(!localMicOn);
                    } }
                /> : undefined
            }
            <Toast />
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