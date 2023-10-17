// actions.js

export const setFlashMessage = (message) => {
    return {
      type: 'SET_FLASH_MESSAGE',
      payload: message,
    };
  };
  