import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavioFilter from '../Components/NavioFilter';

import './UpdateCondicionada.css';
import { useDispatch, useSelector } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';

// Import the fetchRebocadores and fetchAgencias functions
import { fetchRebocadores } from '../Utils/rebocadoresApi';
import { fetchAgencias } from '../Utils/agenciasApi';

function UpdateCondicionada(props) {
  const { serverPort } = props;
  const location = useLocation();
  const condicionadaData = location.state?.condicionadaData || null;
  const [matchingNavios, setMatchingNavios] = useState([]);
  const [nonMatchingNavios, setNonMatchingNavios] = useState([]);
  const [navioMain, setNavioMain] = useState('');
  const [navioSub, setNavioSub] = useState('');
  const [data, setData] = useState(new Date());
  const [viagem, setViagem] = useState('');
  const [servico, setServico] = useState('');
  const [berco, setBerco] = useState('');
  const [posicaoBerco, setPosicaoBerco] = useState('');
  const [obs, setObs] = useState('');
  const [fatu, setFatu] = useState('');
  const [rebocadores, setRebocadores] = useState([]);
  const [agencias, setAgencias] = useState([]);
  const [selectedRebocador, setSelectedRebocador] = useState('');
  const [showNavioFilter, setShowNavioFilter] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
  const flashMessageType = useSelector((state) => state.flashMessage.flashMessageType);


  useEffect(() => {
    const getNavios = async () => {
      try {
        const IDCookie = document.cookie
          .split(';')
          .find((row) => row.startsWith('_auth'))
          .split('=')[1];

          const token = document.cookie.split('=')[1];

        const response = await axios.get(`${serverPort}/navios/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'IDCookie': IDCookie,
          },
        });
        const { userID, navios } = response.data;
        
        const matching = navios.filter(navio => navio.ID_agencia === userID);
        // const nonMatching = navios.filter(navio => navio.ID_agencia !== userID);
        const nonMatching = navios;
        setMatchingNavios(matching);
        setNonMatchingNavios(nonMatching);
      } catch (error) {
        console.error('Error fetching navios:', error);
      }
    };

    getNavios();
  }, [serverPort]);

  useEffect(() => {
        // Use the fetchRebocadores function
        fetchRebocadores(serverPort, navigate)
        .then((rebocadoresData) => {
          // Handle the data
          setRebocadores(rebocadoresData);
        })
        .catch((error) => {
          // Handle errors
          console.error('Error fetching Rebocadores:', error);
        });
      // Use the fetchAgencias function
      fetchAgencias(serverPort, navigate)
        .then((agenciasData) => {
          // Handle the data
          setAgencias(agenciasData);
        })
        .catch((error) => {
          // Handle errors
          console.error('Error fetching Agencias:', error);
        });
    const flashTimeout = setTimeout(() => {
      dispatch(setFlashMessage('', ''));
    }, 3000);
    if (condicionadaData) {
      setNavioMain(condicionadaData.ID_NavioMain);
      setNavioSub(condicionadaData.ID_NavioSub);
      setData(new Date(condicionadaData.Data));
      setViagem(condicionadaData.Viagem);
      setServico(condicionadaData.Servico);
      setBerco(condicionadaData.Berco);
      setPosicaoBerco(condicionadaData.Posicao_Berco);
      setObs(condicionadaData.OBS);
      setFatu(condicionadaData.Fatu);
    } else {
      navigate('/condicionada')
    }
    return () => clearTimeout(flashTimeout);
  }, [condicionadaData, dispatch, navigate]);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  

const handleSaveChanges = async () => {
  try {
    const IDCookie = document.cookie
      .split(';')
      .find((row) => row.startsWith('_auth'))
      .split('=')[1];

    const token = document.cookie.split('=')[1];

// Get the UTC date string in the desired format
    const utcDateString = data.toISOString().split('T')[0];

    const requestData = {
      ID_NavioMain: navioMain,
      ID_NavioSub: navioSub,
      Data: utcDateString,
      Viagem: viagem,
      Servico: servico,
      Berco: berco,
      Posicao_Berco: posicaoBerco,
      OBS: obs,
      Fatu: fatu,
    };

    await axios.put(
      `${serverPort}/condicionada/${condicionadaData.ID}`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'IDCookie': IDCookie,
        },
      }
    );

    console.log('Condicionada updated successfully!');
    dispatch(
      setFlashMessage({
        message: 'Requisição Condicionada Atualizada com sucesso!',
        messageType: 'success',
      })
    );
    navigate('/condicionada');
  } catch (error) {
    console.error('Error updating condicionada:', error);
  }
};

const handleNavioSelect = (selectedNavio) => {
  // Set the selectedNavio in the Navio Condicao select
  setNavioSub(selectedNavio.ID); // Assuming you have an ID property in your navios data
  setShowNavioFilter(!showNavioFilter); // Hide the NavioFilter component after selection
};

const toggleNavioFilter = () => {
  setShowNavioFilter(!showNavioFilter);
};

  

const handleDeleteCondicionada = () => {
  const confirmed = window.confirm('Voçê tem certeza que deseja cancelar essa Requisição Condicionada?');
  if (confirmed) {
    //set configs and tokens
    const authStateCookie = document.cookie.split('; ').find((row) => row.startsWith('_auth_state'));
    const { ID } = condicionadaData;
    if (!authStateCookie) {
      navigate('/login');
      return;
    }
    const IDCookie = document.cookie.split(';').find((row) => row.startsWith('_auth')).split('=')[1];  

    const token = authStateCookie.split('=')[1];
    
    const utcDateString = data.toISOString().split('T')[0];
    const requestData = {
      ID_NavioMain: navioMain,
      ID_NavioSub: navioSub,
      Data: utcDateString,
      Viagem: viagem,
      Servico: servico,
      Berco: berco,
      Posicao_Berco: posicaoBerco,
      OBS: obs,
      Fatu: fatu,
    };

    const requestOptions = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        IDCookie: IDCookie,
      },
      body: JSON.stringify(requestData),
    };
    // Perform delete condicionada logic here
    //console.log('Delete condicionada :', condicionadaData);
    fetch(`${serverPort}/condicionada/${ID}`, requestOptions)
    .then((response) => {
      if (response.ok) {
        // Condicionada successfully deleted
        
        dispatch(setFlashMessage({ message: 'Requisição condicionada cancelada!', messageType: 'success' }));
        console.log('Condicionada deleted successfully');
        navigate('/condicionada');
        // Add any additional logic or state update here
      } else {
        // Error deleting condicionada
        console.error('Error deleting condicionada:', response.status);
        dispatch(setFlashMessage({ message: 'Error, não foi possivel cancelar a Requisição condicionada.', messageType: 'error' }));
        // Handle the error or show an error message to the user
      }
    })
    .catch((error) => {
      console.error('Error deleting condicionada:', error);
      // Handle the error or show an error message to the user
    });
  } else {
    console.log('Deletion cancelled');
  }
};

  return (

<div className="whole-screen">
  <div className="title">
    <h1 className="title">Atualizar Requisição Condicionada</h1>
  </div>
  <div className="content">
    <div className="columns">
      <div className="column">
        <div className='Field'>
          <label className="label">Navio</label>
          <select className="input" value={navioMain} onChange={(e) => setNavioMain(e.target.value)}>
            {matchingNavios.map(navio => (
              <option key={navio.ID} value={navio.ID}>{navio.Navio}</option>
            ))}
          </select>
        </div>

        <div className='Field'>    
          <label className="label">Data</label>
          <input className="input" type="date" value={data.toISOString().slice(0, 10)} onChange={(e) => setData(new Date(e.target.value))} min={formatDate(new Date())} />
        </div>

        <div className='Field'>
          <label className="label">Posição Berço</label>
          <input className="input" type="text" value={posicaoBerco} onChange={(e) => setPosicaoBerco(e.target.value)} />
        </div>

        <div className='Field'>
          <label className="label">Berço</label>
          <input className="input" type="number" min="1" max="3" value={berco} onChange={(e) => setBerco(e.target.value)} />
        </div>

        <div className='Field'>
          <label className="label">Obs</label>
          <textarea className="textarea" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>

      <div className="column">
        <div className='Field'>
          <label className="label">Navio Condição</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select className="input" value={navioSub} onChange={(e) => setNavioSub(e.target.value)}>
              {nonMatchingNavios.map(navio => (
                <option key={navio.ID} value={navio.ID}>{navio.Navio}</option>
              ))}
            </select>
            {/* Add a button to show/hide the NavioFilter */}
            <span className="show-hide-button" style={{ marginLeft: '10px' }}>
              <button className='filterButton' type="button" onClick={() => setShowNavioFilter(!showNavioFilter)}>
                &#x1F50D;
              </button>
            </span>
          </div>
            {/* Render the overlay conditionally */}
              {showNavioFilter && (
              <NavioFilter navios={nonMatchingNavios} agencias={agencias} onNavioSelect={handleNavioSelect} onClose={toggleNavioFilter} />
            )}
        </div>
        
        <div className='Field'>
          <label className="label">Serviço</label>
          <select className="input" value={servico} onChange={(e) => setServico(e.target.value)}>
            <option value="ATRACACAO">ATRACAÇÃO</option>
            <option value="DESATRACACAO">DESATRACAÇÃO</option>
            <option value="DESATRACACAOF">DESATRACAÇÃO FUNDEIO</option>
            <option value="FUNDEIO_INTERNO">FUNDEIO INTERNO</option>
            <option value="PUXADA">PUXADA</option>
            <option value="REATRACACAO">REATRACAÇÃO</option>
            <option value="TROCA">TROCA DE BERÇO</option>
          </select>
        </div>

        <div className='Field'>
          <label className="label">Viagem</label>
          <input className="input" type="number" value={viagem} onChange={(e) => setViagem(e.target.value)} />
        </div>

        <div className='Field FatuField'>
          <label className="label">Faturamento</label>
          <textarea className="textarea" value={fatu} onChange={(e) => setFatu(e.target.value)} />
        </div>
      </div>
    </div>

    <div className="radio-buttons-container">
      <label className="radio-container-label"><b>Rebocadores:</b></label>
      {rebocadores.map((rebocador) => (
        <label key={rebocador.ID} className="radio-label">
          <input
            type="radio"
            value={rebocador.nome}
            checked={selectedRebocador === rebocador.nome}
            onChange={() => setSelectedRebocador(rebocador.nome)}
          />
          {rebocador.nome}
        </label>
      ))}
      <label className="radio-label">
        <input
          type="radio"
          value="naoEnviarEmail"
          checked={selectedRebocador === 'naoEnviarEmail'}
          onChange={() => setSelectedRebocador('naoEnviarEmail')}
        />
        Não Mencionar.
      </label>
    </div>

    <div className="buttons">
      <button className="button save" onClick={handleSaveChanges}>Salvar Alterações</button>
      <button className="button delete" onClick={handleDeleteCondicionada}>Cancelar Condicionada</button>
    </div>
  </div>
</div>
  
  );
}

export default UpdateCondicionada;
