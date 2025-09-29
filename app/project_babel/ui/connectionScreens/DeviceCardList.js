import { useCallback, useContext, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View, Text } from "react-native";
import Colors from "../../colors/colors";
import { Context } from "../../store/Context";

export default function DeviceCardList({ peripherals, devicePressHandler }) {
    const { isUserConnected, setIsUserConnected } = useContext(Context);
    const [selectedDevice, setSelectedDevice] = useState(null);

    const listDevicePressHandler = useCallback(() => {
        devicePressHandler();
        setIsUserConnected(true);
    }, );

    const Item = ({item, backgroundColor }) => {
        return (
            <TouchableOpacity 
                style={[styles.touch, {backgroundColor: backgroundColor}]}
                onPress={() => listDevicePressHandler()}>
                    <Text>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const renderItem = useCallback(({item}) => {
        const cardColor = item.id === selectedDevice? Colors.backgroundColor: Colors.cardPrimary;

        return (
            <Item item={item} backgroundColor={cardColor} />
        );
    }, [selectedDevice]);

    return (
        <FlatList 
            data={["Hi", "Hello"]}
            keyExtractor={(item) => item}
            style={styles.deviceNameContainer}
            renderItem={renderItem}
         />
    );
}

const styles = StyleSheet.create({
    deviceNameContainer: {
        flex: 2, 
        flexDirection: "column", 
        // justifyContent: "center", 
        // alignItems: "center", 
        padding: "5%"
    }, 
    touch: {
        width: "100%", 
        height: "30%", 
        justifyContent: "center", 
        alignItems: "center", 
        padding: "10%", 

    }, 
    touchView: {
        flex: 1, 
        borderRadius: 10
    }, 
    touchText: {
        color: Colors.buttonText, 
        fontFamily: "Boldonse-Regular", 
        fontSize: 20
    }
});