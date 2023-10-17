// flashMessageReducer.js

const initialState = {
  flashMessage: '',
  flashMessageType: '',
};

export const flashMessageReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_FLASH_MESSAGE':
      return {
        ...state,
        flashMessage: action.payload.message,
        flashMessageType: action.payload.messageType,
      };
    default:
      return state;
  }
};
