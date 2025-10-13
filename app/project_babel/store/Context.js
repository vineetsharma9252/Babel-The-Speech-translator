import { useEffect, createContext, useState, use } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const Context = createContext();

export function ContextProvider({ children }) {
    const [isLoaded, error] = useFonts({
    "Boldonse-Regular": require("../assets/fonts/Boldonse-Regular.ttf"),
    });
    const [isFirstVisit, setIsFirstVisited] = useState(null);
    const [isReceiver, setIsReceiver] = useState(false);
    const [isSender, setIsSender] = useState(false);
    const [isUserWantConnection, setIsUserWantConnection] = useState(false);
    const [isUserConnected, setIsUserConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);

    const [qrCodeText, setQrCodeText] = useState("");
    const [localMicOn, setLocalMicOn] = useState(true);

    // TODO
    // note => any-where in the code set the isFirstVisit context only when the user 
    // has succefully recorded their voice

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
            {    isFirstVisit, setIsFirstVisited, isSender, setIsSender, isReceiver, setIsReceiver,
                 isUserWantConnection, setIsUserWantConnection, isUserConnected, setIsUserConnected, 
                 qrCodeText, setQrCodeText, localMicOn, setLocalMicOn, 
                 connecting, setConnecting
            }
            }>
            {children}
        </Context.Provider>
    );
}