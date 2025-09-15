import FirstVisitRecorder from "./FirstVisitRecorder";
import FirstVisitButtons from "./FirstVisitButtons";
import ButtonsContextProvider from "../../store/ButtonsContext";
import { useContext } from "react";

export default function FirstVisitRecorderScreen() {
    const { isFirstRecordingOn, setIsFirstRecordingOn } = useContext(ButtonsContext);
    function firstVisitRecordButtonFunction() {
        isFirstRecordingOn? setIsFirstRecordingOn(false) : setIsFirstRecordingOn(true);
    }

    return (
        <ButtonsContextProvider>
            <FirstVisitRecorder />
            <FirstVisitButtons buttonFunction={firstVisitRecordButtonFunction}/>
        </ButtonsContextProvider>
    );
}