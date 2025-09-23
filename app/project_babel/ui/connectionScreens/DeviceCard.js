import { TouchableHighlight } from "react-native";

export default function DeviceCard({ deviceName }) {
    return (
        <TouchableHighlight>
            <Text>{deviceName}</Text>
        </TouchableHighlight>
    );
}

const styles = StyleSheet.create({
    
});