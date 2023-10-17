import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Requisicoes.css';

import { useDispatch, useSelector } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';

function Requisicoes(props) {
  const { serverPort, navios } = props;
  const [requisicoes, setRequisicoes] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
  const flashMessageType = useSelector((state) => state.flashMessage.flashMessageType);

  const fetchRequisicoes = useCallback(async () => {
    const flashTimeout = setTimeout(() => {
      dispatch(setFlashMessage('', ''));
    }, 3000);
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

      const response = await axios.get(`${serverPort}/requisicoes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'IDCookie' : IDCookie,
        },
        params: {
          limit: 10,
        },
      });
      console.log('Response:', response);
      const { data } = response;
      console.log('Fetched requisicoes:', data);
      setRequisicoes(data);
    } catch (error) {
      console.error('Error fetching requisicoes:', error);
    }
    return () => clearTimeout(flashTimeout);
  }, [serverPort, navigate, dispatch]);

  useEffect(() => {
    fetchRequisicoes();
  }, [fetchRequisicoes]);

  const handleAddButtonClick = () => {
    navigate('/requisicoes/new');
  };

  function formatDate(date) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-GB', options);
  }

  const handleItemClick = (requisicao) => {
    const selectedRequisicao = requisicoes.find(item => item.ID === requisicao.ID);
    navigate(`/requisicoes/${requisicao.ID}`, { state: { requisicaoData: selectedRequisicao } });
  }

  const renderRequiServico = (requiServico) => {
    if (requiServico === 'ATRACACAO') {
      return 'ATRACAÇÃO';
    } else if (requiServico === 'DESATRACACAO') {
      return 'DESATRACAÇÃO';
    } else if (requiServico === 'REATRACACAO') {
      return 'REATRACAÇÃO';
    } else if (requiServico === 'DESATRACACAOF'){
      return 'DESATRACAÇÃO FUNDEIO'
    } else if (requiServico === 'FUNDEIO_INTERNO'){
      return 'FUNDEIO INTERNO'
    } else if (requiServico === 'TROCA') {
      return 'TROCA DE BERÇO'
    } else {
      return requiServico;
    }
  };

  return (
    <div className="RequisicoesContainer">
      <h1 className="RequisicoesTitle">Requisições</h1>
      {flashMessage && (
        <div className={`flash-message ${flashMessageType === 'success' ? 'success' : 'error'}`}>
          {flashMessage}
        </div>
      )}
      <ul className="RequisicoesList">
      <button className="AddButton" onClick={handleAddButtonClick}>
        Nova Requisição
      </button>
        {requisicoes.map((requisicao) => (
          <li key={requisicao.ID} className="RequisicoesListItem" onClick={() => handleItemClick(requisicao)}>
            <div className="RequisicoesNavio">{requisicao.Navio}</div>
            <div className="RequisicoesDetails">
              <div className='RequisicoesServico'>{renderRequiServico(requisicao.Requi_servico)}</div>
              <div className="RequisicoesData">{formatDate(requisicao.Data_requi)}</div>
              <div className="RequisicoesHora">{requisicao.Hora_requi}</div>
            </div>
          </li>
        ))}
      </ul>

      {/* Render the navios data */}
      <ul className="NaviosList">
        {navios.map((navio) => (
          <li key={navio.id} className="NaviosListItem">
            <div className="NavioName">{navio.name}</div>
            <div className="NavioType">{navio.type}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Requisicoes;
