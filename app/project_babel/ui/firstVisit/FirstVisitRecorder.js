import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ExpoSpeechRecognitionModule, getDefaultRecognitionService, getSpeechRecognitionServices } from "expo-speech-recognition";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

import { ButtonsContext } from "../../store/ButtonsContext";
import Colors from "../../colors/colors";
import DividerWithText from "../DividerWithText";
import Button from "../Button";
import { Context } from "../../store/Context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FirstVisitRecorder() {
    const { isFirstRecordingOn } = useContext(ButtonsContext);
    const { setIsFirstVisited } = useContext(Context);

    const [results, setResults] = useState([]);
    const { finalizeRecording, setFinalizeRecording } = useContext(ButtonsContext);
    const [wordsArray, setWordsArray] = useState([]);
    const [transcriptionText, setTranscriptionText] = useState("");
    let isPickedFile = useRef(false);
    let prevWordIndex = useRef(0);
    let initialWord = useRef(""), lastWord = useRef("");
    
    // Note: Change these words according to the text in the UI
    const initialWordCheck = "Inspired", lastWordCheck = "everyone.";
    const firstVisitRecordingFilename = "first_visit_recording.wav";

    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    useEffect(() => {
        console.log("Mounting Voice Listeners & isFirstRecordingOn: ", isFirstRecordingOn);
        ExpoSpeechRecognitionModule.addListener("error", onSpeechError);
        ExpoSpeechRecognitionModule.addListener("result", onSpeechResults);

        if(!isFirstRecordingOn && finalizeRecording) {
            return () => {
                ExpoSpeechRecognitionModule.removeListener("error", onSpeechError);
                ExpoSpeechRecognitionModule.removeListener("result", onSpeechResults);
            };
        }
    }, [isFirstRecordingOn, finalizeRecording]);

    const onSpeechError = (error) => {
            console.log("Error during speech recognition: ", error);
    };

    const onSpeechResults = (result) => {
        console.log("Speech results: ", result);

        let transcript = "";

        if(result?.value?.[0] && typeof result.value[0] === "string")
            transcript = result.value[0];
        else if(result?.results?.[0].transcript) 
            transcript = result.results[0].transcript;

        setResults(results => [...results, transcript]);

        if(transcript) {
            let wordsInTranscript = transcript.toLowerCase().split(" ");
            
            if(initialWord.current === "") {
                initialWord.current = wordsInTranscript[0];
                if(initialWord.current === initialWordCheck.toLowerCase()) {
                    setWordsArray(wordsArray => [...wordsArray, initialWord.current]);
                }
            } else if(initialWord.current !== "" && wordsArray.length === 1 && lastWord.current === "") {
                lastWord.current = wordsInTranscript[wordsInTranscript.some(word => word.replace(".", "") === lastWordCheck.toLowerCase())];
                if(lastWord.current === lastWordCheck.toLowerCase()) {
                    setWordsArray(wordsArray => [...wordsArray, lastWord.current]);
                }
            }
        }
    };
        

    const startSpeechToText = () => {
        try {
            ExpoSpeechRecognitionModule.start({ 
                lang: "en-US", 
                continuous: true, 
                interimResults: true,
                iosTaskHint: "unspecified", // "unspecified" | "dictation" | "search" | "confirmation"
                iosCategory: {
                    category: "playAndRecord",
                    categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
                    mode: "measurement",
                },
                androidRecognitionServicePackage: getDefaultRecognitionService()["packageName"], 
                requiresOnDeviceRecognition: false, 
                recordingOptions: {
                    persist: finalizeRecording? true : false, 
                    // set using expo-file-system for persisting the recorded audio
                    outputDirectory: FileSystem.documentDirectory, 
                    outputFileName: firstVisitRecordingFilename
                }, 
                //     uri: "E://Nitin-Programming-Btech/Extras/Project_Babel/app/project_babel/assets/speeches/test.wav"
                // }, 
                EXTRA_LANGUAGE_MODEL: "web_search"
             });
            console.log("Started Listening");
        } catch(e) {
            console.log("Start Error", e);
        }
    };

    const stopSpeechToText = () => {
        try {
            ExpoSpeechRecognitionModule.stop();
            console.log("Stopped Listening");
        } catch(e) {
            console.log("Stop Error", e);
        } finally {
            // ExpoSpeechRecognitionModule.abort();
        }
    }

    useEffect(() => {
        if(isFirstRecordingOn === true) {
            startSpeechToText();
        }
        else if(isFirstRecordingOn === false) {
            stopSpeechToText();
        }
    }, [isFirstRecordingOn]);

    useEffect(() => {
        async function finalizer() {
            if(finalizeRecording === true) {
                stopSpeechToText();
                if(finalizeRecording === true) {
                    await AsyncStorage.setItem("userVisited", "true");
                }

                await delay(2000);
                if(isPickedFile.current === true)
                    return;
                if(wordsArray.length === 2) {
                    Alert.alert("Recording Successful", "Thank you for your valuable voice sample! You may proceed further.", [{text: "OK"}]);
                } else {
                    Alert.alert("Recording Incomplete", "It seems you missed saying some part of the text. Please try again.", [{text: "OK"}]);
                    setFinalizeRecording(false);
                }
            }
        }
        finalizer();
    }, [finalizeRecording]);

    useEffect(() => {
        const onEnd = () => {
            if(isFirstRecordingOn && !finalizeRecording) {
                startSpeechToText();
            }
        };

        ExpoSpeechRecognitionModule.addListener("end", onEnd);
        return () => {
            ExpoSpeechRecognitionModule.removeListener("end", onEnd);
        };
    }, [isFirstRecordingOn, finalizeRecording]);

    useEffect(() => {
        if(isFirstRecordingOn === true) {
            setTranscriptionText("");
            setResults([]);
            setWordsArray([]);
            initialWord.current = "";
            lastWord.current = "";
            prevWordIndex.current = 0;
            isPickedFile.current = false;
            setFinalizeRecording(false);
        }
        if(prevWordIndex % 10 == 0)
            setResults([]);

    }, [isFirstRecordingOn, prevWordIndex]);
    
    useEffect(() => {
        let content = "";
        let count = prevWordIndex.current % 10;

        if(results && results.length == 0) {
            content = isFirstRecordingOn? '"Listening..."' : '"Start Recording ?"';
        } else if(results && results.length > 0) { 
            results.forEach(element => {
                count++;
                prevWordIndex.current = prevWordIndex.current + 1;
                if(count >= 10) 
                    content = "";
                content = '"' + content + element + '"';
            });
        }
        setTranscriptionText(content);
    }, [results, isFirstRecordingOn, prevWordIndex]);


    async function onPickFirstVisitRecording() {
        try {
            const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: "audio/*" });
            if(result.canceled)
                Alert.alert("Canceled", "You canceled the operation, please try again.", [{ type: "OK" }]);
            else if(!result.assets[0].uri.endsWith(".wav")) {
                Alert.alert("Not Supported", "Only wav audio files are supported currently !", [{ type: "OK" }]);
                return;
            }
            else if(!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const pickedFile = new FileSystem.File(asset);
                const destinationFile = new FileSystem.File(new FileSystem.Directory(FileSystem.Paths.document), firstVisitRecordingFilename);
                
                if(!destinationFile.exists) {
                    pickedFile.copy(destinationFile);
                    Alert.alert("File Successfully Copied", "You may proceed further.", [{ text: "OK" }]);
                    isPickedFile.current = true;
                    setFinalizeRecording(true);
                    
                    if(finalizeRecording === true) {
                        await AsyncStorage.setItem("userVisited", "true");
                    }
                    
                    await delay(3000);
                    setIsFirstVisited(false);
                }
                else
                    Alert.alert("File Already Exists", "Not_Implemented_Error: clear app storage to load another file", [{ text: "OK" }]);
            }
        } catch(error) {
            console.error("Error onPickFirstVisitRecording: ", error);
        }
    }

    return (
    <>
    <View style = {styles.upperContainer}>
        <Text style = {styles.recorderHeading}>We want your voice for 10 seconds</Text>
        {isFirstRecordingOn?
            (<ScrollView contentContainerStyle={styles.recordingTextView}>
                <Text style = {styles.recordingText}>
                { transcriptionText }
                </Text>
            </ScrollView>) : 
            <Text style={styles.recordingText}>"Start Recording ?"</Text>
        }

        <View style = {styles.speakUpRootContainer}>
            <Text style={styles.speakFooterHeading}>🔽🔽 Speak this up 🔽🔽</Text>
            <View>
                <Text style={styles.testingText}>Inspired by the story of Babel, this project aims to unite voices across the world. My voice sample will help build a future of clearer communication for everyone.</Text>
            </View>
            <DividerWithText text="OR (wav format)"/>
            <Button Width="89%" FontSize={12} onPressHandler={onPickFirstVisitRecording}>Pick Up Voice Sample</Button>
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
        justifyContent: "space-between" 
    }, 
    recorderHeading: {
        marginTop: "10%", 
        fontFamily: "Boldonse-Regular", 
        color: "white"
    }, 
    recordingTextView: {
        justifyContent: "center", 
        alignItems: "center", 
        height: "50%", 
        padding: "5%"
    },
    recordingText: {
        fontFamily: "Boldonse-Regular",
        fontSize: 24, 
        color: Colors.buttonText, 
        justifyContent: "center", 
        alignItems: "center", 
        padding: "5%"
    }, 
    speakUpRootContainer: {
        backgroundColor: Colors.backgroundWhite, 
        alignItems: "center", 
        margin: "5%", 
        padding: "2%",
        borderRadius: 10 
    }, 
    speakFooterHeading: {
        textAlign: "center", 
        fontFamily: "Boldonse-Regular", 
        backgroundColor: Colors.cardPrimary, 
        borderRadius: 10, 
        marginBottom: "2%",
        paddingHorizontal: "18%"
    }, 
    testingText: {
        textAlign: "center"
    }
});