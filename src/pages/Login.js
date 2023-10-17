import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { useSignIn, useIsAuthenticated } from 'react-auth-kit';

import { useDispatch, useSelector } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';

const Login = ({ serverPort }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useSignIn();
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const dispatch = useDispatch();
  const localFlashMessage = useSelector((state) => state.flashMessage.flashMessage);

  const handleLogin = async () => {
    try {
      console.log(serverPort);
      const response = await axios.post(`${serverPort}/login`, {
        username: username,
        password: password,
      });
      const flash = response.data.success;
      dispatch(setFlashMessage({ message: flash, messageType: 'success' })); 
      signIn({
        token: response.data.token,
        expiresIn: 3600,
        tokenType: 'Bearer',
        authState: { username },
      });

      navigate('/');
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  if (isAuthenticated()) {
    return (
      <div className="logged-container">
        <h1 className="logged-Title">Você já está conectado.</h1>
      </div>
    );
  }

  return (
    <div className="login-container">
      {localFlashMessage && <div className="flash-message">{localFlashMessage}</div>}
      <h2 className="title">LOGIN</h2>
      <div className="input-container">
        <label className="label">Usuário:</label>
        <input
          type="text"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value.toUpperCase())}
        />
      </div>
      <div className="input-container">
        <label className="label">Senha:</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button className="button" onClick={handleLogin}>
        Entrar
      </button>
    </div>
  );
};

export default Login;
