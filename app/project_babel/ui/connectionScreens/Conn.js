import { StyleSheet, Text, View } from "react-native";
import Colors from "../../colors/colors";
import { useContext } from "react";

import { Context } from "../../store/Context";

export default function Conn() {
    const { isSender, setIsSender, isReceiver, setIsReceiver } = useContext(Context);

    return (
    <>
    <View style = {styles.upperContainer}>
        
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
        justifyContent: "center" 
    }
});