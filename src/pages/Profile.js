import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AiOutlineSave } from 'react-icons/ai';
import { useDispatch, useSelector } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';
import './Profile.css';

const ProfilePage = ({ serverPort }) => {
  const navigate = useNavigate();
  const [nomeAgencia, setNomeAgencia] = useState('');
  const [emailAgencia, setEmailAgencia] = useState('');
  const [requisicoesCount, setRequisicoesCount] = useState(0);
  const [naviosCount, setNaviosCount] = useState(0);
  const [requisicoesCountLast30Days, setRequisicoesCountLast30Days] = useState(0);
  const inputRef = useRef(null);
  const dispatch = useDispatch();

  const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
  const flashMessageType = useSelector((state) => state.flashMessage.flashMessageType);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get the IDCookie and token
        const authStateCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('_auth_state'));
        if (!authStateCookie) {
          navigate('/login');
          return;
        }
  
        const IDCookie = document.cookie
          .split(';')
          .find((row) => row.startsWith('_auth'))
          .split('=')[1];
  
        const token = authStateCookie.split('=')[1];
  
        // Fetch the profile data
        const profileResponse = await axios.get(`${serverPort}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            IDCookie: IDCookie,
          },
        });
        const profileData = profileResponse.data;
        setNomeAgencia(profileData.nomeAgencia);
        setEmailAgencia(profileData.emailAgencia);
  
        // Set the requisicoes and navios data directly from the profileData object
        const requisicoesData = profileData.requisicoes;
        setRequisicoesCount(requisicoesData.length);
  
        const naviosData = profileData.navios;
        setNaviosCount(naviosData.length);
  
        // Calculate the count of requisicoes in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const requisicoesCountLast30Days = requisicoesData.filter((requisicao) => {
          const requisicaoDate = new Date(requisicao.Data_requi);
          return requisicaoDate > thirtyDaysAgo;
        }).length;
        setRequisicoesCountLast30Days(requisicoesCountLast30Days);
      } catch (error) {
        console.log('Error fetching data:', error);
      }
    };
  
    fetchData();
  }, [serverPort]);
  

  const handleSaveButtonClick = async () => {
    try {
      // Get the IDCookie and token
      const authStateCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('_auth_state'));
      if (!authStateCookie) {
        navigate('/login');
        return;
      }
  
      const IDCookie = document.cookie
        .split(';')
        .find((row) => row.startsWith('_auth'))
        .split('=')[1];
  
      const token = authStateCookie.split('=')[1];
  
      // Send the updated email value to the backend
      const response = await axios.put(
        `${serverPort}/profile`,
        { IDCookie, email: emailAgencia },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (response.data.message === 'success') {
        dispatch(setFlashMessage({ message: 'E-mail Atualizado.', messageType: 'success' }));
        const flashTimeout = setTimeout(() => {
          dispatch(setFlashMessage('',''));
        }, 3000);
      } else {
        // Handle error case if the response does not contain the expected success message
        console.log('Email update failed');
      }
    } catch (error) {
      console.log('Error updating email:', error);
    }
  };
  
  

  return (
    <div className="profile-page">
      <h2>Perfil</h2>
      <h3>{nomeAgencia}</h3>
      {flashMessage && (
        <div className={`flash-message ${flashMessageType === 'success' ? 'success' : 'error'}`}>
          {flashMessage}
        </div>
      )}
      <div className="profile-content">
        <div className="profile-info">
          <p><b>Total de Requisições:</b> {requisicoesCount}</p>
          <p><b>Total de Navios Registrados:</b> {naviosCount}</p>
          <p><b>Nº de Requisições nos últimos 30 dias:</b> {requisicoesCountLast30Days}</p>
        </div>
        <div className="profile-form">
          <label className="profile-label">E-mail:</label>
          <div className="profile-field">
            <input
              type="text"
              value={emailAgencia}
              onChange={(e) => setEmailAgencia(e.target.value)}
              ref={inputRef}
            />
            <button className="profile-save-button" onClick={handleSaveButtonClick}>
              <AiOutlineSave />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
