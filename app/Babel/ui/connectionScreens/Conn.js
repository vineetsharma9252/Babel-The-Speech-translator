import { StyleSheet, Text, View } from "react-native";
import Colors from "../../colors/colors";

export default function Conn() {
    return (
    <>
    <View style = {styles.upperContainer}>
        <Text>Hi</Text>
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