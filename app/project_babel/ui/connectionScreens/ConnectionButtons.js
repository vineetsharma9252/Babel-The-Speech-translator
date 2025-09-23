import { Alert, Linking, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, StyleSheet, View } from "react-native";
import { useContext, useEffect, useLayoutEffect } from "react";
import * as IntentLauncher from "expo-intent-launcher";
import BleManager from "react-native-ble-manager";

import Button from "../Button";
import { Context } from "../../store/Context";

export default function ConnectionButtons() {
    const { isReceiver, setIsReceiver, isSender, setIsSender,
         isUserWantConnection, setIsUserWantConnection , isUserConnected, setIsUserConnected } = useContext(Context);

    const notConnectedString = "You Are not Connected, Please Connect First !";

    function nativeButtonPressHandler() {
        if(!isUserConnected) {
            Alert.alert(notConnectedString, "Please Connect to Another Device through the Bluetooth connection screen.", [{ text: "OK", 
                onPress: () => {
                    async function pressHandler() {
                        if(Platform.OS === "android") 
                            await IntentLauncher.startActivityAsync('android.settings.BLUETOOTH_SETTINGS');    
                        else if(Platform.OS === "ios") 
                            Linking.openURL("App-Prefs:Bluetooth");
                        setIsUserConnected(true);
                }
                pressHandler();
            }
            }]);
        }

        setIsReceiver(true);
        setIsSender(false);
        setIsUserWantConnection(true);
    }
    function foreignButtonPressHandler() {
        if(!isUserConnected) {
            Alert.alert(notConnectedString, "Please Connect to Another Device through the Bluetooth connection screen.", [{ text: "OK", 
                onPress: () => {
                    async function pressHandler() {
                        if(Platform.OS === "android") 
                            await IntentLauncher.startActivityAsync('android.settings.BLUETOOTH_SETTINGS');    
                        else if(Platform.OS === "ios") 
                            Linking.openURL("App-Prefs:Bluetooth");
                        setIsUserConnected(true);
                }
                pressHandler();
            }
            }]);
        }

        setIsReceiver(false);
        setIsSender(true);
        setIsUserWantConnection(true);
    }
    function cancelHandler() {
        setIsUserWantConnection(false);
        setIsReceiver(false);
        setIsSender(false);
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