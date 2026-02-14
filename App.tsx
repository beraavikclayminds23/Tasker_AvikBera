import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TaskRealmContext } from './src/services/realm';

const { RealmProvider } = TaskRealmContext;

const App = () => {
  return (
    <Provider store={store}>
      <RealmProvider>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </RealmProvider>
    </Provider>
  );
};

export default App;
