// store.js
import { configureStore } from '@reduxjs/toolkit';
import { flashMessageReducer } from './flashMessageReducer';

const store = configureStore({
  reducer: {
    flashMessage: flashMessageReducer,
  },
});

export default store;

