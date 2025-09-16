import { StyleSheet, View } from "react-native";
import Button from "../Button";
import { useContext } from "react";
import { ButtonsContext } from "../../store/ButtonsContext";

export default function FirstVisitButtons({ buttonFunction }) {
    const { isFirstRecordingOn } = useContext(ButtonsContext);

    function nativeButtonPressHandler() {
        buttonFunction();
    }

    return (
        <View style={styles.buttonContainer}>
            <Button onPressHandler={nativeButtonPressHandler}>
                {isFirstRecordingOn? "Stop" : "Record"}
            </Button>
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