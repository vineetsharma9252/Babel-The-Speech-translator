import { Alert, PermissionsAndroid, Platform } from "react-native";
import { useLayoutEffect } from "react";

import Conn from "./Conn";
import ConnectionButtons from "./ConnectionButtons"; 

export default function ConnectionScreen() {

    return(
    <>
        <Conn />
        <ConnectionButtons />
    </>   
    );
}