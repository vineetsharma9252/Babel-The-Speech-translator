import { Alert, StyleSheet, View } from "react-native";
import { useContext, useEffect } from "react";
import PCM from 'react-native-pcm-player-lite'

import Button from "../Button";
import { Context } from "../../store/Context";
import { ConnectionContext } from "../../store/ConnectionContext";

export default function ConnectionButtons() {
    const { connectionState, setConnectionState, qrCodeText, setQrCodeText } = useContext(Context);

   const { socket, roomId } = useContext(ConnectionContext);

    async function nativeButtonPressHandler() {
        await setConnectionState("receiver");
    }
    async function foreignButtonPressHandler() {
        await setConnectionState("sender");
    }
    async function cancelHandler() {
        await setConnectionState("initial");
        if(connectionState === "connected") {
            await PCM.stop();
            const username = connectionState === "sender" ? "sender" : "receiver";
            socket.emit("leaveRoom", ({ username, roomId }));
        }
        setQrCodeText("");


        //     // manage some memory management logic here
        // try {
        //     if(ws.current && ws.current.readyState === WebSocket.OPEN) {
        //         ws.current.close();
        //     }
        // } catch (error) {
        //     console.log("Error stopping AudioRecord:", error);
        // }
    }

    return (
        <View style={styles.buttonContainer}>
            {connectionState == "initial" ? 
                <>
                <Button onPressHandler={nativeButtonPressHandler}>Native</Button>
                <Button onPressHandler={foreignButtonPressHandler}>Foreign</Button>
                </> : undefined
            }
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