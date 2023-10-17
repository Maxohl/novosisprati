import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Condicionada.css';

import { useDispatch, useSelector } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';

function Condicionada(props) {
  const { serverPort } = props;
  const [condicionadaData, setCondicionadaData] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
  const flashMessageType = useSelector((state) => state.flashMessage.flashMessageType);

  useEffect(() => {
    const flashTimeout = setTimeout(() => {
      dispatch(setFlashMessage('', ''));
    }, 3000);
    const fetchCondicionadaData = async () => {
      try {
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

        const response = await axios.get(`${serverPort}/condicionada`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'IDCookie': IDCookie,
          },
        });
        const { data } = response;
        setCondicionadaData(data);
      } catch (error) {
        console.error('Error fetching condicionada data:', error);
      }
      return () => clearTimeout(flashTimeout);
    };

    fetchCondicionadaData();
  }, [serverPort, navigate, dispatch]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${year}`;
  };

  const handleAddButtonClick = () => {
    navigate('/condicionada/new');
  };

  const handleItemClick = (row) => {
    const selectedCondicionada = condicionadaData.find(item => item.ID === row.ID);
    navigate(`/condicionada/${row.ID}`, { state: { condicionadaData: selectedCondicionada } });
  }
  

  return (
    <div className="Condicionadacontainer">
      <h1 className="Condicionadatitle">Requisições Condicionadas</h1>
      {flashMessage && (
        <div className={`flash-message ${flashMessageType === 'success' ? 'success' : 'error'}`}>
          {flashMessage}
        </div>
      )}
      <button className="AddButton" onClick={handleAddButtonClick}>
        Adicionar Requisição Condicionada
      </button>
      <ul className="Condicionadalist">
        {condicionadaData.map((row) => (
          <li
            key={row.ID}
            className="CondicionadalistItem"
            onClick={() => handleItemClick(row)}
          >
            <div className="CondicionadaRow">
              <span className="CondicionadaNavioMain">{row.NavioMain}</span>
              <span className="CondicionadaDash">condicionado ao</span>
              <span className="CondicionadaNavioSub">{row.NavioSub}</span>
            </div>
            <div className="CondicionadaDate">{formatDate(row.Data)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Condicionada;
