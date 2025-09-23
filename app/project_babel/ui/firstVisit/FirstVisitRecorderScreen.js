import { useContext, useEffect } from "react";
import { Alert } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

import FirstVisitRecorder from "./FirstVisitRecorder";
import FirstVisitButtons from "./FirstVisitButtons";
import { ButtonsContext } from "../../store/ButtonsContext";

export default function FirstVisitRecorderScreen() {
    const { isFirstRecordingOn, finalizeRecording, setIsFirstRecordingOn } = useContext(ButtonsContext);

    function firstVisitRecordButtonFunction() {
        isFirstRecordingOn? setIsFirstRecordingOn(false) : setIsFirstRecordingOn(true);
    }

  useEffect(() => {
    ExpoSpeechRecognitionModule.getPermissionsAsync().then((permission) => {
      console.log("Status:", permission.status);
      console.log("Granted:", permission.granted);
      console.log("Restricted:", permission.restricted); 
      console.log("Can ask again:", permission.canAskAgain);
      console.log("Expires:", permission.expires);    
    if(!permission.granted) {
      ExpoSpeechRecognitionModule.requestPermissionsAsync().then((result) => {
        if(!result.granted) {
          Alert.alert("Permissions not granted !");
          return;
        }
        console.log("Status:", result.status);
      });
  }});
  }, []);

  useEffect(() => {
    if(finalizeRecording === true)
      setIsFirstRecordingOn(false);
  }, [finalizeRecording]);

  return (<>
          <FirstVisitRecorder />
          <FirstVisitButtons buttonFunction={firstVisitRecordButtonFunction}/>
          </>
  );
}