import { Alert, AppState, PermissionsAndroid, Platform } from "react-native";
import { use, useContext, useEffect, useLayoutEffect, useState } from "react";
import InCallManager from 'react-native-incall-manager';

import Conn from "./Conn";
import ConnectionButtons from "./ConnectionButtons"; 
import ConnectionContextProvider from "../../store/ConnectionContext";

export default function ConnectionScreen() {

    return(
    <>
        <ConnectionContextProvider>
            <Conn />
            <ConnectionButtons />
        </ConnectionContextProvider>
    </>   
    );
}