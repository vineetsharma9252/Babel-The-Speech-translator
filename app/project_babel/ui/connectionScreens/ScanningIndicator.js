import { useState, useEffect, useLayoutEffect, useContext } from "react";
import { View, Text, StyleSheet, Dimensions, TextInput } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withRepeat } from "react-native-reanimated";
import { CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";

import Colors from "../../colors/colors";
import Button from "../Button";
import { Context } from "../../store/Context";

export default function ScanningIndicator({ text, connectHandler, callerId }) {
    const windowWidth = Dimensions.get("window").width;
    const windowHeight = Dimensions.get("window").height;
    const SIZE = useSharedValue(Math.min(windowWidth, windowHeight) * 0.65);
    const SHADOWRADIUS = useSharedValue(0);

    const { isSender, isReceiver, qrCodeText, setQrCodeText, isUserConnected, 
            localMicOn, setLocalMicOn, isUserWantConnection, setIsUserWantConnection,
     } = useContext(Context);
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [url, setUrl] = useState(callerId);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    useLayoutEffect(() => {
        SHADOWRADIUS.value = SIZE.value * 0.01;
    }, []);

    useEffect(() => {
        SIZE.value = withRepeat(withSpring(SIZE.value * 0.9), -1, true);
        SHADOWRADIUS.value = withRepeat(withSpring(SIZE.value * 0.10), -1, true);
    }, []);

    function connectBtnPressHandler() {
        setConnecting(!connecting ? true : false);
        if(connecting)
            connectHandler();
    }

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: SIZE.value,
            height: SIZE.value,
            position: "absolute",
            borderRadius: 20,
            borderColor: Colors.buttonText,
            borderWidth: 4,
            shadowRadius: SHADOWRADIUS.value,
            shadowOpacity: 0.8,
            shadowOffset: { width: 0, height: 0 }
        };
    });

    console.debug(isUserConnected)

    if(!isUserConnected)
        return (
            <View style={styles.rootContainer}>
                <View style={styles.cameraContainer}>
                    {(permission?.granted) &&
                        (isReceiver ? 
                        <CameraView
                            facing="back"
                            style={styles.qrCameraView}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"]
                            }}
                            onBarcodeScanned={scanned ? undefined : ({ type, data }) => {
                                if(!scanned) {
                                    setQrCodeText(data);
                                    setScanned(true);
                                }
                            }}
                        /> :
                        <View style={styles.qrcodeImage}>
                            <QRCode value={url} size={250} quietZone={20} />
                        </View>
                    )}
                    {(isReceiver) &&
                        (<Animated.View style={animatedStyle} />)}
                </View>

                <View style={styles.secondaryText}>
                    {(scanned || qrCodeText) ?
                        <View style = {styles.buttonContainer}>
                        <Button 
                            MarginTop={"10%"} 
                            Width={"45%"}
                            Color={Colors.backgroundColor}
                            onPressHandler={() => {
                                setScanned(false);
                                setQrCodeText("");
                            }}
                            >
                                Scan Again
                        </Button>
                        <Button 
                            MarginTop={"10%"} 
                            Width={"45%"}
                            Color={Colors.backgroundColor}
                            onPressHandler={connectBtnPressHandler}
                            >
                                {connecting? "Connecting..." : "Connect"}
                        </Button>
                        </View>
                        :
                        <Text style={styles.textStyle}>{isReceiver? 
                            text : "Scan the QR Code on another device"}
                        </Text> 
                    }
                </View>

                {isReceiver ? 
                    <View style={styles.qrCodeView}>
                        <TextInput
                            style={styles.qrCodeText}
                            value={qrCodeText}
                            onChangeText={(t) => {
                                setQrCodeText(t);
                            }}
                        />
                    </View>
                    : null  
                }
            </View>
        );
    else if(isUserConnected) 
        return (
            <View style={styles.rootContainer}>
                <Text style={styles.textStyle}>{text}</Text>
                {/* <View style={styles.callButtonsContainer}> */}
                    <Button>{(localMicOn ? "Mute" : "Unmute")}</Button>
                {/* </View> */}
            </View>
        );
}

const styles = StyleSheet.create({
    rootContainer: {
        marginVertical: "5%",
        width: "80%",
        height: "65%",
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
    buttonContainer: {
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center", 
        width: "100%"
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
        fontSize: 20
    }, 
    qrcodeImage: {
        flexDirection: "column", 
        justifyContent: "center", 
        alignItems: "center", 
        borderRadius: 20,  
        overflow: "hidden", 
    }
});
