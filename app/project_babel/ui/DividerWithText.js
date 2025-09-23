import { StyleSheet, Text, View } from "react-native";

export default function({ text }) {
    return (
        <View style={styles.rootContainer}>
            <View style={styles.line}></View>
            <View style={styles.textContainer}>
                <Text>{text}</Text>
            </View>
            <View style={styles.line}></View>
        </View>
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        flexDirection: "row", 
        justifyContent: "center", 
        alignItems: "center", 
        marginVertical: "2%", 
        padding: "2%"
    }, 
    line: {
        flex: 1, 
        backgroundColor: "black", 
        height: "5%"
    }, 
    textContainer: {
        marginHorizontal: "5%", 
    }, 
    text: {
        fontFamily: "Boldonse-Regular"
    }
});