import { Alert, PermissionsAndroid, Platform } from "react-native";
import { useLayoutEffect } from "react";
import BleManager from "react-native-ble-manager";

import Conn from "./Conn";
import ConnectionButtons from "./ConnectionButtons"; 

export default function ConnectionScreen() {

    useLayoutEffect(() => {
        async function permissions() {
            Alert.alert("Bluetooth is required", "For app' s functioning", [{ type: "OK" }]);

            if(Platform.OS === "android" && Platform.Version >= 31) {
                const result = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                ]);
                if(result.granted === false) {
                    Alert.alert("Bluetooth is required", "For app' s functioning", [{ type: "OK", 
                        onPress: async () => {
                            await permissions();
                        }
                    }]);                                       
                }
            } else if(Platform.OS === "android" && Platform.Version >= 23) {
                const checkResult = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                if(checkResult === false) {
                    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                    if(result === false) {
                        Alert.alert("Location permission is required", "For app' s functioning", [{ type: "OK", 
                        onPress: async () => {
                            await permissions();
                        }
                    }]);                                       
                }
            }
        }}
        permissions();

        try {
            BleManager.start({ showAlert: false }).then(() => {
                console.debug("BleManager: initialized");
            }).catch((error) => {
                console.error("BleManager: ", error);
            })
        } catch(error) {
            console.error("BleManager: Unexpected Error - ", error);
        }
        }, []);

    return(
    <>
        <Conn />
        <ConnectionButtons />
    </>   
    );
}