import { Alert, StyleSheet, View } from "react-native";
import { useContext, useEffect } from "react";
import PCM from 'react-native-pcm-player-lite'

import Button from "../Button";
import { Context } from "../../store/Context";
import { ConnectionContext } from "../../store/ConnectionContext";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../colors/colors";

export default function ConnectionButtons() {
    const { connectionState, setConnectionState, qrCodeText, setQrCodeText } = useContext(Context);

    const { socket, roomId, setRoomId, SERVER_URL, setSERVER_URL, 
        localStream, setLocalStream, remoteStream, setRemoteStream, 
        isMuted, setIsMuted, isVideoDisabled, setIsVideoDisabled, 
        peerConnection
    } = useContext(ConnectionContext);

    async function nativeButtonPressHandler() {
        await setConnectionState("receiver");
    }
    async function foreignButtonPressHandler() {
        await setConnectionState("sender");
    }
    async function serverIpChangeHandler() {
        console.log(`[update]SERVER_URL: ${SERVER_URL}`);
        await setConnectionState("changeIP");
    }
    async function saveHandler() {
        setConnectionState("initial");
    }
    async function cancelHandler() {
        // First, perform cleanup if a connection is active or in progress.
        if (["connected", "connecting", "sender", "receiver"].includes(connectionState)) {
            const username = connectionState === "sender" ? "sender" : "receiver";

            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (peerConnection.current) {
                peerConnection.current.close();
            }
            setLocalStream(null);
            setRemoteStream(null);
            socket.emit("leaveRoom", { username, roomId });
        }
        // Now, reset the state.
        setConnectionState("initial");
        setQrCodeText("");
    }

    return (
        <View style={styles.buttonContainer}>
            {connectionState == "initial" ? 
                <>
                <Button onPressHandler={nativeButtonPressHandler}>Native</Button>
                <Button onPressHandler={serverIpChangeHandler} Width={"10%"}>
                    {<Ionicons name="link" size={24} color={Colors.buttonText} />}
                </Button>
                <Button onPressHandler={foreignButtonPressHandler}>Foreign</Button>
                </> : undefined
            }
            {connectionState == "changeIP" ? 
                <Button 
                 onPressHandler={saveHandler}>
                    {"Save"}
                </Button>
                : undefined}
            {connectionState == "receiver" || connectionState == "sender" ? 
                <Button 
                 onPressHandler={cancelHandler}>
                    {"Cancel"}
                </Button> : undefined
            }
            {connectionState == "connecting" ? 
                <Button 
                 onPressHandler={cancelHandler}>
                    {"Cancel"}
                </Button> : undefined
            }
            {connectionState == "connected" ? 
                <Button 
                 onPressHandler={cancelHandler}>
                    {"Disconnect"}
                </Button> : undefined
            }
        </View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        marginBottom: "5%",
        flexDirection: "row", 
        justifyContent: "space-around", 
        alignItems: "center"
    }
});