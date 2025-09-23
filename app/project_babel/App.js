import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import Colors from './colors/colors';
import MainScreen from './ui/mainScreen/MainScreen';
import { ContextProvider } from './store/Context';
import ButtonsContextProvider from './store/ButtonsContext';

export default function App() {

  return (
    <ContextProvider>
      <View style={styles.container}>
        <ButtonsContextProvider>
        <MainScreen />
        </ButtonsContextProvider>
        <StatusBar style="auto" />
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


// for android add the following to ./android/app/build.gradle: 
// 1. run -> npx expo prebuild

// 2. 
// configurations.all {
//     exclude group: "com.android.support"
//     exclude module: "appcompat-v7"
//     exclude module: "support-v4"
// }
// 3. 
// run -> npx expo run:android