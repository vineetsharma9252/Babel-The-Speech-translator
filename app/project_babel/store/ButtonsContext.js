import { createContext, useState} from "react";

export const ButtonsContext = createContext();

export default function ButtonsContextProvider({ children }) {
    const [isFirstRecordingOn, setIsFirstRecordingOn] = useState(false);
    const [finalizeRecording, setFinalizeRecording] = useState(false);

    return (
        <ButtonsContext.Provider value={{ isFirstRecordingOn, finalizeRecording, setIsFirstRecordingOn, setFinalizeRecording }}>
            {children}
        </ButtonsContext.Provider>
    );
}