import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { use, useContext, useEffect, useRef, useState } from "react";
import ScanningIndicator from "./ScanningIndicator";
import "react-native-get-random-values";
import { Buffer } from "buffer";
import Sound from "react-native-sound";
import LiveAudioStream from 'react-native-live-audio-stream';
import PCM from 'react-native-pcm-player-lite'
import { mediaDevices, MediaStream, RTCIceCandidate, RTCPeerConnection } from "react-native-webrtc";

import Colors from "../../colors/colors";
import { ConnectionContext } from "../../store/ConnectionContext";
import { Context } from "../../store/Context";
import Toast from "react-native-toast-message";
import { useAudioRecorder } from "@siteed/expo-audio-studio";

export default function Conn() {

    const { connectionState, setConnectionState, qrCodeText, 
            setQrCodeText, selectedLanguage, localMicOn, setLocalMicOn } = useContext(Context);

    // Audio Transmission: Logic Here
        const { socket, roomId, setRoomId, SERVER_URL, setSERVER_URL, 
                localStream, setLocalStream, remoteStream, setRemoteStream, 
                isMuted, setIsMuted, isVideoDisabled, setIsVideoDisabled, 
                peerConnection, dataChannel, setDataChannel, 
                messages, setMessages, isChannelOpen, setIsChannelOpen
            } = useContext(ConnectionContext);

        const iceCandidatesQueue = useRef([]);

        useEffect(() => {
            // if(roomId) return;
            if(connectionState == "sender")
                setRoomId(String(parseInt(Math.random() * 100000)));
             if(connectionState == "receiver" && qrCodeText !== "")
                setRoomId(qrCodeText);
            console.log("useEffect[roomId]: ", roomId);
        }, [connectionState, qrCodeText]);

        const getUserMedia = async () => {
            try {
                if(localStream) return localStream;
                const stream = await mediaDevices.getUserMedia({
                    video: {
                        width: { min: 640, ideal: 1280, max: 1920 },
                        height: { min: 360, ideal: 720, max: 1080 },
                        // frameRate: { min: 15, ideal: 30, max: 60 },
                        facingMode: 'user',
                    }, 
                    audio: false
                });
                console.log("Local stream obtained: ", stream);
                return stream;
            } catch(error) {
                console.error(`Error obtaining the stream: ${error}`);
                throw error;
            }
        };
        
        const createPeerConnection = () => {
            const configuration = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:19302" },
                { urls: "stun:stun3.l.google.com:19302" },
                { urls: "stun:stun4.l.google.com:19302" },

                {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject"
                },
                {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject"
                },
                {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject"
                }
            ]
            };

            const peerConnection = new RTCPeerConnection(configuration);
            peerConnection.addEventListener("icecandidate", event => {
                if(event.candidate)
                    socket.emit("ice-candidate", { candidate: event.candidate, roomId: roomId });
            });
            
            peerConnection.addEventListener('track', (event) => {
                console.log(`Remote track received: `, event.track);

                setRemoteStream(prev => {
                    const newStream = new MediaStream();

                    if(prev) {
                        prev.getTracks().forEach(track => {
                            newStream.addTrack(track);
                        });
                    }
                    newStream.addTrack(event.track);

                    return newStream;
                });

                if(connectionState == "receiver")
                    setConnectionState("connected");
            });

            peerConnection.addEventListener('connectionstatechange', () => {
                console.log("Connection State:", peerConnection.connectionState);
            });
            peerConnection.addEventListener('iceconnectionstatechange', () => {
                console.log("ICE Connection State:", peerConnection.iceConnectionState);
            });            

            return peerConnection;
        };

        useEffect(() => {
            if(peerConnection.current)
                setupDataChannel();
        }, [peerConnection.current]);

        const setupDataChannel = () => {
            let channel;
            try {
                channel = peerConnection.current.createDataChannel('messages', {
                ordered: true,
                });
            } catch(error) {
                console.log("Data Channel could not be created");
            }

            if(channel) {
            channel.addEventListener('open', () => {
                console.log('Data channel opened');
                setIsChannelOpen(true);
            });

            channel.addEventListener('close', () => {
                console.log('Data channel closed');
                setIsChannelOpen(false);
            });

            // channel.addEventListener('message', (event) => {
            //     console.log("audio received: ", event.data);
                
            // });

            setDataChannel(channel);

            peerConnection.current.addEventListener('datachannel', (event) => {
                const incomingChannel = event.channel;
                
                incomingChannel.addEventListener('message', (msgEvent) => {
                    console.log("Data Channel audio: ", msgEvent);
                    handleIncomingAudio(msgEvent.data);
                });
            });
        }};      

        const handleIncomingAudio = (data) => {
            try {
                const base64 = Buffer.from(data).toString("base64");
                PCM.enqueueBase64(base64);
            } catch(error) {
                console.error("[bufferEnqueue] error: ", error);
            }
        };  

        const initializeCall = async () => {
            try {
            if(peerConnection.current)
                peerConnection.current.close();
            const stream = await getUserMedia();
            setLocalStream(stream);
            peerConnection.current = createPeerConnection();

            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
            });

            } catch (error) {
            console.error('Failed to initialize call:', error);
            }
        };

        const processIceQueue = async () => {
            if(peerConnection.current && peerConnection.current.remoteDescription) {
                while (iceCandidatesQueue.current.length > 0) {
                const candidate = iceCandidatesQueue.current.shift();
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log("Processed queued ICE candidate");
                } catch (error) {
                    console.error("Error adding queued ICE candidate:", error);
                }
            }
            }
        };

        const setupSocketListeners = () => {
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');

            socket.on('offer', handleOffer);
            socket.on('answer', handleAnswer);
            socket.on('ice-candidate', handleIceCandidate);
        };        

        useEffect(() => {
            if (!roomId) return;

            const start = async () => {
                await initializeCall();
                setupSocketListeners();
            };

            start();

            return () => {
                if (peerConnection.current) {
                    peerConnection.current.close();
                    peerConnection.current = null;
                }
                socket.off('offer');
                socket.off('answer');
                socket.off('ice-candidate');
            };
        }, [roomId]);

        const createOffer = async () => {
            try {
                // WAIT until peerConnection.current exists AND stream is ready
                if (!peerConnection.current || !localStream) {
                console.log("Offer blocked: peer or stream not ready");
                return;
                }

                const offer = await peerConnection.current.createOffer();
                await peerConnection.current.setLocalDescription(offer);
                socket.emit("offer", { offer, roomId });

            } catch (error) {
                console.error("Error creating offer:", error);
            }
        };


        const handleOffer = async ({ offer }) => {
            try {
                if (peerConnection.current.signalingState !== "stable") {
                    await Promise.all([
                        peerConnection.current.setLocalDescription({type: "rollback"}),
                        peerConnection.current.setRemoteDescription(offer)
                    ]);
                } else {
                    await peerConnection.current.setRemoteDescription(offer);
                }
                if (!peerConnection.current) {
                    console.log("Offer received but peer not ready — waiting...");
                    setTimeout(() => handleOffer({ offer }), 100);
                    return;
                }

                await processIceQueue();

                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);

                socket.emit("answer", { answer, roomId });

            } catch (error) {
                console.error("Error handling offer:", error);
            }
        };

        const handleAnswer = async ({ answer }) => {
            try {
            await peerConnection.current.setRemoteDescription(answer);
            await processIceQueue();
            setConnectionState("connected");
            } catch (error) {
            console.error('Error handling answer:', error);
            }
        };

        const handleIceCandidate = async ({ candidate }) => {
            try {
                if (!peerConnection.current) return;

                if (peerConnection.current.remoteDescription) {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    console.log("Queueing ICE candidate (remote description null)");
                    iceCandidatesQueue.current.push(candidate);
                }
                } catch (error) {
                    console.error('Error adding ICE candidate:', error);
                }
        };
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
                    // setConnectionState("connected");
                    setLocalMicOn(true);
                    // Sound.setCategory("Playback");
                    console.debug("connected");
                });

                socket.once("newParticipantJoined", async username => {
                    if (connectionState === "sender") {
                        // await peerConnection.current.getTransceivers();
                        await createOffer();
                        Toast.show({
                            type: "info", 
                            text1: `${username} has joined the your room: ${roomId}`
                        });
                    }
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
    
    const buffer = useRef(Buffer.alloc(0));
    // const { isRecording, startRecording, stopRecording, recordingStatus } = useAudioRecorder();

    useEffect(() => {
        if(!socket) return;
        const options = {
            sampleRate: 16000, 
            channels: 1,
            bitsPerSample: 16, 
            audioSource: 7, 
            bufferSize: 64
        };

        try {
        if(connectionState == "sender" || connectionState == "receiver")
        LiveAudioStream.init(options);
        if(connectionState == "connected")
            LiveAudioStream.start();

        const startPCMPlayer = async () => {
            await PCM.start(16000);
        };
        startPCMPlayer();
        } catch(error) {
            console.log("Error starting PCM player or LiveAudioStream: ", error);
        }

        const dataListener = LiveAudioStream.on("data", data => {
            buffer.current = Buffer.concat([buffer.current, Buffer.from(data, "base64")]);
            if(buffer.current.length >= 128) {
                    // console.log("hi");
                   dataChannel.send(buffer.current); 
                   buffer.current = Buffer.alloc(0);
            }
        });        

        return async () => {
            try {
                if(isMuted)
                    LiveAudioStream.stop();
                dataListener.remove();
                await PCM.stop();
            } catch(error) {
                console.warn("Error[LiveAudioStream.stop()]: ", error);
            }
        };
    }, [connectionState, socket, roomId]);

    const toggleMic = () => {
        setIsMuted(prevIsMuted => {
            if(LiveAudioStream) {
                if(prevIsMuted && connectionState == "connected" && dataChannel && isChannelOpen)
                    LiveAudioStream.start();
                else LiveAudioStream.stop();
            }
            
            return !prevIsMuted;
        });
    };

    const toggleVideo = () => {
        if (localStream) {
        localStream.getVideoTracks().forEach(track => {
            track.enabled = isVideoDisabled;
        });
        setIsVideoDisabled(!isVideoDisabled);
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
            {connectionState == "changeIP" ?
                <>
                    <Text style={styles.headerText}>
                        {"Change your Server IP"}
                    </Text>
                    <TextInput multiline value={SERVER_URL}
                     style={styles.serverIPInput}
                     onChangeText={text => 
                        setSERVER_URL(text)
                     }
                     />
                </>
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
                    toggleMic={toggleMic}
                    toggleVideo={toggleVideo}
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
    serverIPInput: {
        marginTop: "5%", 
        // flex: 1, 
        width: "80%", 
        height: "15%",
        borderColor: Colors.buttonText,
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        color: Colors.buttonText,
        fontSize: 18,
        fontFamily: "Boldonse-Regular",
    }, 
    headerText: {
        color: Colors.buttonText,
        fontFamily: "Boldonse-Regular",
        fontSize: 24,  
        textAlign: "center", 
        padding: "5%"
    }
});