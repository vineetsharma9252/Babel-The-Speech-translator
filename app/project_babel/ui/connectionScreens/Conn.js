import { StyleSheet, Text, View } from "react-native";
import { useContext, useEffect, useRef, useState } from "react";
import { mediaDevices } from "react-native-webrtc";
import SocketIOClient from "socket.io-client";

import Colors from "../../colors/colors";
import { Context } from "../../store/Context";
import ScanningIndicator from "./ScanningIndicator";

export default function Conn() {
    const { isSender, setIsSender, isReceiver, 
            setIsReceiver, isUserWantConnection, setIsUserWantConnection, isUserConnected,
            setIsUserConnected } = useContext(Context);
    const [headerText, setHeaderText] = useState("Start the App by pressing one of the buttons below.");

    useEffect(() => {
        console.log("isSender: ", isSender);
        console.log("isReceiver: ", isReceiver);
        console.log("isUserWantConnection: ", isUserWantConnection);
        console.log("isUserConnected: ", isUserConnected);

        if(!isUserWantConnection) {
            setHeaderText("Start the App by pressing one of the buttons below.");
            return;
        }
        setHeaderText(isSender? "You are the sender" : "You are the receiver");
    }, [isSender, isUserWantConnection]);

    // useEffect(() => {

    //     if(isUserWantConnection) {
    //         // start scan for the nearby devices
    //     }

    // }, [isUserWantConnection]);

    // ** web-rtc logic here **

    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);

    const [callerId] = useState(
        Math.floor(100000 + Math.random() * 900000).toString()
    );
    const otherUserId = useRef(null);
    const socket = useRef(null);
    const peerConnection = useRef(null);
    const remoteRTCMessage = useRef(null);
    const localRTCMessage = useRef(null);

    const [localMicOn, setLocalMicOn] = useState(true);

    useEffect(() => {
        if(!socket.current) return;

        socket.current.on("newCall", (data) => {
            remoteRTCMessage.current = data.rtcMessage;
            otherUserId.current = (isSender)? data.callerId : null;
        });
        socket.current.on("callAnswered", data => {
            remoteRTCMessage.current = data.rtcMessage;
            peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(remoteRTCMessage.current)
            );
        });
        socket.current.on("ICEcandidate", data => {
            let message = data.rtcMessage;

            if(peerConnection.current) {
                peerConnection?.current.addIceCandidate(
                    new RTCIceCandidate({
                        candidate: message.candidate, 
                        sdpMid: message.sdpMid, 
                        sdpMLineIndex: message.label
                    }) 
                ).then(data => { console.log("SUCCESS !"); })
                .catch(error => { console.error("peerConnection?.current.addIceCandidate: Error ", error); })
            }
        });

        mediaDevices.getUserMedia({
            audio: true, 
            video: false
        }).then(stream => {
            setLocalStream(stream);
            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
            });
        }).catch(error => {
            console.error("mediaDevices.getUserMedia: Error ", error);
        });

        peerConnection.current.onaddstream = event => {
            setRemoteStream(event.stream);
        };

        peerConnection.current.onicecandidate = event => {
            if(event.candidate) {
                sendICEcandidate({
                    calleeId: otherUserId.current, 
                    rtcMessage: {
                        label: event.candidate.sdpMLineIndex, 
                        id: event.candidate.sdpMid, 
                        candidate: event.candidate.candidate
                    }
                });
            } else {
                console.log("End of ICE candidates.");
            }
        };
        
        return () => {
            socket.current.off("newCall");
            socket.current.off("callAnswered");
            socket.current.off("ICEcandidate");
        }
    }, []);

    // audio routing using InCallManager
    useEffect(() => {
        if(!peerConnection.current) return;
        InCallManager.start();
        InCallManager.setKeepScreenOn(true);
        InCallManager.setForceSpeakerphoneOn(true);

        return () => {
            InCallManager.stop();
        };
    }, []);

    function sendICEcandidate(data) {
        socket.current.emit("ICEcandidate", data);
    }

    async function processCall() {
        if(!peerConnection.current) return;

        const sessionDescription = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(sessionDescription);
        sendCall({
            calleeId: otherUserId.current, 
            rtcMessage: sessionDescription

        });
        setIsUserConnected(true);
    }

    async function processAccept() {
        if(!peerConnection.current || !remoteRTCMessage.current) return;

        await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(remoteRTCMessage.current)
        );

        const sessionDescription = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(sessionDescription);
        answerCall({
            callerId: otherUserId.current, 
            rtcMessage: sessionDescription
        });
        setIsUserConnected(true);
    }

    function answerCall(data) {
        socket.current.emit("answerCall", data);
    }

    function sendCall(data) {
        socket.current.emit("call", data);
    }

    useEffect(() => {
        function leave() {
            if(isUserConnected) {
                peerConnection.current.close();
                socket.current?.disconnect();
                peerConnection.current = null;
                socket.current = null;
                otherUserId.current = null;
        
                setRemoteStream(null);
                setLocalStream(null);
        
                setIsUserConnected(false);
                setIsReceiver(false);
                setIsSender(false);
                setIsUserWantConnection(false);
            }
        }
        leave();
    }, [isUserConnected]);

    function toggleMic() {
        // TODO: implement it in frontend

        localMicOn ? setLocalMicOn(false) : setLocalMicOn(true);
        localStream.getAudioTracks().forEach(track => {
            localMicOn ? (track.enabled = false) : (track.enabled = true);
        });
    }

    async function connectHandler() {
        try {
            if(isReceiver)
                otherUserId.current = qrCodeText;
            // update after deploying the server
            socket.current = SocketIOClient("http://192.168.1.34:3500", {
                transports: ["websocket"], 
                query: {
                    callerId
                }
            });
            
            peerConnection.current = new RTCPeerConnection({
                iceServers: [
                    {
                        urls: "stun:stun.l.google.com:19302"
                    }, 
                    {
                        urls: "stun:stun1.l.google.com:19302"
                    }, 
                    {
                        urls: "stun:stun2.l.google.com:19302"
                    }
                ]
            });

            if(isReceiver)
                processCall();
            else
                processAccept();

        } catch(error) {
            console.error("connectHandler: ", error);
        }
    }

    // ** web-rtc logic ends ** //

    return (
    <>
    <View style={styles.upperContainer}>
        <Text style={styles.headerText}>{ headerText }</Text>
        { (isUserWantConnection) ?
            <ScanningIndicator text={(!isUserConnected) ? "Scanning...": "Connected"}
                connectHandler={connectHandler}
                callerId={callerId} /> : null
        } 
        {/* Here now prepare new component for handling the call screen */}
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