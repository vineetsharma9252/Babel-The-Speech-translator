import { StyleSheet, View } from "react-native";
import Button from "../Button";

export default function ConnectionButtons() {
    function nativeButtonPressHandler() {
        console.log("Hi");
    }
    function foreignButtonPressHandler() {
        console.log("Hi");
    }

    return (
        <View style={styles.buttonContainer}>
            <Button onPressHandler={nativeButtonPressHandler}>Native</Button>
            <Button onPressHandler={foreignButtonPressHandler}>Foreign</Button>
        </View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        marginBottom: "5%",
        flexDirection: "row", 
        justifyContent: "space-around", 
        alignItems: "center"
    }
});