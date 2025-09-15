import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import Colors from './colors/colors';
import MainScreen from './ui/mainScreen/MainScreen';
import { ContextProvider } from './store/Context';

export default function App() {

  return (
    <ContextProvider>
      <View style={styles.container}>
        <MainScreen />
        <StatusBar style="inverted" />
      </View>
    </ContextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    padding: "8%"
  },
});
