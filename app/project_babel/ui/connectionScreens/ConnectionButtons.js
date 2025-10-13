import { Alert, StyleSheet, View } from "react-native";
import { useContext, useEffect } from "react";

import Button from "../Button";
import { Context } from "../../store/Context";
import { ConnectionContext } from "../../store/ConnectionContext";

export default function ConnectionButtons() {
    const { isReceiver, setIsReceiver, isSender, setIsSender,
         isUserWantConnection, setIsUserWantConnection , 
         isUserConnected, setIsUserConnected, setQrCodeText, 
         setConnecting
   } = useContext(Context);
   
   const { cleanUp } = useContext(ConnectionContext);

    const notConnectedString = "You Are not Connected, Please Connect First !";

    useEffect(() => {
        if(isUserWantConnection && !isUserConnected && (isReceiver || isSender))
            Alert.alert(notConnectedString, "You can connect from the following screen", [{ type: "OK", onPress: () => {} }]);
    }, [isUserConnected, isUserWantConnection, isReceiver, isSender]);

    function nativeButtonPressHandler() {
        setIsReceiver(true);
        setIsSender(false);
        setIsUserWantConnection(true);
    }
    function foreignButtonPressHandler() {
        setIsReceiver(false);
        setIsSender(true);
        setIsUserWantConnection(true);
    }
    function cancelHandler() {
        setIsUserWantConnection(false);
        setIsUserConnected(false);
        setIsReceiver(false);
        setIsSender(false);
        setQrCodeText("");
        setConnecting(false);

        // manage some memory management logic here
        cleanUp();
    }

    return (
        <View style={styles.buttonContainer}>
            {!isUserWantConnection? (
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