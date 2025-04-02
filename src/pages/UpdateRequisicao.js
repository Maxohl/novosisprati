import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';


import './UpdateRequisicao.css';
import { useDispatch, useSelector } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';
import { fetchRebocadores } from '../Utils/rebocadoresApi';

function UpdateRequisicao(props) {
  const { serverPort } = props;
  const location = useLocation();
  const RequisicaoData = location.state?.requisicaoData || null;
  const [naviosList, setNaviosList] = useState([]);
  const [navioID, setNavioID] = useState('');
  const [data, setData] = useState(new Date());
  const [hora, setHora] = useState('');
  const [viagem, setViagem] = useState('');
  const [servico, setServico] = useState('');
  const [berco, setBerco] = useState('');
  const [posicaoBerco, setPosicaoBerco] = useState('');
  const [obs, setObs] = useState('');
  const [fatu, setFatu] = useState('');
  const [selectedRebocador, setSelectedRebocador] = useState('');
  const [rebocadores, setRebocadores] = useState([]);
  const [responsavelNavio, setResponsavelNavio] = useState('');
  const [contatoResponsavel, setContatoResponsavel] = useState('');
  const [nomeAgencia, setNomeAgencia] = useState('');
  const [showField, setShowField] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
  const flashMessageType = useSelector((state) => state.flashMessage.flashMessageType);

  const restrictedServices = [
    'LEITURA_DE_CALADO',
    'TRANSPORTE_DE_ENFERMOS',
    'TRANSPORTE_DE_MANTIMENTOS',
    'TRANSPORTE_DE_OBITOS',
    'TRANSPORTE_DE_PASSAGEIROS',
    'VISTORIA_DE_CASCO'
  ];


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
    const getNavios = async () => {
      try {
        const IDCookie = document.cookie
          .split(';')
          .find((row) => row.startsWith('_auth'))
          .split('=')[1];

          const token = document.cookie.split('=')[1];

        const response = await axios.get(`${serverPort}/navios/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'IDCookie': IDCookie,
          },
        });
        const data = response.data;
        setNaviosList(data);
      } catch (error) {
        console.error('Error fetching navios:', error);
      }
    };

    getNavios();
  }, [serverPort]);

  useEffect(() => {
    const fetchProfileData = async () => {
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
      } catch (error) {
        console.error('Error fetching profile data:', error);
        navigate('/login'); // Redirect to login on error (optional)
      }
    };
  
    fetchProfileData();
  }, [navigate, serverPort]);

  useEffect(() => {
    const flashTimeout = setTimeout(() => {
      dispatch(setFlashMessage('', ''));
    }, 3000);
    if (RequisicaoData) {
      setNavioID(RequisicaoData.ID_Navio);
      setData(new Date(RequisicaoData.Data_requi));
      setHora(RequisicaoData.Hora_requi);
      setViagem(RequisicaoData.viagem);
      setServico(RequisicaoData.Requi_servico);
      setBerco(RequisicaoData.berco_requi);
      setPosicaoBerco(RequisicaoData.posicao_requi);
      setObs(RequisicaoData.Obs_requi);
      setFatu(RequisicaoData.Fatu_requi);
      setSelectedRebocador(RequisicaoData.rebocador_requi);
      setResponsavelNavio(RequisicaoData.responsavel_navio);
      setContatoResponsavel(RequisicaoData.contato_responsavel);
      if (restrictedServices.includes(RequisicaoData.Requi_servico)) {
        setShowField(false);
      }
    } else {
      navigate('/requisicoes')
    }
    return () => clearTimeout(flashTimeout);
  }, [RequisicaoData, dispatch, navigate]);

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
      ID_Navio: navioID,
      Data_requi: utcDateString,
      Hora_requi: hora,
      viagem: viagem,
      Requi_servico: servico,
      berco_requi: berco,
      posicao_requi: posicaoBerco,
      Obs_requi: obs,
      Fatu_requi: fatu,
      selectedRebocador,
      isLancha: !showField,
      responsavelNavio: responsavelNavio,
      contatoResponsavel: contatoResponsavel
    };

    await axios.put(
      `${serverPort}/requisicoes/${RequisicaoData.ID}`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'IDCookie': IDCookie,
        },
      }
    );

    console.log('Requisicao updated successfully!');
    dispatch(
      setFlashMessage({
        message: 'Requisição Atualizada com sucesso!',
        messageType: 'success',
      })
    );
    navigate('/requisicoes');
  } catch (error) {
    console.error('Error updating requisicao:', error);
  }
};

  

const handleDeleteRequisicao = () => {
  const confirmed = window.confirm('Voçê tem certeza que deseja cancelar essa Requisição?');
  if (confirmed) {
    //set configs and tokens
    const authStateCookie = document.cookie.split('; ').find((row) => row.startsWith('_auth_state'));
    const { ID } = RequisicaoData;
    if (!authStateCookie) {
      navigate('/login');
      return;
    }
    const IDCookie = document.cookie.split(';').find((row) => row.startsWith('_auth')).split('=')[1];  

    const token = authStateCookie.split('=')[1];

    const requestOptions = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        IDCookie: IDCookie,
      },
    };
    // Perform delete requisicao logic here
    fetch(`${serverPort}/requisicoes/${ID}`, requestOptions)
    .then((response) => {
      if (response.ok) {
        // Requisicao successfully deleted
        
        dispatch(setFlashMessage({ message: 'Requisição cancelada!', messageType: 'success' }));
        console.log('Requisicao deleted successfully');
        navigate('/requisicoes');
        // Add any additional logic or state update here
      } else {
        // Error deleting requisicao
        console.error('Error deleting requisicao:', response.status);
        dispatch(setFlashMessage({ message: 'Error, não foi possivel cancelar a Requisição.', messageType: 'error' }));
        // Handle the error or show an error message to the user
      }
    })
    .catch((error) => {
      console.error('Error deleting requisicao:', error);
      // Handle the error or show an error message to the user
    });
  } else {
    console.log('Deletion cancelled');
  }
};

const handleDownload = async() => {
  const utcDateString = data.toISOString().split('T')[0];
  const selectedNavio = naviosList.find(navio => navio.ID === navioID);

  let formattedData = '';

  formattedData += ` ${nomeAgencia.toUpperCase()} \n\n`;
  
  if(servico === 'TROCA' || servico === 'PUXADA'){
    formattedData += `Sem a utilização dos serviços de lancha \n`;
  }

  formattedData += `Navio: ${selectedNavio.Navio}\n`;
  formattedData += `Data: ${utcDateString} ${hora}\n`;

  if(servico === 'ATRACACAO'){
    formattedData += `Serviço: ATRACAÇÃO \n`;
  }

  if(servico === 'DESATRACACAO'){
    formattedData += `Serviço: DESATRACAÇÃO \n`;
  }

  if(servico === 'REATRACACAO'){
    formattedData += `Serviço: REATRACAÇÃO \n`;
  }

  if(servico === 'DESATRACACAOF'){
    formattedData += `Serviço: DESATRACAÇÃO FUNDEIO \n`;
  }

  if(servico === 'FUNDEIO_INTERNO'){
    formattedData += `Serviço: FUNDEIO INTERNO \n`;
  }

  if(servico === 'TROCA'){
    formattedData += `TROCA DE BERÇO \n`;
  }

  if(servico === 'LEITURA_DE_CALADO'){
    formattedData += `LEITURA DE CALADO \n`
  }

  if(servico === 'TRANSPORTE_DE_ENFERMOS'){
    formattedData += `TRANSPORTE DE ENFÊRMOS \n`
  }

  if(servico === 'TRANSPORTE_DE_SUPRIMENTOS'){
    formattedData += `TRANSPORTE DE SUPRIMENTOS \n`
  }  

  if(servico === 'TRANSPORTE_DE_OBITOS'){
    formattedData += `TRANSPORTE DE ÓBITOS \n`
  }

  if(servico === 'TRANSPORTE_DE_PASSAGEIROS'){
    formattedData += `TRANSPORTE DE PASSAGEIROS \n`
  }

  if(servico === 'VISTORIA_DE_CASCO'){
    formattedData += `VISTORIA DE CASCO \n`
  }

  formattedData += `Berço: ${berco}\n`;
  formattedData += `Posição: ${posicaoBerco}\n`;
  formattedData += `\nResponsável pelo Navio\n`;
  formattedData += ` Nome: ${responsavelNavio}\n`
  formattedData += ` Celular: ${contatoResponsavel}\n\n`
  formattedData += `IMO: ${selectedNavio.IMO}\n`;
  formattedData += `Bandeira: ${selectedNavio.Bandeira}\n`;
  formattedData += `Armador: ${selectedNavio.armador}\n`;
  formattedData += `Carga: ${selectedNavio.Carga}\n`;
  formattedData += `GROSS: ${selectedNavio.GRT}\n`;
  formattedData += `DWT: ${selectedNavio.DWT}\n`;
  formattedData += `LOA: ${selectedNavio.LOA}\n`;
  
  if (servico === 'DESATRACACAO' || servico === 'DESATRACACAOF') {
    formattedData += `Calado Saída: FWD:${selectedNavio.CS_proa}m AFT:${selectedNavio.CS_popa}m \n`;
  } else {
    formattedData += `Calado Entrada: FWD:${selectedNavio.C_proa}m AFT:${selectedNavio.C_popa}m \n`;
  }

  formattedData += `Faturamento: ${fatu}\n`;
  formattedData += `OBS: ${obs}\n`;
  formattedData += `Rebocador: ${selectedRebocador}`;


  const fileName = `Requisicao ${utcDateString}`;

  const doc = new jsPDF();
  doc.text(formattedData, 10, 10);
  doc.save(fileName + '.pdf');

  // const blob = new Blob([formattedData], { type: 'text/plain' });
  // saveAs(blob, fileName+'.txt');
};


  return (
    <div style={{ paddingBottom: '100px' }}>
      <h1 className="title">Atualizar Requisição</h1>
      
      <div className="btn-container">
        <button
          className={`toggle-btn ${showField ? 'active' : ''}`}
          onClick={() => setShowField(true)}
        >
          Requisição de Navios
        </button>
        <button
          className={`toggle-btn ${!showField ? 'active' : ''}`}
          onClick={() => setShowField(false)}
        >
          Requisição de Lancha
        </button>
      </div>

      <div className="columns">
        <div className="column">
          <label className="label">Navio</label>
          <select className="input" value={navioID} onChange={(e) => setNavioID(e.target.value)}>
            {naviosList.map(navio => (
            <option key={navio.ID} value={navio.ID}>{navio.Navio}</option>
            ))}
          </select>
  
          <label className="label">Data</label>
          <input className="input" type="date" value={data.toISOString().slice(0, 10)} onChange={(e) => setData(new Date(e.target.value))} min={formatDate(new Date())} />
  
          {showField && (
            <>
              <label className="label">Posição Berço</label>
              <input className="input" type="text" value={posicaoBerco} onChange={(e) => setPosicaoBerco(e.target.value)} />


              <h4>Responsável do Navio</h4>
              <label className="label" htmlFor="responsavelNavio">
                Nome:
              </label>
              <input
                className="inputField"
                id="responsavelNavio"
                type="text"
                value={responsavelNavio}
                onChange={(event) => setResponsavelNavio(event.target.value)}
                />
            </>

          )}

          <label className="label">Viagem</label>
          <input className="input" type="number" value={viagem} onChange={(e) => setViagem(e.target.value)} />
        </div>
  
        <div className="column">
          <label className="label">Serviço</label>
          {showField ? (
              <select className="input" value={servico} onChange={(e) => setServico(e.target.value)}>
                <option value="ATRACACAO">ATRACAÇÃO</option>
                <option value="DESATRACACAO">DESATRACAÇÃO</option>
                <option value="DESATRACACAOF">DESATRACAÇÃO FUNDEIO</option>
                <option value="FUNDEIO_INTERNO">FUNDEIO INTERNO</option>
                <option value="PUXADA">PUXADA</option>
                <option value="REATRACACAO">REATRACAÇÃO</option>
                <option value="TROCA">TROCA DE BERÇO</option>
              </select>      
            ) : (
              <select className="input" value={servico} onChange={(event) => setServico(event.target.value)}>
                  <option value="LEITURA_DE_CALADO">LEITURA DE CALADO</option>
                  <option value="TRANSPORTE_DE_ENFERMOS">TRANSPORTE DE ENFÊRMOS</option>
                  <option value="TRANSPORTE_DE_SUPRIMENTOS">TRANSPORTE DE SUPRIMENTOS (INFORMAR PESO TOTAL NO OBS)</option>
                  <option value="TRANSPORTE_DE_OBITOS">TRANSPORTE DE ÓBITOS</option>
                  <option value="TRANSPORTE_DE_PASSAGEIROS">TRANSPORTE DE PASSAGEIROS (MAX 6)</option>
                  <option value="VISTORIA_DE_CASCO">VISTORIA DE CASCO</option>
                </select>
              )}

          <label className='label'>Hora</label> 
          <input className='input' type='time' value={hora} onChange={(e) => setHora(e.target.value)} />
          
          {showField && (
            <>
              <label className="label">Berço</label>
              <input className="input" type="number" min="1" max="3" value={berco} onChange={(e) => setBerco(e.target.value)} />
              
              <h4 style={{ visibility: 'hidden' }}>Nothing here</h4>
              <label className="label" htmlFor="contatoResponsavel">
                Celular:
              </label>
              <input
                className="inputField"
                id="contatoResponsavel"
                type="text"
                value={contatoResponsavel}
                onChange={(event) => setContatoResponsavel(event.target.value)}
              />
            </>
          )}


        </div>
      </div>
  
  
      <div className="columns">
        <div className="column">
          <label className="label">Obs</label>
          <textarea className="textarea" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
  
        <div className="column">
          <label className="label">Faturamento</label>
          <textarea className="textarea" value={fatu} onChange={(e) => setFatu(e.target.value)} />
        </div>
      </div>

      {showField && (
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
      )}
  
      <div className="buttons">
        <button className="button save" onClick={handleSaveChanges}>Salvar Alterações</button>
        <button className="button delete" onClick={handleDeleteRequisicao}>Cancelar Requisição</button>
        <button className='button download' onClick={handleDownload}>Download</button>
      </div>
    </div>
  );
  
}

export default UpdateRequisicao;
