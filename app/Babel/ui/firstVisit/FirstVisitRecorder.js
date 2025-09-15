import { Alert, StyleSheet, Text, View } from "react-native";
import { useContext, useEffect, useState } from "react";
import { Permissions } from "expo";
import Voice from "@react-native-voice/voice";

import Colors from "../../colors/colors";
import { ButtonsContext } from "../../store/ButtonsContext";

export default function FirstVisitRecorder() {
    useEffect(() => {
        async function componentDidMount() {
        const { status, expires, permissions } = await Permissions.askAsync(
            Permissions.AUDIO_RECORDING
        );
        
        if (status !== "granted") {
            Alert.alert("Some Permissions is not Allowed !");
        }}
        componentDidMount();
    }, []);

    const { isFirstRecordingOn } = useContext(ButtonsContext);
    const [results, setResults] = useState([]);

    useEffect(() => {
        Voice.onSpeechError = onSpeechError;
        Voice.onSpeechResults = onSpeechResults;
    }, []);

    const onSpeechError = (error) => {
        console.log("Error during speech recognition: ", error);
    }
    const onSpeechResults = (result) => {
        setResults(result.value);
        console.log("Speech results: ", result.value);
    }

    const startSpeechToText = async () => {
        await Voice.start("en-US");
        console.log("Started Listening");
    };

    const stopSpeechToText = async () => {
        await Voice.stop();
        console.log("Stopped Listening");
    }

    useEffect(() => {
        if(isFirstRecordingOn) {
            startSpeechToText();
        }
    }, [isFirstRecordingOn]);
    useEffect(() => {
        if(!isFirstRecordingOn) {
            stopSpeechToText();
        }
    }, [isFirstRecordingOn]);

    return (
    <>
    <View style = {styles.upperContainer}>
        <Text style = {styles.recorderHeading}>We want your voice for 10 seconds</Text>
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
    recorderHeading: {
        marginTop: "10%", 
        fontFamily: "Boldonse-Regular", 
        color: "white"
    }
});