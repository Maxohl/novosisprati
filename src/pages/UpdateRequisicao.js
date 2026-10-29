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
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const flashMessage = useSelector(
    (state) => state.flashMessage.flashMessage
  );

  const flashMessageType = useSelector(
    (state) => state.flashMessage.flashMessageType
  );

  const restrictedServices = [
    'LEITURA_DE_CALADO',
    'TRANSPORTE_DE_ENFERMOS',
    'TRANSPORTE_DE_MANTIMENTOS',
    'TRANSPORTE_DE_OBITOS',
    'TRANSPORTE_DE_PASSAGEIROS',
    'VISTORIA_DE_CASCO'
  ];

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  // Gets a cookie safely.
  const getCookie = (cookieName) => {
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${cookieName}=`));

    if (!cookie) {
      return null;
    }

    return cookie.substring(cookieName.length + 1);
  };

  /*
   * IMPORTANT:
   *
   * Do NOT use:
   *
   * new Date("2026-10-01")
   *
   * for a date that represents a calendar date in Brazil.
   *
   * JavaScript interprets YYYY-MM-DD as UTC, which can turn
   * October 1st into September 30th in UTC-3.
   *
   * This function creates the date in LOCAL time instead.
   */
  const parseLocalDate = (dateValue) => {
    if (!dateValue) {
      return null;
    }

    if (dateValue instanceof Date) {
      const localDate = new Date(dateValue);
      localDate.setHours(0, 0, 0, 0);
      return localDate;
    }

    const dateString = String(dateValue).split('T')[0];

    const parts = dateString.split('-');

    if (parts.length !== 3) {
      return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return null;
    }

    const localDate = new Date(year, month - 1, day);

    if (Number.isNaN(localDate.getTime())) {
      return null;
    }

    localDate.setHours(0, 0, 0, 0);

    return localDate;
  };

  /*
   * Converts the Date object into YYYY-MM-DD WITHOUT UTC.
   *
   * This is important because toISOString() can move the date
   * backwards one day in Brazil.
   */
  const formatDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  /*
   * Makes sure the time is in HH:mm format.
   *
   * It also handles values such as:
   * 21:00
   * 21:00:00
   */
  const normalizeTime = (timeValue) => {
    if (!timeValue) {
      return '';
    }

    const parts = String(timeValue).split(':');

    if (parts.length < 2) {
      return '';
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return '';
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}`;
  };

  /*
   * Creates the requested date/time in LOCAL time.
   *
   * Example:
   * data = 01/10/2026
   * hora = 21:00
   *
   * Result:
   * 01/10/2026 21:00 local time
   */
  const createRequestDateTime = (selectedDate, selectedTime) => {
    if (!selectedDate || !selectedTime) {
      return null;
    }

    const localDate = new Date(selectedDate);

    if (Number.isNaN(localDate.getTime())) {
      return null;
    }

    const normalizedTime = normalizeTime(selectedTime);

    if (!normalizedTime) {
      return null;
    }

    const [hours, minutes] = normalizedTime.split(':').map(Number);

    localDate.setHours(hours, minutes, 0, 0);

    return localDate;
  };

  /*
   * ============================================================
   * FLASH MESSAGE
   * ============================================================
   *
   * The old code started the 3-second timer whenever
   * RequisicaoData changed.
   *
   * That meant a new message created by handleSaveChanges()
   * did not necessarily get its own timer.
   *
   * Now the timer follows the actual flash message.
   */

  useEffect(() => {
    if (!flashMessage) {
      return undefined;
    }

    const flashTimeout = setTimeout(() => {
      dispatch(setFlashMessage('', ''));
    }, 5000);

    return () => clearTimeout(flashTimeout);
  }, [flashMessage, dispatch]);

  /*
   * ============================================================
   * LOAD REBOCADORES + NAVIOS
   * ============================================================
   */

  useEffect(() => {
    let isMounted = true;

    fetchRebocadores(serverPort, navigate)
      .then((rebocadoresData) => {
        if (isMounted) {
          setRebocadores(rebocadoresData);
        }
      })
      .catch((error) => {
        console.error('Error fetching Rebocadores:', error);

        if (isMounted) {
          dispatch(
            setFlashMessage({
              message: 'Não foi possível carregar os rebocadores.',
              messageType: 'error',
            })
          );
        }
      });

    const getNavios = async () => {
      try {
        const IDCookie = getCookie('_auth');

        const authStateCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('_auth_state='));

        if (!IDCookie || !authStateCookie) {
          navigate('/login');
          return;
        }

        const token = authStateCookie.substring('_auth_state='.length);

        const response = await axios.get(`${serverPort}/navios/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            IDCookie: IDCookie,
          },
        });

        if (isMounted) {
          setNaviosList(response.data);
        }
      } catch (error) {
        console.error('Error fetching navios:', error);

        if (isMounted) {
          dispatch(
            setFlashMessage({
              message: 'Não foi possível carregar os navios.',
              messageType: 'error',
            })
          );
        }
      }
    };

    getNavios();

    return () => {
      isMounted = false;
    };
  }, [serverPort, navigate, dispatch]);

  /*
   * ============================================================
   * LOAD PROFILE
   * ============================================================
   */

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const authStateCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('_auth_state='));

        if (!authStateCookie) {
          navigate('/login');
          return;
        }

        const IDCookie = getCookie('_auth');

        if (!IDCookie) {
          navigate('/login');
          return;
        }

        const token = authStateCookie.substring('_auth_state='.length);

        const profileResponse = await axios.get(`${serverPort}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            IDCookie: IDCookie,
          },
        });

        setNomeAgencia(profileResponse.data.nomeAgencia);
      } catch (error) {
        console.error('Error fetching profile data:', error);

        dispatch(
          setFlashMessage({
            message: 'Não foi possível carregar os dados do perfil.',
            messageType: 'error',
          })
        );

        navigate('/login');
      }
    };

    fetchProfileData();
  }, [navigate, serverPort, dispatch]);

  /*
   * ============================================================
   * LOAD REQUISITION INTO FORM
   * ============================================================
   */

  useEffect(() => {
    if (!RequisicaoData) {
      navigate('/requisicoes');
      return;
    }

    setNavioID(RequisicaoData.ID_Navio);

    /*
     * IMPORTANT FIX:
     *
     * Old:
     * setData(new Date(RequisicaoData.Data_requi));
     *
     * New:
     * parseLocalDate(...)
     *
     * This prevents the date from moving one day backwards.
     */
    const requisicaoDate = parseLocalDate(RequisicaoData.Data_requi);

    if (requisicaoDate) {
      setData(requisicaoDate);
    }

    setHora(normalizeTime(RequisicaoData.Hora_requi));
    setViagem(RequisicaoData.viagem || '');
    setServico(RequisicaoData.Requi_servico || '');
    setBerco(RequisicaoData.berco_requi || '');
    setPosicaoBerco(RequisicaoData.posicao_requi || '');
    setObs(RequisicaoData.Obs_requi || '');
    setFatu(RequisicaoData.Fatu_requi || '');
    setSelectedRebocador(RequisicaoData.rebocador_requi || '');
    setResponsavelNavio(RequisicaoData.responsavel_navio || '');
    setContatoResponsavel(RequisicaoData.contato_responsavel || '');

    if (restrictedServices.includes(RequisicaoData.Requi_servico)) {
      setShowField(false);
    } else {
      setShowField(true);
    }
  }, [RequisicaoData, navigate]);

  /*
   * ============================================================
   * SAVE / UPDATE REQUISITION
   * ============================================================
   */

  const handleSaveChanges = async () => {
    const ENABLE_THREE_HOUR_VALIDATION = false;
    if (isSaving) {
      return;
    }

    try {
      /*
       * --------------------------------------------------------
       * BASIC VALIDATION
       * --------------------------------------------------------
       */

      if (!RequisicaoData || !RequisicaoData.ID) {
        dispatch(
          setFlashMessage({
            message: 'Não foi possível identificar a requisição.',
            messageType: 'error',
          })
        );
        return;
      }

      if (!data || Number.isNaN(new Date(data).getTime())) {
        dispatch(
          setFlashMessage({
            message: 'Selecione uma data válida para a requisição.',
            messageType: 'error',
          })
        );
        return;
      }

      const normalizedHora = normalizeTime(hora);

      if (!normalizedHora) {
        dispatch(
          setFlashMessage({
            message: 'Informe um horário válido para a requisição.',
            messageType: 'error',
          })
        );
        return;
      }

      /*
       * --------------------------------------------------------
       * CREATE REQUEST DATE/TIME
       * --------------------------------------------------------
       */

      const dataHoraRequisicao = createRequestDateTime(
        data,
        normalizedHora
      );

      if (!dataHoraRequisicao) {
        dispatch(
          setFlashMessage({
            message:
              'Não foi possível determinar a data e o horário da requisição.',
            messageType: 'error',
          })
        );
        return;
      }

      /*
       * --------------------------------------------------------
       * 3-HOUR ADVANCE VALIDATION
       * --------------------------------------------------------
       *
       * The request must be at least 3 hours from NOW.
       *
       * Example:
       *
       * Current time: 20:31
       * Minimum:      23:31
       *
       * 23:30 -> rejected
       * 23:31 -> accepted
       *
       * Tomorrow at any reasonable time -> accepted.
       */

      
      const servicoNormalizado = String(servico || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

      const isDesatracacao = servicoNormalizado === 'DESATRACACAO';

      if (ENABLE_THREE_HOUR_VALIDATION && !isDesatracacao) {
        const agora = new Date();

        const limiteMinimo = new Date(
          agora.getTime() + 3 * 60 * 60 * 1000
        );

        if (
          dataHoraRequisicao.getTime() < limiteMinimo.getTime()
        ) {
          dispatch(
            setFlashMessage({
              message:
                'A requisição deve ser feita com pelo menos 3 horas de antecedência. Escolha um horário posterior.',
              messageType: 'error',
            })
          );

          return;
        }
      }


      /*
       * --------------------------------------------------------
       * AUTHENTICATION
       * --------------------------------------------------------
       */

      const IDCookie = getCookie('_auth');

      const authStateCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('_auth_state='));

      if (!IDCookie || !authStateCookie) {
        navigate('/login');
        return;
      }

      const token = authStateCookie.substring('_auth_state='.length);

      /*
       * --------------------------------------------------------
       * IMPORTANT DATE FIX
       * --------------------------------------------------------
       *
       * NEVER use:
       *
       * data.toISOString().split('T')[0]
       *
       * here.
       *
       * That converts the local date to UTC and can move it
       * backwards one day in Brazil.
       */

      const dateString = formatDate(data);

      if (!dateString) {
        dispatch(
          setFlashMessage({
            message: 'A data selecionada é inválida.',
            messageType: 'error',
          })
        );
        return;
      }

      /*
       * --------------------------------------------------------
       * REQUEST BODY
       * --------------------------------------------------------
       */

      const requestData = {
        ID_Navio: navioID,
        Data_requi: dateString,
        Hora_requi: normalizedHora,
        viagem: viagem,
        Requi_servico: servico,
        berco_requi: berco,
        posicao_requi: posicaoBerco,
        Obs_requi: obs,
        Fatu_requi: fatu,
        selectedRebocador: selectedRebocador,
        isLancha: !showField,
        responsavelNavio: responsavelNavio,
        contatoResponsavel: contatoResponsavel,
      };

      /*
       * --------------------------------------------------------
       * SEND UPDATE
       * --------------------------------------------------------
       */

      setIsSaving(true);

      const response = await axios.put(
        `${serverPort}/requisicoes/${RequisicaoData.ID}`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            IDCookie: IDCookie,
          },
        }
      );

      /*
       * Axios normally treats 2xx as success and rejects
       * non-2xx responses.
       *
       * This additional check makes the behavior explicit.
       */

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `Unexpected response status: ${response.status}`
        );
      }

      console.log('Requisicao updated successfully!', response.data);

      dispatch(
        setFlashMessage({
          message: 'Requisição Atualizada com sucesso!',
          messageType: 'success',
        })
      );

      /*
       * Navigate only AFTER the update has succeeded.
       */
      navigate('/requisicoes');
    } catch (error) {
      console.error('Error updating requisicao:', error);

      let errorMessage =
        'Não foi possível atualizar a requisição. Tente novamente.';

      /*
       * If the backend returned an error message, show it.
       */
      if (error.response) {
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          }
        }

        console.error(
          'Server response:',
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        errorMessage =
          'Não foi possível comunicar com o servidor. Verifique sua conexão e tente novamente.';
      }

      dispatch(
        setFlashMessage({
          message: errorMessage,
          messageType: 'error',
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  /*
   * ============================================================
   * DELETE REQUISITION
   * ============================================================
   */

  const handleDeleteRequisicao = async () => {
    const confirmed = window.confirm(
      'Você tem certeza que deseja cancelar essa Requisição?'
    );

    if (!confirmed) {
      console.log('Deletion cancelled');
      return;
    }

    try {
      if (!RequisicaoData || !RequisicaoData.ID) {
        dispatch(
          setFlashMessage({
            message: 'Não foi possível identificar a requisição.',
            messageType: 'error',
          })
        );
        return;
      }

      const authStateCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('_auth_state='));

      if (!authStateCookie) {
        navigate('/login');
        return;
      }

      const IDCookie = getCookie('_auth');

      if (!IDCookie) {
        navigate('/login');
        return;
      }

      const token = authStateCookie.substring('_auth_state='.length);

      const requestOptions = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          IDCookie: IDCookie,
        },
      };

      const response = await fetch(
        `${serverPort}/requisicoes/${RequisicaoData.ID}`,
        requestOptions
      );

      if (!response.ok) {
        let errorMessage =
          'Erro, não foi possível cancelar a Requisição.';

        try {
          const responseData = await response.json();

          if (responseData?.message) {
            errorMessage = responseData.message;
          } else if (responseData?.error) {
            errorMessage = responseData.error;
          }
        } catch (parseError) {
          // Response was not JSON.
        }

        console.error(
          'Error deleting requisicao:',
          response.status
        );

        dispatch(
          setFlashMessage({
            message: errorMessage,
            messageType: 'error',
          })
        );

        return;
      }

      console.log('Requisicao deleted successfully');

      dispatch(
        setFlashMessage({
          message: 'Requisição cancelada!',
          messageType: 'success',
        })
      );

      navigate('/requisicoes');
    } catch (error) {
      console.error('Error deleting requisicao:', error);

      dispatch(
        setFlashMessage({
          message:
            'Não foi possível cancelar a Requisição. Verifique sua conexão e tente novamente.',
          messageType: 'error',
        })
      );
    }
  };

  /*
   * ============================================================
   * DOWNLOAD PDF
   * ============================================================
   */

  const handleDownload = async () => {
    try {
      /*
       * IMPORTANT:
       * Use local date formatting instead of toISOString().
       */
      const dateString = formatDate(data);

      const selectedNavio = naviosList.find(
        (navio) => navio.ID === navioID
      );

      if (!selectedNavio) {
        dispatch(
          setFlashMessage({
            message:
              'Não foi possível encontrar os dados do navio para gerar o PDF.',
            messageType: 'error',
          })
        );
        return;
      }

      let formattedData = '';

      formattedData += ` ${nomeAgencia.toUpperCase()} \n\n`;

      if (servico === 'TROCA' || servico === 'PUXADA') {
        formattedData +=
          `Sem a utilização dos serviços de lancha \n`;
      }

      formattedData += `Navio: ${selectedNavio.Navio}\n`;
      formattedData += `Data: ${dateString} ${hora}\n`;

      if (servico === 'ATRACACAO') {
        formattedData += `Serviço: ATRACAÇÃO \n`;
      }

      if (servico === 'DESATRACACAO') {
        formattedData += `Serviço: DESATRACAÇÃO \n`;
      }

      if (servico === 'REATRACACAO') {
        formattedData += `Serviço: REATRACAÇÃO \n`;
      }

      if (servico === 'DESATRACACAOF') {
        formattedData +=
          `Serviço: DESATRACAÇÃO FUNDEIO \n`;
      }

      if (servico === 'FUNDEIO_INTERNO') {
        formattedData += `Serviço: FUNDEIO INTERNO \n`;
      }

      if (servico === 'TROCA') {
        formattedData += `TROCA DE BERÇO \n`;
      }

      if (servico === 'LEITURA_DE_CALADO') {
        formattedData += `LEITURA DE CALADO \n`;
      }

      if (servico === 'TRANSPORTE_DE_ENFERMOS') {
        formattedData += `TRANSPORTE DE ENFÊRMOS \n`;
      }

      if (servico === 'TRANSPORTE_DE_SUPRIMENTOS') {
        formattedData +=
          `TRANSPORTE DE SUPRIMENTOS \n`;
      }

      if (servico === 'TRANSPORTE_DE_OBITOS') {
        formattedData += `TRANSPORTE DE ÓBITOS \n`;
      }

      if (servico === 'TRANSPORTE_DE_PASSAGEIROS') {
        formattedData +=
          `TRANSPORTE DE PASSAGEIROS \n`;
      }

      if (servico === 'VISTORIA_DE_CASCO') {
        formattedData += `VISTORIA DE CASCO \n`;
      }

      formattedData += `Berço: ${berco}\n`;
      formattedData += `Posição: ${posicaoBerco}\n`;

      formattedData += `\nResponsável pelo Navio\n`;
      formattedData += ` Nome: ${responsavelNavio}\n`;
      formattedData += ` Celular: ${contatoResponsavel}\n\n`;

      formattedData += `IMO: ${selectedNavio.IMO}\n`;
      formattedData += `Bandeira: ${selectedNavio.Bandeira}\n`;
      formattedData += `Armador: ${selectedNavio.armador}\n`;
      formattedData += `Carga: ${selectedNavio.Carga}\n`;
      formattedData += `GROSS: ${selectedNavio.GRT}\n`;
      formattedData += `DWT: ${selectedNavio.DWT}\n`;
      formattedData += `LOA: ${selectedNavio.LOA}\n`;

      if (
        servico === 'DESATRACACAO' ||
        servico === 'DESATRACACAOF'
      ) {
        formattedData +=
          `Calado Saída: FWD:${selectedNavio.CS_proa}m AFT:${selectedNavio.CS_popa}m \n`;
      } else {
        formattedData +=
          `Calado Entrada: FWD:${selectedNavio.C_proa}m AFT:${selectedNavio.C_popa}m \n`;
      }

      formattedData += `Faturamento: ${fatu}\n`;
      formattedData += `OBS: ${obs}\n`;
      formattedData += `Rebocador: ${selectedRebocador}`;

      const fileName = `Requisicao ${dateString}`;

      const doc = new jsPDF();

      doc.text(formattedData, 10, 10);

      doc.save(`${fileName}.pdf`);

      /*
       * Kept from your original code in case you want it later:
       *
       * const blob = new Blob(
       *   [formattedData],
       *   { type: 'text/plain' }
       * );
       *
       * saveAs(blob, `${fileName}.txt`);
       */
    } catch (error) {
      console.error('Error generating PDF:', error);

      dispatch(
        setFlashMessage({
          message:
            'Não foi possível gerar o PDF da requisição.',
          messageType: 'error',
        })
      );
    }
  };

  /*
   * ============================================================
   * KEEP YOUR EXISTING JSX / RETURN HERE
   * ============================================================
   *
   * The uploaded file did not contain the return (...) section.
   *
   * Your existing JSX should continue to call:
   *
   *   handleSaveChanges
   *   handleDeleteRequisicao
   *   handleDownload
   *
   * The Save button can optionally use:
   *
   *   disabled={isSaving}
   *
   * and display:
   *
   *   {isSaving ? 'Salvando...' : 'Salvar'}
   *
   * ============================================================
   */

  // KEEP YOUR EXISTING RETURN (...) SECTION HERE
  return (
    <div style={{ paddingBottom: '100px' }}>
      <h1 className="title">Atualizar Requisição</h1>
      {flashMessage && (
  <div
    className={`flash-message ${flashMessageType || 'error'}`}
    role="alert"
    style={{
      padding: '12px 16px',
      margin: '12px 0',
      border: '1px solid #dc3545',
      borderRadius: '5px',
      color: '#b02a37',
      backgroundColor: '#f8d7da',
    }}
  >
    {flashMessage}
  </div>
)}
      
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
          <input className="input" type="date" value={formatDate(data)} onChange={(e) => setData(parseLocalDate(e.target.value))} min={formatDate(new Date())} />
  
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
