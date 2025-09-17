import { useContext, useEffect } from "react";
import Permissions from "expo";
import { Alert } from "react-native";

import FirstVisitRecorder from "./FirstVisitRecorder";
import FirstVisitButtons from "./FirstVisitButtons";
import { ButtonsContext } from "../../store/ButtonsContext";

export default function FirstVisitRecorderScreen() {
    const { isFirstRecordingOn, setIsFirstRecordingOn } = useContext(ButtonsContext);
    function firstVisitRecordButtonFunction() {
        isFirstRecordingOn? setIsFirstRecordingOn(false) : setIsFirstRecordingOn(true);
    }

    useEffect(() => {
        async function componentDidMount() {
        const { status, expires, permissions } = await Permissions.askAsync(
            Permissions.AUDIO_RECORDING
        );
        console.log(status, expires, permissions);
        if (status !== "granted") {
            Alert.alert("Some Permissions is not Allowed !");
        }}
        componentDidMount();
    }, []);

    return (<>
            <FirstVisitRecorder />
            <FirstVisitButtons buttonFunction={firstVisitRecordButtonFunction}/>
            </>
    );
}