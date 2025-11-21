import { useContext, useEffect, useState, useRef, useMemo, useCallback } from "react";
import { StyleSheet, View, Text, Alert, TextInput } from "react-native";
import { Picker } from "@react-native-picker/picker";
import QRCode from "react-native-qrcode-svg";
import Ionicons from '@expo/vector-icons/Ionicons';
// import { CameraView, useCameraPermissions } from "expo-camera";

import Button from "../Button";
import Colors from "../../colors/colors";
import { Context } from "../../store/Context"; 
import { ConnectionContext } from "../../store/ConnectionContext";
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from "react-native-vision-camera";

export default function ScanningIndicator({ connectHandler, toggleMic }) {

    // states
    const { connectionState, setConnectionState, qrCodeText, setQrCodeText, 
            localMicOn, selectedLanguage } = useContext(Context);
    const { roomId } = useContext(ConnectionContext);
        // custom state regarding scanned
    const [scanned, setScanned] = useState(false);
    // const [permission, requestPermission] = useCameraPermissions();
    // states: end

    // useEffect(() => {
    //     if (!permission) {
    //         requestPermission();
    //     }
    // }, []);

    const handleScanAgain = () => {
        setQrCodeText("");
        setScanned(false);
    };

    // const handleBarcodeScanned = useCallback(({ data }) => {
    const handleBarcodeScanned = useCallback((code) => {

        if(!code || !code.value) return;
        const { value } = code;

        if (/[?\[\]=.,]/.test(value)) {
            setScanned(true);
            setQrCodeText("");
            Alert.alert(
                "Invalid QR Code", 
                "Please scan valid Room QR Code", 
                [{ type: "OK", onPress: handleScanAgain }]
            );
        } else {
            if (!scanned) { 
                console.log("value: ", value);
                setQrCodeText(value);
                setScanned(true);
            }
        }
    }, [scanned, handleScanAgain]);


    const joinButtonPressHandler = () => {
        setConnectionState("connecting");
        connectHandler();
    };

    // custom components
    // Language Options

    const LanguagePicker = () => (
        <View style={styles.pickerContainer}>
        <Picker
            selectedValue={null}
            onValueChange={(itemValue) => {
                selectedLanguage.current = itemValue;
            }}
            style={styles.languagePicker}
            dropdownIconColor={Colors.buttonText}  
        >
            <Picker.Item label="Select a language" value={null} enabled={false} />
            <Picker.Item label="English" value="en" />
            <Picker.Item label="Hindi" value="hi" />
            <Picker.Item label="French" value="fr" />
            <Picker.Item label="Spanish" value="es" />
        </Picker>
        </View>
    );

    const SenderComponent = () => {
        console.debug("SenderComponent[roomId]: ", roomId);
        return (
            <View style={styles.secondaryRootContainer}>
                <View style={styles.qrCodeView}>
                    {roomId && roomId !== "" ? 
                        <QRCode value={roomId}
                         size={250} 
                         backgroundColor="transparent"
                         quietZone={20} />
                    : undefined}
                </View>
                <Button 
                    MarginTop={"10%"} 
                    Width={"45%"}
                    Color={Colors.backgroundColor}
                    onPressHandler={joinButtonPressHandler}
                >
                    {"Join"}
                </Button>
                <Text style={styles.textStyle}>{"Scan the QR Code on another device"}</Text>
                <LanguagePicker />
            </View>
        );};
    const ReceiverComponent = () => {

        const CameraView = () => {
            const { hasPermission, requestPermission } = useCameraPermission();

            if(!hasPermission)
                requestPermission().then();

            const cameraDevice = useCameraDevice("back");
            const codeScanner = useCodeScanner({
                codeTypes: ["qr"], 
                onCodeScanned: codes => {
                    if(!codes || codes.length == 0) return;
                    const code = codes[0];
                    if(!code?.value) return;
                    handleBarcodeScanned(code);
                }
            });

            return (
                <View style={styles.cameraContainer}>
                <Camera
                    style={[styles.qrCameraView, 
                        { flex: 1, transform: [{ scale: 0.98 }] }]
                    }
                    isActive={true}
                    codeScanner={codeScanner}
                    device={cameraDevice}
                />
                </View>
            );
        };        

        return (
            <View style={styles.secondaryRootContainer}>
                    {/* {hasPermission?.granted && <CameraView />} */}
                <CameraView />
                <View style={styles.buttonContainer}>
                    <Button 
                        MarginTop={"10%"} 
                        Width={"45%"}
                        Color={Colors.backgroundColor}
                        onPressHandler={handleScanAgain}
                        isDisabled={!scanned ? true : false}
                    >
                        {"Scan Again"}
                    </Button>                        
                    <Button 
                        MarginTop={"10%"} 
                        Width={"45%"}
                        Color={Colors.backgroundColor}
                        onPressHandler={joinButtonPressHandler}
                        isDisabled={!(qrCodeText) ? true : false}
                    >
                        {"Join"}
                    </Button>                        
                </View>
                {/* <TextInput
                    collapsable={false}
                    style={styles.textInput}
                    value={qrCodeInput}
                    onChangeText={(t) => {
                        setQrCodeInput(t);
                    }}
                    placeholder="Or enter code manually"
                    placeholderTextColor={Colors.buttonText}
                />                 */}
                <Text style={styles.textInput}>{qrCodeText}</Text>
                <Text style={[styles.textStyle, {
                    fontSize: 18
                }]}>
                    {scanned ? "Scanned" : "Scanning..."}
                </Text>
                <LanguagePicker />
            </View>
        );
    };
    const ConnectedComponent = () => {
        return (
            <View style={styles.secondaryRootContainer}>
                <Button 
                    onPressHandler={toggleMic} 
                    Width={"45%"}
                    MarginTop={"5%"}
                    Color={Colors.backgroundColor}
                >
                    {localMicOn ? 
                        <Ionicons name="mic" size={24} color={Colors.buttonText} /> : 
                        <Ionicons name="mic-off" size={24} color={Colors.buttonText} />
                    }
                </Button>
            </View>
        );
    };
    // custom components: end

    return (<View style={styles.rootContainer}>
        {connectionState == "sender" && <SenderComponent/>}
        {connectionState == "receiver" && <ReceiverComponent/>}
        {connectionState == "connected" && <ConnectedComponent/>}
    </View>);
}

const styles = StyleSheet.create({
    rootContainer: {
        marginVertical: "2%",
        width: "100%",
        height: "80%",
        justifyContent: "center",
        alignItems: "center"
    }, 
    secondaryRootContainer: {
        flexDirection: "column", 
        width: "100%", 
        height: "100%", 
        justifyContent: "center", 
        alignItems: "center", 
    }, 
    qrCodeView: {
        width: "75%", 
        height: "50%",
        backgroundColor: Colors.buttonText,  
        justifyContent: "center", 
        alignItems: "center", 
        borderRadius: 20,
        overflow: "hidden",         
    }, 
    textStyle: {
        color: Colors.buttonText,
        fontFamily: "Boldonse-Regular", 
        fontSize: 20,
        textAlign: "center",
        marginTop: "2%"
    }, 
    textInput: {
        // flex: 1, 
        width: "80%", 
        height: "10%",
        marginTop: "2%", 
        marginLeft: "5%", 
        marginRight: "5%", 
        fontFamily: "Boldonse-Regular", 
        fontSize: 18,
        textAlign: "center",
        borderColor: Colors.buttonText,
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
    }, 
    cameraContainer: {
        justifyContent: "center",
        alignItems: "center",
        width: "90%",
        height: "60%"
    },
    buttonContainer: { 
        width: "100%",
        height: "auto", 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "space-between", 
    }, 
    qrCodeText: {
        height: 40,
        borderColor: Colors.buttonText,
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        width: "80%",
        marginTop: 10,
        color: Colors.buttonText,
        fontSize: 18,
        fontFamily: "Regular",
    },
    qrCameraView: {
        width: "90%",
        height: "100%",
        marginTop: "5%",
        borderRadius: 20,
        overflow: "hidden"
    },
    pickerContainer: {
        marginTop: "2%",
        height: "10%", 
        width: "80%",
        backgroundColor: Colors.backgroundColor,   
        borderRadius: 10,
        overflow: "hidden",                    
    },
    languagePicker: {
        color: Colors.buttonText,              
        height: "100%", 
        width: "100%"
    }
});