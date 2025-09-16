import { useEffect, createContext, useState } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const Context = createContext();

export function ContextProvider({ children }) {
    const [isLoaded, error] = useFonts({
    "Boldonse-Regular": require("../assets/fonts/Boldonse-Regular.ttf"),
    });
    const [isFirstVisit, setIsFirstVisited] = useState(null);
    // TODO
    // note => any-where in the code set the isFirstVisit context only when the user 
    // has succefully recorded their voice

    useEffect(() => {
    async function checkFirstVisit() {
        try {
            AsyncStorage.clear();
            const userVisited = await AsyncStorage.getItem("userVisited");
            if (userVisited === null) {
                await AsyncStorage.setItem("userVisited", "true");
                setIsFirstVisited(true);
            } else {
                // TODO
                // this must be set only when the user voice was successfully 
                // added in persistent storage
                setIsFirstVisited(false);
            }
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
        <Context.Provider value = {{ isFirstVisit }}>
            {children}
        </Context.Provider>
    );
}