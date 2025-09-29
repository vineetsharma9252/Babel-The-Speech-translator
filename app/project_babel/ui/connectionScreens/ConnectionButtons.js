import { Alert, StyleSheet, View } from "react-native";
import { useContext, useEffect } from "react";

import Button from "../Button";
import { Context } from "../../store/Context";

export default function ConnectionButtons() {
    const { isReceiver, setIsReceiver, isSender, setIsSender,
         isUserWantConnection, setIsUserWantConnection , 
         isUserConnected, setIsUserConnected } = useContext(Context);

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
        setIsReceiver(false);
        setIsSender(false);

        return () => {
            // manage some memory management logic here
        };
    }

    return (
        <View style={styles.buttonContainer}>
            {!isUserWantConnection? (
                <>
                <Button onPressHandler={nativeButtonPressHandler}>Native</Button>
                <Button onPressHandler={foreignButtonPressHandler}>Foreign</Button>
                </>
            ) : (
                <Button onPressHandler={cancelHandler}>Cancel</Button>
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