import { Alert, StyleSheet, Text, View } from "react-native";
import { useContext, useEffect, useRef, useState } from "react";
import InCallManager from 'react-native-incall-manager';
import { mediaDevices } from "react-native-webrtc";
import database, { set } from "@react-native-firebase/database";
import SocketIOClient from "socket.io-client";
import { v4 as uuidv4} from uuid;

import Colors from "../../colors/colors";
import { Context } from "../../store/Context";
import ScanningIndicator from "./ScanningIndicator";

export default function Conn() {
    const { isSender, setIsSender, isReceiver, 
            setIsReceiver, isUserWantConnection, setIsUserWantConnection, isUserConnected,
            setIsUserConnected, localMicOn, setLocalMicOn, qrCodeText, setQrCodeText } = useContext(Context);
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

    // ** web-rtc logic here **

    const ICE_SERVERS = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302"}
    ];

    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
            // roomId = url in ScanningIndicator.js
    const [roomId, setRoomId] = useState(null);
    
    const pc = useRef(null);
    const uid = useRef(uuidv4());
    const candidatesRef = useRef(null);

    useEffect(() => {
        return () => { cleanUp(); }
    }, []);

    useEffect(() => {
        if(isUserConnected) {
            InCallManager.start({ media: "audio" });
            InCallManager.setKeepScreenOn(true);
            InCallManager.setForceSpeakerphoneOn(true);
        } else {
            InCallManager.stop();
            InCallManager.setKeepScreenOn(false);
        }
    }, [isUserConnected]);

    const initLocalAudio = async () => {
        try {
            const stream = await mediaDevices.getUserMedia({ audio: true, video: false});
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error("initLocalAudio: error ", error);
            Alert.alert("Microphone Access Error", "Unable to Access Microphone.");
            throw error;
        }
    };

    const makePeerConnection = () => {
        pc.current = new RTCPeerConnection({ isServers: ICE_SERVERS });

        pc.current.onicecandidate = (event) => {
            if(event.candidate) {
                const cand = {
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex, 
                    from: uid.current
                };

                database().ref(`rooms/${roomId}/candidates/${uid.current}`).push(cand);
            }
        };

        pc.current.ontrack = (event) => {
            if(event.streams && event.streams[0])
                // remote stream => event.streams[0]
                setRemoteStream(event.streams[0]);
        };

        return pc.current;
    };

    function listenForRemoteCandidates() {
        if(!roomId) return;

        const ref = database().ref(`rooms/${roomId}/candidates`);
        candidatesRef.current = ref;

        ref.on("child_added", (userCandidatesSnap) => {
            userCandidatesSnap.ref.on("child_added", (snap) => {
                const candidate = snap.val();
                if(cand.from === uid.current) return;
                try {
                    pc.current?.addIceCandidate(new RTCIceCandidate({
                        candidate: candidate.candidate,
                        sdpMid: candidate.sdpMid,
                        sdpMLineIndex: candidate.sdpMLineIndex
                    }));
                } catch(error) {
                    console.warn("addIceCandidate error: ", error);
                }
            });
        });
    }

    const createRoomAndOffer = async () => {
        if(!roomId) {
            const newRoomId = uuidv4();
            setRoomId(newRoomId);
        }
        await initLocalAudio();
        makePeerConnection();

        localStream?.getTracks().forEach((track) => 
            pc.current.addTrack(track, localStream)
        );

        if(!localStream) {
            const stream = await initLocalAudio();
            stream.getTracks().forEach((track) => 
                pc.current.addTrack(track, stream)
            );
        }

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        
        const roomRef = database().ref(`rooms/${roomId}`);
        await roomRef.child("offer").set({
            sdp: offer.sdp,
            type: offer.type,
            from: uid.current
        });

        roomRef.child("answer").on("value", async snapshot => {
            const val = snapshot.val();
            if(val && val.sdp) {
                const answerDescription = new RTCSessionDescription({
                    type: val.type || "answer", 
                    sdp: val.sdp
                });
                await pc.current.setRemoteDescription(answerDescription);
                setIsUserConnected(true);
            }
        })

        listenForRemoteCandidates();
    };

    const joinRoomAndAnswer = async (targetRoomId) => {
        if(!targetRoomId && !roomId) {
            Alert.alert("Error", "No room id to join");
            return;
        }
        const room = targetRoomId || roomId;
        setRoomId(room);
        await initLocalAudio();
        makePeerConnection();
        
        localStream?.getTracks().forEach((track) => 
            pc.current.addTrack(track, localStream)
        );

        if(!localStream) {
            const stream = await initLocalAudio();
            stream.getTracks().forEach((track) => 
                pc.current.addTrack(track, stream)
            );
        }

        const roomRef = database().ref(`rooms/${room}`);
        const offerSnap = await roomRef.child("offer").once("value");
        const offer = offerSnap.val();
        if(!offer || !offer.sdp) {
            Alert.alert("Error", "Offer not found in room.");
            return;
        }

        const offerDescription = new RTCSessionDescription({
            type: offer.type || "offer", 
            sdp: offer.sdp
        });
        await pc.current.setRemoteDescription(offerDescription);

        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);

        await roomRef.child("answer").set({
            sdp: answer.sdp, 
            type: answer.type, 
            from: uid.current
        });

        listenForRemoteCandidates();
        setIsUserConnected(true);
    };

    const connectHandler = async () => {
        try {
            if(isSender) {
                if(!roomId) {
                    const newId = uuidv4();
                    setRoomId(newId);
                }
                await createRoomAndOffer();
            }
            else if(isReceiver) {
                if(qrCodeText === "") {
                    Alert.alert("No room scanned", "Scan QR code first !");
                    return;
                }
            }
        } catch(error) {
            console.error("connecthandler: error ", error);
        }
    };

    const toggleMic = () => {
        if(!localStream) return;
        const track = localStream.getAudioTracks()[0];
        if(!track) return;
        track.enabled = !track.enabled;
        setLocalMicOn(track.enabled);
    };

    const cleanUp = async() => {
        try {
            setIsUserConnected(false);
            if(roomId) {
                const roomRef = database().ref(`rooms/${roomId}`);
                roomRef.child("answer").off();
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
        } catch(error) {
            console.warn("cleanup: error", err);
        }
    };

    // ** web-rtc logic ends ** //

    return (
    <>
    <View style={styles.upperContainer}>
        <Text style={styles.headerText}>{ headerText }</Text>
        { (isUserWantConnection) ?
            <ScanningIndicator text={(!isUserConnected) ? "Scanning...": "Connected"}
                connectHandler={connectHandler}
                callerId={roomId} /> : null
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