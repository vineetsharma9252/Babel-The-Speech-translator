import { useState, useEffect, useLayoutEffect, useContext, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, TextInput, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Picker } from "@react-native-picker/picker";
import QRCode from "react-native-qrcode-svg";
import Ionicons from '@expo/vector-icons/Ionicons';

import Colors from "../../colors/colors";
import Button from "../Button";
import { Context } from "../../store/Context";
import { ConnectionContext } from "../../store/ConnectionContext";

const languageOptions = [
    { label: "English", value: "en" },
    { label: "Hindi", value: "hi" },
    { label: "French", value: "fr" },
    { label: "Spanish", value: "es" },
];

export default function ScanningIndicator({ text, connectHandler, toggleMic }) {

    const { 
        isSender, isReceiver, qrCodeText, setQrCodeText, isUserConnected, 
        localMicOn, setLocalMicOn, isUserWantConnection, setIsUserWantConnection,
        selectedLanguage, setSelectedLanguage
    } = useContext(Context);

    const { roomId } = useContext(ConnectionContext);
    
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    const connectBtnPressHandler = () => {
        setIsUserWantConnection(true);
    };

    const handleScanAgain = () => {
        setScanned(false);
        setQrCodeText("");
    };

    const handleBarcodeScanned = useCallback(({ data }) => {
        if (/[?\[\]=.,]/.test(data)) {
            setScanned(true);
            // setQrCodeText("");
            Alert.alert(
                "Invalid QR Code", 
                "Please scan valid Room QR Code", 
                [{ type: "OK", onPress: handleScanAgain }]
            );
        } else {
            if (!scanned) { 
                setQrCodeText(data);
                setScanned(true);
            }
        }
    }, [scanned, setQrCodeText, handleScanAgain]);
    
    const LanguagePicker = () => (
        <Picker
            selectedValue={selectedLanguage}
            onValueChange={(itemValue) => {
                setSelectedLanguage(itemValue);
            }}
        >
            {languageOptions.map(lang => (
                <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
            ))}
        </Picker>
    );
    
    if (!isUserConnected && (isSender || isReceiver)) {
        return (
            <View style={styles.rootContainer}>
                
                <View style={styles.cameraContainer}>
                    {permission?.granted && (
                        (isReceiver) ? (
                            <CameraView
                                facing="back"
                                style={styles.qrCameraView}
                                barcodeScannerSettings={{
                                    barcodeTypes: ["qr"]
                                }}
                                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                            />
                        ) : (

                            <View style={styles.qrcodeImage}>
                                {
                                (roomId && isSender) ? 
                                    <QRCode value={roomId} size={250} quietZone={20} /> : null
                                }
                            </View>
                        )
                    )}
                </View>

                {isReceiver && (
                    <>
                        <View style={styles.secondaryText}>
                            {(scanned || qrCodeText) ? (
                                <View style = {styles.buttonContainer}>
                                    <Button 
                                        MarginTop={"10%"} 
                                        Width={"45%"}
                                        Color={Colors.backgroundColor}
                                        onPressHandler={handleScanAgain}
                                    >
                                        {"Scan Again"}
                                    </Button>
                                    <Button 
                                        MarginTop={"10%"} 
                                        Width={"45%"}
                                        Color={Colors.backgroundColor}
                                        onPressHandler={connectBtnPressHandler}
                                    >
                                        {"Join"}
                                    </Button>
                                </View>
                            ) : (
                                <Text style={styles.textStyle}>{text}</Text> 
                            )}
                        </View>
                        
                        <View style={styles.qrCodeView}>
                            <TextInput
                                style={styles.qrCodeText}
                                value={qrCodeText}
                                onChangeText={(t) => setQrCodeText(t)}
                                placeholder="Or enter code manually"
                                placeholderTextColor={Colors.buttonText}
                            />
                            <LanguagePicker />
                        </View>
                    </>
                )}

                {isSender && (
                    <>
                        <Button 
                            MarginTop={"5%"} 
                            Width={"45%"}
                            Color={Colors.backgroundColor}
                            onPressHandler={connectBtnPressHandler}
                        >
                            {"Join"}
                        </Button>
                        <View style={styles.senderInfoContainer}>
                            <Text style={[styles.textStyle, {
                                marginTop: "5%"
                            }]}>{"Scan the QR Code on another device"}</Text>
                            <LanguagePicker /> 
                        </View>
                    </>
                )}
            </View>
        );
    } 
    
    else if (isUserConnected) {
        return (
            <View style={styles.rootContainer}>
                <Text style={styles.textStyle}>{text}</Text>
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
    }

    return null;
}

const styles = StyleSheet.create({
    rootContainer: {
        marginVertical: "5%",
        width: "80%",
        height: "80%",
        justifyContent: "center",
        alignItems: "center"
    },
    cameraContainer: {
        justifyContent: "center",
        alignItems: "center",
        width: "90%",
        height: "60%"
    },
    qrCameraView: {
        width: "100%",
        height: "100%",
        borderRadius: 20,
        overflow: "hidden"
    },
    textStyle: {
        color: Colors.buttonText,
        fontFamily: "Boldonse-Regular", 
        fontSize: 20,
        textAlign: "center",
        marginTop: "10%"
    },
    secondaryText: {
        width: "100%", 
    },
    buttonContainer: {
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center", 
        width: "100%"
    }, 
    senderInfoContainer: {
        width: "100%",
        marginTop: "5%",
    },
    qrCodeView: {
        flex: 1, 
        width: "100%", 
        height: "100%", 
        marginTop: "5%", 
        justifyContent: "center", 
    },
    qrCodeText: {
        borderWidth: 1,
        borderColor: Colors.buttonText,
        color: Colors.buttonText, 
        borderRadius: 5,
        textAlign: "center",
        fontFamily: "Boldonse-Regular",
        fontSize: 20,
        padding: 10,
    }, 
    qrcodeImage: {
        flexDirection: "column", 
        justifyContent: "center", 
        alignItems: "center", 
        borderRadius: 20,  
        overflow: "hidden", 
    }
});