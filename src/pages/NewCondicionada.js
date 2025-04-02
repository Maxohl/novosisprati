import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './NewCondicionada.css';
import NavioFilter from '../Components/NavioFilter';

import { useDispatch, useSelector } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';

// Import the fetchRebocadores and fetchAgencias functions
import { fetchRebocadores } from '../Utils/rebocadoresApi';
import { fetchAgencias } from '../Utils/agenciasApi';

function NewCondicionada(props) {
  const { serverPort } = props;
  const navigate = useNavigate();
  const [IDCookie, setIDCookie] = useState('');
  const [matchingNavios, setMatchingNavios] = useState([]);
  const [nonMatchingNavios, setNonMatchingNavios] = useState([]);
  const [navios, setNavios] = useState([]);
  const [navio, setNavio] = useState('');
  const [ID_NavioSub, setID_NavioSub] = useState('');
  const [data, setData] = useState('');
  const [viagem, setViagem] = useState('');
  const [servico, setServico] = useState('ATRACACAO');
  const [berco, setBerco] = useState('');
  const [posicaoBerco, setPosicaoBerco] = useState('');
  const [faturamento, setFaturamento] = useState('');
  const [obs, setObs] = useState('');
  const [responsavelNavio, setResponsavelNavio] = useState('');
  const [contatoResponsavel, setContatoResponsavel] = useState('');
  const [rebocadores, setRebocadores] = useState([]);
  const [agencias, setAgencias] = useState([]);
  const [selectedRebocador, setSelectedRebocador] = useState('');
  const [showNavioFilter, setShowNavioFilter] = useState(false);
  const dispatch = useDispatch();

  const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
  const flashMessageType = useSelector((state) => state.flashMessage.flashMessageType);

  const [isNavioFilterVisible, setIsNavioFilterVisible] = useState(false);
  // const [selectedNavioFromFilter, setSelectedNavioFromFilter] = useState('');


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
    const fetchNavios = async () => {
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

        setIDCookie(IDCookie);

        const token = authStateCookie.split('=')[1];

        // Logging the stored token
        console.log('Stored token:', token);
        const response = await axios.get(`${serverPort}/navios/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'IDCookie': IDCookie,
          },
        });

        const { userID, navios } = response.data;

        // Filter navios based on userID
        const matchingNavios = navios.filter((navio) => navio.ID_agencia === userID);
        // const nonMatchingNavios = navios.filter((navio) => navio.ID_agencia !== userID);
        const nonMatchingNavios = navios;
        

        setMatchingNavios(matchingNavios);
        setNonMatchingNavios(nonMatchingNavios);
      } catch (error) {
        console.error('Error fetching navios:', error);
      }
      return () => clearTimeout(flashTimeout);
    };


    fetchNavios();
  }, [serverPort, navigate, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Create the payload to send in the request
    const payload = {
      ID_NavioMain: navio,
      ID_NavioSub: ID_NavioSub,
      Data: data,
      Viagem: viagem,
      Servico: servico,
      Berco: berco,
      Posicao_Berco: posicaoBerco,
      OBS: obs,
      Fatu: faturamento,
      responsavelNavio: responsavelNavio,
      contatoResponsavel: contatoResponsavel,
      selectedRebocador
    };

    try {
      // Send the request to the backend
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

      setIDCookie(IDCookie);

      const token = authStateCookie.split('=')[1];

      // Logging the stored token
      console.log('Stored token:', token);
      const response = await axios.post(`${serverPort}/condicionada`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'IDCookie': IDCookie,
        },
      });
      // Handle the response as needed
      console.log('Form submitted successfully:', response.data);
      dispatch(setFlashMessage({ message: 'Requisição Condicionada realizada com sucesso!', messageType: 'success' }));
      // Clear the form fields
      setNavio('');
      setID_NavioSub('');
      setData('');
      setViagem('');
      setServico('');
      setBerco('');
      setPosicaoBerco('');
      setFaturamento('');
      setResponsavelNavio('');
      setContatoResponsavel('');
      setObs('');
      navigate('/condicionada');
    } catch (error) {
      console.error('Error submitting form:', error);
      dispatch(setFlashMessage({ message: error.response.data.error, messageType: 'error' }));
      // Clear the error message after 3 seconds
      setTimeout(() => {
        dispatch(setFlashMessage('', ''));
      }, 3000);
    }
  };

    const handleNavioSelect = (selectedNavio) => {
    // Set the selectedNavio in the Navio Condicao select
    setID_NavioSub(selectedNavio.ID); // Assuming you have an ID property in your navios data
    setShowNavioFilter(!showNavioFilter); // Hide the NavioFilter component after selection
  };

  const toggleNavioFilter = () => {
    setShowNavioFilter(!showNavioFilter);
  };

  return (
<div className="NewCondicionadaContainer">
  <h1 className="NewCondicionadaTitle">Nova Condicionada</h1>
  {flashMessage && (
    <div className={`flash-message ${flashMessageType === 'success' ? 'success' : 'error'}`}>
      {flashMessage}
    </div>
  )}
  <form className="NewCondicionadaForm" onSubmit={handleSubmit}>
    <div className="NewCondicionadaColumns">
      <div className="column">
        <div className="NewCondicionadaFormField">
          <label htmlFor="navio">Navio:</label>
          <select
            id="navio"
            name="navio"
            value={navio}
            onChange={(e) => setNavio(e.target.value)}
            required
          >
            <option value="">Selecionar Navio</option>
            {matchingNavios.map((navio) => (
              <option key={navio.ID} value={navio.ID}>
                {navio.Navio}
              </option>
            ))}
          </select>
        </div>
        <div className="NewCondicionadaFormField">
          <label htmlFor="data">Data:</label>
          <input
            type="date"
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="NewCondicionadaFormField">
          <label htmlFor="posicaoBerco">Posição Berço:</label>
          <input
            type="text"
            id="posicaoBerco"
            value={posicaoBerco}
            onChange={(e) => setPosicaoBerco(e.target.value)}
            required
          />
        </div>
        
        <h4>Responsável pelo Navio</h4>
        <div className='NewCondicionadaFormField'>
            <label htmlFor="responsavelNavio">Nome:</label>
            <input
              type="text"
              id="responsavelNavio"
              value={responsavelNavio}
              onChange={(e) => setResponsavelNavio(e.target.value)}
              required
            />
        </div>    

        <div className="NewCondicionadaFormField">
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
      </div>

      <div className="column">
        <div className="NewCondicionadaFormField">
          <label htmlFor="navioCondicao">Navio Condição:</label>
          <div className="navioCondicaoContainer">
            <select
              id="navioCondicao"
              name="navioCondicao"
              value={ID_NavioSub}
              onChange={(e) => setID_NavioSub(e.target.value)}
              required
            >
              <option value="">Selecionar Navio Condição</option>
              {nonMatchingNavios.map((navio) => (
                <option key={navio.ID} value={navio.ID}>
                  {`${navio.Navio} - ${navio.codigo}`}
                </option>
              ))}
            </select>
            {/* Add a button to show/hide the NavioFilter */}
            <span className="show-hide-button">
              <button type="button" className="SearchButton" onClick={() => setShowNavioFilter(!showNavioFilter)}>
                &#x1F50D;
              </button>
            </span>
          </div>
         {/* Render the overlay conditionally */}
            {showNavioFilter && (
              <NavioFilter navios={nonMatchingNavios} agencias={agencias} onNavioSelect={handleNavioSelect} onClose={toggleNavioFilter} />
            )}

        </div>
        
        <div className="NewCondicionadaFormField">
          <label htmlFor="viagem">Viagem:</label>
          <input
            type="number"
            id="viagem"
            value={viagem}
            onChange={(e) => setViagem(e.target.value)}
            required
          />
        </div>
        <div className="NewCondicionadaFormField">
          <label htmlFor="berco">Berço:</label>
          <input
            type="number"
            id="berco"
            value={berco}
            onChange={(e) => setBerco(e.target.value)}
            required
            min="1"
            max="3"
          />
        </div>
         
        <h4 style={{ visibility: 'hidden' }}>Nothing here</h4>
        <div className='NewCondicionadaFormField'>
            <label htmlFor="contatoResponsavel">Celular:</label>
            <input
              type="text"
              id="contatoResponsavel"
              value={contatoResponsavel}
              onChange={(e) => setContatoResponsavel(e.target.value)}
              required
            />
        </div>

      </div>
    </div>
    <div className="NewCondicionadaColumns">
      <div className="column">
        <div className="NewCondicionadaFormField">
          <label htmlFor="faturamento">Faturamento:</label>
          <textarea
            id="faturamento"
            value={faturamento}
            onChange={(e) => setFaturamento(e.target.value)}
            
          ></textarea>
        </div>
      </div>
      <div className="column">
        <div className="NewCondicionadaFormField">
          <label htmlFor="obs">Obs:</label>
          <textarea
            id="obs"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            
          ></textarea>
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

    <button className="NewCondicionadaSubmitButton" type="submit">
      Salvar
    </button>
  </form>
</div>

  );
}

export default NewCondicionada;
