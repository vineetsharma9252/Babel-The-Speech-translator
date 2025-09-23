import { ScrollView, StyleSheet, Text, View } from "react-native";
import Colors from "../../colors/colors";
import { useContext, useEffect, useState } from "react";

import { Context } from "../../store/Context";

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

    return (
    <>
    <View style={styles.upperContainer}>
        <Text style={styles.headerText}>{ headerText }</Text>
        <ScrollView style={styles.scrollContainer}>
            
        </ScrollView>
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
        textAlign: "center", 
        padding: "5%"
    }, 
    scrollContainer: {
        width: "100%", 
        height: "70%"
    }
});