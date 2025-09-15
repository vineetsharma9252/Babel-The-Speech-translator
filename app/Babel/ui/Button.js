import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "../colors/colors";

export default function Button({ children, onPressHandler }) {
    function buttonPressHandler() {
        onPressHandler();
    }

    return (
        <TouchableOpacity style={styles.buttonContainer}
         onPress={ buttonPressHandler }>
        <View >
            <Text style={styles.buttonText}>{children}</Text>
        </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        width: "30%", 
        height: 50, 
        backgroundColor: Colors.cardPrimary, 
        margin: "2%", 
        marginHorizontal: "5%",
        justifyContent: "center", 
        alignItems: "center", 
        borderRadius: 10
    }, 
    buttonText: {
        fontFamily: "Boldonse-Regular", 
        color: Colors.buttonText
    }
});