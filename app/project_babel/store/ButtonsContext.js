import { createContext, useState} from "react";

export const ButtonsContext = createContext();

export default function ButtonsContextProvider({ children }) {
    const [isFirstRecordingOn, setIsFirstRecordingOn] = useState(false);

    return (
        <ButtonsContext.Provider value={{ isFirstRecordingOn, setIsFirstRecordingOn }}>
            {children}
        </ButtonsContext.Provider>
    );
}