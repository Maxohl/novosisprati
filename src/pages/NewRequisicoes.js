  import React, { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import axios from 'axios';
  import './NewRequisicoes.css';

  import { useDispatch, useSelector } from 'react-redux';
  import { setFlashMessage } from '../Reducers/actions';

  const NewRequisicoes = ({ serverPort }) => {
    const navigate = useNavigate();
    const [IDCookie, setIDCookie] = useState('');
    const [navios, setNavios] = useState([]);
    const [selectedNavio, setSelectedNavio] = useState('');
    const [data, setData] = useState('');
    const [servico, setServico] = useState('');
    const [hora, setHora] = useState('');
    const [berco, setBerco] = useState('');
    const [posicaoBerco, setPosicaoBerco] = useState('');
    const [viagem, setViagem] = useState('');
    const [faturamento, setFaturamento] = useState('');
    const [obs, setObs] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rebocadores, setRebocadores] = useState([]);
    const [selectedRebocador, setSelectedRebocador] = useState('');
    const [showField, setShowField] = useState(true)


    const dispatch = useDispatch();

    const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
    const flashMessageType = useSelector((state) => state.flashMessage.flashMessageType);

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
        const response = await axios.get(`${serverPort}/navios`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'IDCookie': IDCookie,
          },
        });
        const data = response.data;
        setNavios(data);
      } catch (error) {
        console.log('Error fetching Navios:', error);
      }
    };

    const fetchRebocadores = async () => {
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
        const response = await axios.get(`${serverPort}/rebocador`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'IDCookie': IDCookie,
          },
        });
        const data = response.data;
        setRebocadores(data);
      } catch (error) {
        console.log('Error fetching Rebocadores:', error);
      }
    };

    useEffect(() => {
      // Fetch the list of Navios from the backend
      fetchNavios();
      fetchRebocadores();
      const flashTimeout = setTimeout(() => {
        dispatch(setFlashMessage('', ''));
      }, 3000);
      return () => clearTimeout(flashTimeout);
    }, [dispatch]);

    useEffect(() => {
      if (selectedNavio) {
        const selectedNavioObject = navios.find(navio => navio.ID.toString() === selectedNavio.toString());
        if (selectedNavioObject) {
          setViagem(selectedNavioObject.Viagem);
        }
      }
      setServico('ATRACACAO');
    }, [selectedNavio, navios]);
    
    

    const handleSubmit = (event) => {
      event.preventDefault();
    
      // Check if any required field is empty
      if (
        !selectedNavio ||
        !data ||
        !hora ||
        !viagem 

      ) {
        // Dispatch the warning message
        dispatch(
          setFlashMessage({
            message: 'Favor preencha todos os campos!',
            messageType: 'warning',
          })
        );
        setTimeout(() => {
          dispatch(setFlashMessage('', ''));
        }, 4000); // Clear the flash message after 4 seconds
        return;
      }
    
      // Prepare the data to be sent to the backend
      const requisicaoData = {
        ID_Navio: selectedNavio,
        Data_requi: data,
        Hora_requi: hora,
        Viagem: viagem,
        Requi_servico: servico,
        berco_requi: berco,
        posicao_requi: posicaoBerco,
        Obs_requi: obs,
        Fatu_requi: faturamento,
        rebocador_requi: selectedRebocador,
        isLancha: !showField,
      };
    
      // Send the requisicaoData to the backend
      setIsLoading(true);
      sendRequisicao(requisicaoData);
    };
    

  const sendRequisicao = async (requisicaoData) => {
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

    // Check if a requisition already exists at the selected date and time
    const checkRequisicaoResponse = await axios.get(
      `${serverPort}/check/requisicao?data=${requisicaoData.Data_requi}&hora=${requisicaoData.Hora_requi}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'IDCookie': IDCookie,
        },
      }
    );

    if (checkRequisicaoResponse.data.success) {
      // A requisition already exists at the selected date and time
      dispatch(
        setFlashMessage({
          message: 'Já existe uma requisição para esse horário.',
          messageType: 'error',
        })
      );
      setTimeout(() => {
        dispatch(setFlashMessage('', ''));
      }, 3000); // Clear the flash message after 3 seconds
      setIsLoading(false);
      return;
    }

    // Add the selected rebocador email to the requisicaoData
    if (selectedRebocador !== 'naoEnviarEmail') {
      requisicaoData.selectedRebocador = selectedRebocador;
    }

    // No existing requisition found, proceed with making the POST request
    const response = await axios.post(
      `${serverPort}/requisicoes`,
      requisicaoData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'IDCookie': IDCookie,
        },
      }
    );
    console.log('Requisicao sent successfully:', response.data);
    setIsLoading(false);
    dispatch(
      setFlashMessage({ message: 'Requisição realizada com sucesso!', messageType: 'success' })
    );
    navigate('/requisicoes');
  } catch (error) {
    console.log('Error sending Requisicao:', error);
    setIsLoading(false);
  }
};


  const handleHoraChange = (event) => {
    const selectedTime = event.target.value;
    const selectedDate = data; // Get the selected date from the state

    const currentDate = new Date().toISOString().split('T')[0];
    const isSameDate = selectedDate === currentDate;

    if (isSameDate) {
      const selectedHour = parseInt(selectedTime.split(':')[0]);
      const selectedMinute = parseInt(selectedTime.split(':')[1]);

      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();

      const timeDiff = selectedHour * 60 + selectedMinute - (currentHour * 60 + currentMinute);

      if (timeDiff < 180) {
        // Show a warning message or set a flag to indicate the invalid time selection
        dispatch(
          setFlashMessage({
            message: 'Aviso! Requisição precisa ser feita com 3 horas de antecedência',
            messageType: 'warning',
          })
        );
        setTimeout(() => {
          dispatch(setFlashMessage('', ''));
        }, 3000); // Clear the flash message after 3 seconds
        setHora(selectedTime);
        return;
      }
    }

    setHora(selectedTime);
  };


  return (
    <div className='FullArea'>
      <h2 className="NewRequisicoesTitle">Nova Requisição</h2>
      {flashMessage && (
        <div className={`flash-message ${flashMessageType === 'success' ? 'success' : flashMessageType === 'warning' ? 'warning' : 'error'}`}>
          {flashMessage}
        </div>
      )}

      <div className="btn-container">
        <button
          className={`toggle-btn ${showField ? 'active' : ''}`}
          onClick={() => {
            setShowField(true);
            setServico("ATRACAÇÃO");
          }}
        >
          Requisição de Navios
        </button>
        <button
            className={`toggle-btn ${!showField ? 'active' : ''}`}
            onClick={() => {
              setShowField(false);
              setServico("LEITURA DE CALADO");
            }}
        >
            Requisição de Lancha
        </button>
      </div>

      <form className="NewRequisicoesForm" onSubmit={handleSubmit}>
        <div className="columns">
          <div className="column">

            <label className="label" htmlFor="navio">
              Navio:
            </label>
            <select
              className="inputField"
              id="navio"
              value={selectedNavio}
              onChange={(event) => setSelectedNavio(event.target.value)}
            >
              <option value="">Selecionar Navio</option>
              {navios.map((navio) => (
                <option key={navio.ID} value={navio.ID}>
                  {navio.Navio}
                </option>
              ))}
            </select>

            <label className="label" htmlFor="data">
              Data:
            </label>
            <input
              className="inputField"
              id="data"
              type="date"
              value={data}
              min={new Date().toISOString().split('T')[0]}
              onChange={(event) => setData(event.target.value)}
            />
            
            {showField && (
              <>
                <label className="label" htmlFor="berco">
                  Berço:
                </label>
                <input
                  className="inputField"
                  type="number"
                  min="1"
                  max="3"
                  value={berco}
                  onChange={(event) => setBerco(event.target.value)}
                />
            </>
            )}

            <label className="label" htmlFor="servico">
              Serviço:
            </label>

              {showField ? (
                <select
                  className="inputField"
                  id="servico"
                  value={servico}
                  onChange={(event) => setServico(event.target.value)}
                >
                  <option value="ATRACACAO">ATRACAÇÃO</option>
                  <option value="DESATRACACAO">DESATRACAÇÃO</option>
                  <option value="DESATRACAACAOF">DESATRACAÇÃO FUNDEIO</option>
                  <option value="FUNDEIO_INTERNO">FUNDEIO INTERNO</option>
                  <option value="PUXADA">PUXADA</option>
                  <option value="REATRACACAO">REATRACACÃO</option>
                  <option value="TROCA">TROCA DE BERÇO</option>
                </select>
              ) : (
                <select
                  className="inputField"
                  id="servico"
                  value={servico}
                  onChange={(event) => setServico(event.target.value)}
                >
                  <option value="LEITURA_DE_CALADO">LEITURA DE CALADO</option>
                  <option value="TRANSPORTE_DE_ENFERMOS">TRANSPORTE DE ENFERMOS</option>
                  <option value="TRANSPORTE_DE_MANTIMENTOS">TRANSPORTE DE MANTIMENTOS (INFORMAR PESO TOTAL NO OBS)</option>
                  <option value="TRANSPORTE_DE_OBITOS">TRANSPORTE DE ÓBITOS</option>
                  <option value="TRANSPORTE_DE_PASSAGEIROS">TRANSPORTE DE PASSAGEIROS (MAX 6)</option>
                  <option value="VISTORIA_DE_CASCO">VISTORIA DE CASCO</option>
                </select>
              )}
            
            <div className='ExtraArea'>
              <label className="label" htmlFor="obs">
                Obs:
              </label>
              <textarea
                className="textarea"
                id="obs"
                value={obs}
                onChange={(event) => setObs(event.target.value)}
              />
            </div>

          </div>

          <div className="column obsColumn">
            <div className="inputFieldContainer">
              <label className="label" htmlFor="hora">
                Hora:
              </label>
              <input
                className="inputField"
                id="hora"
                type="time"
                name="hora"
                value={hora}
                onChange={handleHoraChange}
              />

              {showField && (
                <>
                  <label className="label" htmlFor="posicaoBerco">
                    Posição Berço:
                  </label>
                  <input
                    className="inputField"
                    id="posicaoBerco"
                    type="text"
                    value={posicaoBerco}
                    onChange={(event) => setPosicaoBerco(event.target.value)}
                  />
                </>
              )}

              <label className="label" htmlFor="viagem">
                Viagem:
              </label>
              <input
                className="inputField"
                id="viagem"
                type="number"
                value={viagem}
                onChange={(event) => setViagem(event.target.value)}
              />
              <div className='ExtraArea'>
                <label className="label" htmlFor="faturamento">
                  Faturamento:
                </label>
                <textarea
                  className="textarea"
                  id="faturamento"
                  value={faturamento}
                  onChange={(event) => setFaturamento(event.target.value)}
                />
              </div>
            
            </div>
          </div>
        </div>

        {showField && (
        <div className="radio-buttons-container">
          <label className="radio-container-label"><b>Rebocador:</b></label>
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
        )}
        

        <div className={`saveButtonContainer ${isLoading ? 'loading-cursor' : 'default-cursor'}` }>
          
          <button className="saveButton" type="submit">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewRequisicoes;
