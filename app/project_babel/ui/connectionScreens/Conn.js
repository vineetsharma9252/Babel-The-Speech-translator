import { Alert, StyleSheet, Text, View } from "react-native";
import { useContext, useEffect, useCallback, useState, useLayoutEffect } from "react";
import InCallManager from 'react-native-incall-manager';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from "react-native-webrtc";
import database, { set } from "@react-native-firebase/database";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

import Colors from "../../colors/colors";
import { Context } from "../../store/Context";
import ScanningIndicator from "./ScanningIndicator";
import { ConnectionContext } from "../../store/ConnectionContext";

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

    const {
        localStream, setLocalStream, 
        remoteStream, setRemoteStream, 
        roomId, setRoomId, 
        pc, 
        uid, 
        candidatesRef, 
        cleanUp
    } = useContext(ConnectionContext);

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
        pc.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.current.onicecandidate = (event) => {
            if(event.candidate) {
                const cand = {
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex, 
                    from: uid.current
                };

                database().ref(`rooms/${roomId}/candidates/${uid.current}`).push(cand);
                setIsUserConnected(true);
            }
        };

        pc.current.ontrack = (event) => {
            if(event.streams && event.streams[0])
                // remote stream => event.streams[0]
                setRemoteStream(event.streams[0]);
        };

        pc.current.oniceconnectionstatechange = () => {
            const state = pc.current?.iceConnectionState;
            console.log("ICE Connection State:", state);
            if (state === "connected" || state === "completed") {
                setIsUserConnected(true);
            } else if (state === "disconnected" || state === "failed" || state === "closed") {
                setIsUserConnected(false);
            }
        };


        return pc.current;
    };

    function listenForRemoteCandidates() {
        // if(!roomId) return;

        const ref = database().ref(`rooms/${roomId}/candidates`);
        candidatesRef.current = ref;

        ref.on("child_added", (userCandidatesSnap) => {
            userCandidatesSnap.ref.on("child_added", (snap) => {
                const candidate = snap.val();
                if(candidate.from === uid.current) return;
                const iceCandidate = new RTCIceCandidate(candidate);
                pc.current?.addIceCandidate(iceCandidate).catch(error => 
                    console.warn("addIceCandidate error: ", error)
                );
            });
        });
    }

    const prepareLocalAudio = async () => {
        if(!localStream) {
            const stream = await initLocalAudio();
            setLocalStream(stream);
            return stream;
        }
        return localStream;
    };

    const createRoomAndOffer = async () => {
        const newRoomId = roomId || uuidv4();
        if (!roomId) {
            setRoomId(newRoomId);
        }

        const stream = localStream || await prepareLocalAudio();

        pc.current = makePeerConnection();

        stream.getTracks().forEach((track) => 
            pc.current.addTrack(track, stream));

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        const roomRef = database().ref(`rooms/${newRoomId}`);
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
            }
        })

        listenForRemoteCandidates(newRoomId);
    };

    const joinRoomAndAnswer = async (targetRoomId) => {
        const room = targetRoomId;
        setRoomId(room);

        const stream = localStream || await prepareLocalAudio();

        pc.current = makePeerConnection();
        
        stream.getTracks().forEach((track) => 
            pc.current.addTrack(track, stream));

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

        listenForRemoteCandidates(room);
    };

    const connectHandler = async () => {
        try {

            if((isReceiver || isSender) && isUserWantConnection) {
                InCallManager.start({ media: "audio" });
                InCallManager.setKeepScreenOn(true);
                InCallManager.setSpeakerphoneOn(true);
                InCallManager.setForceSpeakerphoneOn(true);
            }

            if(isSender) 
                await createRoomAndOffer();
            else if(isReceiver)
                await joinRoomAndAnswer(qrCodeText);
            setIsUserConnected(true);
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

    // useEffect(() => {
    //     if((isReceiver || isSender) && isUserWantConnection && isUserConnected) {
    //             InCallManager.start({ media: "audio" });
    //             InCallManager.setKeepScreenOn(true);
    //             InCallManager.setSpeakerphoneOn(true);
    //             InCallManager.setForceSpeakerphoneOn(true);
    //     }
        
    // }, [isReceiver, isSender, isUserConnected, isUserWantConnection]);

    // ** web-rtc logic ends ** //

    return (
    <>
    <View style={styles.upperContainer}>
        <Text style={styles.headerText}>{ headerText }</Text>
        { (isUserWantConnection) ?
            <ScanningIndicator text={(!isUserConnected) ? "Scanning...": "Connected"}
                connectHandler={connectHandler}
                toggleMic={toggleMic}
                callerId={roomId} /> : null
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