import { StyleSheet, View } from "react-native";
import { useContext } from "react";

import { Context } from "../../store/Context";
import FirstVisitRecorderScreen from "../firstVisit/FirstVisitRecorderScreen";
import ConnectionScreen from "../connectionScreens/ConnectionScreen";

export default function MainScreen() {
    const { isFirstVisit } = useContext(Context);

    return (
        <View style = {styles.rootContainer}>
            {isFirstVisit? 
                <FirstVisitRecorderScreen /> : <ConnectionScreen />
            }
        </View>
        );
}

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,  
        flexDirection: "column", 
        justifyContent: "center", 
        alignItems: "center", 
        width: "150%", 
        height: "100%"
    }
});