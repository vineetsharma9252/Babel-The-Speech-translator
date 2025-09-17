import { Alert, StyleSheet, Text, View } from "react-native";
import { useContext, useEffect, useState } from "react";
import Voice from "@react-native-voice/voice";

import Colors from "../../colors/colors";
import { ButtonsContext } from "../../store/ButtonsContext";

export default function FirstVisitRecorder() {
    const { isFirstRecordingOn } = useContext(ButtonsContext);
    const [results, setResults] = useState([]);

    useEffect(() => {
        console.log("Mounting Voice Listeners");
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
        if(isFirstRecordingOn === true) {
            startSpeechToText();
        }
        else if(isFirstRecordingOn === false) {
            stopSpeechToText();
        }
    }, [isFirstRecordingOn]);

    return (
    <>
    <View style = {styles.upperContainer}>
        <Text style = {styles.recorderHeading}>We want your voice for 10 seconds</Text>
        <Text style = {styles.recordingText}>
           {results.length > 0 ? '""' + results[0] + '""' : '""'} 
        </Text>
        <View>
            <Text>Speak this up</Text>
            <View>
                <Text>Inspired by the story of Babel, this project aims to unite voices across the world. My voice sample will help build a future of clearer communication for everyone.</Text>
            </View>
        </View>
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
    }, 
    recordingText: {
        fontFamily: "Boldonse-Regular",
        fontSize: 24, 
        color: Colors.buttonText, 
        justifyContent: "center", 
        alignItems: "center"
    }, 
    speakUpRootContainer: {
        backgroundColor: Colors.backgroundWhite, 
        alignContent: "center", 
        justifyContent: "flex-end", 
        margin: "5%", 
        padding: "2%", 
    }
});