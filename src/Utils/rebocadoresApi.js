// rebocadoresApi.js

import axios from 'axios';

export const fetchRebocadores = async (serverPort, navigate) => {
  try {
    const authStateCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('_auth_state'));
    if (!authStateCookie) {
      navigate('/login');
      return [];
    }

    const IDCookie = document.cookie
      .split(';')
      .find((row) => row.startsWith('_auth'))
      .split('=')[1];

    const token = authStateCookie.split('=')[1];

    const response = await axios.get(`${serverPort}/rebocador`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'IDCookie': IDCookie,
      },
    });

    const data = response.data;
    return data;
  } catch (error) {
    console.error('Error fetching Rebocadores:', error);
    return [];
  }
};
