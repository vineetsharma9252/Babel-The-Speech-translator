import { Alert, StyleSheet, View } from "react-native";
import { useContext, useEffect } from "react";
// import AudioRecord from "react-native-audio-record";

import Button from "../Button";
import { Context } from "../../store/Context";
import { ConnectionContext } from "../../store/ConnectionContext";

export default function ConnectionButtons() {
    const { isReceiver, setIsReceiver, isSender, setIsSender,
         isUserWantConnection, setIsUserWantConnection , 
         isUserConnected, setIsUserConnected, setQrCodeText, 
   } = useContext(Context);

   const { ws } = useContext(ConnectionContext);

    // const notConnectedString = "You Are not Connected, Please Connect First !";

    // useEffect(() => {
    //     if(isUserWantConnection && !isUserConnected && (isReceiver || isSender))
    //         Alert.alert(notConnectedString, "You can connect from the following screen", [{ type: "OK", onPress: () => {} }]);
    // }, [isUserConnected, isUserWantConnection, isReceiver, isSender]);

    function nativeButtonPressHandler() {
        setIsReceiver(true);
        setIsSender(false);
    }
    function foreignButtonPressHandler() {
        setIsReceiver(false);
        setIsSender(true);
    }
    async function cancelHandler() {
        setIsUserWantConnection(false);
        setIsUserConnected(false);
        setIsReceiver(false);
        setIsSender(false);
        setQrCodeText("");

        setTimeout(() => {
            // manage some memory management logic here
            try {
                // AudioRecord.stop(); // Assuming AudioRecord is commented out as in the file
            } catch (error) {
                console.log("Error stopping AudioRecord:", error);
            }

            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.close();
            }
        }, 200);
    }

    return (
        <View style={styles.buttonContainer}>
            {!(isSender || isReceiver) ? (
                <>
                <Button onPressHandler={nativeButtonPressHandler}>Native</Button>
                <Button onPressHandler={foreignButtonPressHandler}>Foreign</Button>
                </>
            ) : (
                <Button 
                 onPressHandler={cancelHandler}>
                    {(!isUserConnected) ? "Cancel" : "Disconnect"}
                </Button>
            )}
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