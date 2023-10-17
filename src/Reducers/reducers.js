// reducers.js

import { combineReducers } from 'redux';
import { flashMessageReducer } from './flashMessageReducer';

const rootReducer = combineReducers({
  flashMessage: flashMessageReducer,
  // Add other reducers here if needed
});

export default rootReducer;

  