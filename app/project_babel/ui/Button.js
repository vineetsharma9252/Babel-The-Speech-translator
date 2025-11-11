import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "../colors/colors";

export default function Button({ children, onPressHandler, MarginTop, Width, Color, FontSize, isDisabled }) {

    function buttonPressHandler() {
        onPressHandler();
    }

    return (
        <TouchableOpacity style={[
            styles.buttonContainer, { width: Width? Width : "30%" }, 
            { marginTop: MarginTop? MarginTop : "0%" }, 
            { backgroundColor: Color? Color : Colors.cardPrimary }
        ]}
         disabled={isDisabled}
         onPress={ buttonPressHandler }>
        <View >
            <Text style={[styles.buttonText, { fontSize: FontSize? FontSize : 16 }]}>{children}</Text>
        </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    buttonContainer: { 
        height: 50, 
        backgroundColor: Colors.cardPrimary, 
        margin: "2%", 
        padding: "2%", 
        marginHorizontal: "2%",
        justifyContent: "center", 
        alignItems: "center", 
        borderRadius: 10
    }, 
    buttonText: {
        fontFamily: "Boldonse-Regular", 
        color: Colors.buttonText
    }
});