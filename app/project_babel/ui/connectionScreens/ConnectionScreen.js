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