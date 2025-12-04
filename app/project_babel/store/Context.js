import { useEffect, createContext, useState, use, useRef } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const Context = createContext();

export function ContextProvider({ children }) {
    const [isLoaded, error] = useFonts({
    "Boldonse-Regular": require("../assets/fonts/Boldonse-Regular.ttf"),
    });

    const [connectionState, setConnectionState] = useState("initial");
    const [isFirstVisit, setIsFirstVisited] = useState(null);
    const [qrCodeText, setQrCodeText] = useState("");
    // const [localMicOn, setLocalMicOn] = useState(false);
    const selectedLanguage = useRef("en");


    useEffect(() => {
    async function checkFirstVisit() {
        try {
            // AsyncStorage.clear();
            const userVisited = await AsyncStorage.getItem("userVisited");
            console.log(userVisited)
            if(userVisited === "true")
                setIsFirstVisited(false);
            else if(userVisited === null || userVisited === "false")
                setIsFirstVisited(true);
        } catch (error) {
            console.log("Error Encountered", error);
        }
    }
    checkFirstVisit();
    }, []);

    useEffect(() => {
    console.log("First Visit? => ", isFirstVisit);
    }, [isFirstVisit]);

    useEffect(() => {
    if (isLoaded && isFirstVisit !== null) {
        SplashScreen.hide();
    }
    }, [isLoaded, isFirstVisit]);

    if (!isLoaded || isFirstVisit === null) return null;

    return (
        <Context.Provider value = {
            { connectionState, setConnectionState, isFirstVisit, setIsFirstVisited, 
            qrCodeText, qrCodeText, setQrCodeText, selectedLanguage }
            }>
            {children}
        </Context.Provider>
    );
}