import { StyleSheet, Text, View } from "react-native";
import { useContext, useEffect, useState } from "react";

import Colors from "../../colors/colors";
import { Context } from "../../store/Context";
import ScanningIndicator from "./ScanningIndicator";
import DeviceCardList from "./DeviceCardList";

export default function Conn() {
    const { isSender, setIsSender, isReceiver, setIsReceiver, isUserWantConnection } = useContext(Context);
    const [headerText, setHeaderText] = useState("Start the App by pressing one of the buttons below.");

    useEffect(() => {
        if(!isUserWantConnection) {
            setHeaderText("Start the App by pressing one of the buttons below.");
            return;
        }
        setHeaderText(isSender? "You are the sender" : "You are the receiver");
    }, [isSender, isUserWantConnection]);

    useEffect(() => {

        if(isUserWantConnection) {
            // start scan for the nearby devices
        }

    }, [isUserWantConnection]);

    function devicePressHandler() {
        
    }

    return (
    <>
    <View style={styles.upperContainer}>
        <Text style={styles.headerText}>{ headerText }</Text>
        {isUserWantConnection? <ScanningIndicator text={"Scanning..."} /> : null}
        {/* {isUserWantConnection? 
            <DeviceCardList />: null
        } */}
    </View>
    </>
    );
}

const styles = StyleSheet.create({
    upperContainer: {
        marginTop: "10%", 
        flex: 1, 
        margin: '8%', 
        backgroundColor: Colors.cardPrimary,  
        width: '70%', 
        height: "100%", 
        borderRadius: 20, 
        alignItems: "center",
        justifyContent: "flex-start" 
    }, 
    headerText: {
        color: Colors.buttonText,
        fontFamily: "Boldonse-Regular",
        fontSize: 24,  
        textAlign: "center", 
        padding: "5%"
    }, 
    scrollContainer: {
        width: "100%", 
        height: "70%"
    }
});