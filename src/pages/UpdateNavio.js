import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './UpdateNavio.css';

import { useDispatch, useSelector } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';

const UpdateNavio = ({ serverPort }) => {
  const location = useLocation();
  const navioInfo = location.state?.navioInfo;
  const navigate = useNavigate();
  const [IDCookie, setIDCookie] = useState('');
  const dispatch = useDispatch();

  const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
  const flashMessageType = useSelector((state) => state.flashMessage.flashMessageType);

  const formatDate = (date) => {
    if (!date) return '';
    const formattedDate = new Date(date);
    const timezoneOffset = formattedDate.getTimezoneOffset() * 60000; // Convert minutes to milliseconds
    const adjustedDate = new Date(formattedDate.getTime() + timezoneOffset);
    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getDate()).padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  };
  

  const formatTime = (time) => {
    const [hour, minute] = time.split(':');
    return `${hour}:${minute}:00`;
  };


  const [navioData, setNavioData] = useState({
    Navio: '',
    Bandeira: '',
    IMO: '',
    Viagem: '',
    GRT: '',
    DWT: '',
    LOA: '',
    C_proa: '',
    C_popa: '',
    CS_proa: '',
    CS_popa: '',
    armador: '',
    berco: '',
    posicao: '',
    ETA_Data: '',
    ETA_Time: '',
    ETB_Data: '',
    ETB_Time: '',
    ETS_Data: '',
    ETS_Time: '',
    situacao: '',
    Carga: '',
    Obs: '',
  });

  useEffect(() => {
    const flashTimeout = setTimeout(() => {
      dispatch(setFlashMessage('', ''));
    }, 3000);
  
    if (!navioInfo) {
      navigate('/navios');
    } else {
      // Update the navioData state with formatted dates
      setNavioData((prevNavioData) => ({
        ...prevNavioData,
        ...navioInfo, // Set the existing navioInfo values to navioData
        ETA_Data: formatDate(navioInfo.ETA_Data),
        ETB_Data: formatDate(navioInfo.ETB_Data),
        ETS_Data: formatDate(navioInfo.ETS_Data),
      }));
    }
  
    return () => clearTimeout(flashTimeout);
  }, [navioInfo, navigate, dispatch]);
  

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name.endsWith('Date') || name.endsWith('Time')) {
      const fieldName = name.slice(0, -4);
      const fieldDate = `${fieldName}Date`;
      const fieldTime = `${fieldName}Time`;

      setNavioData((prevData) => ({
        ...prevData,
        [fieldDate]: name.endsWith('Date') ? value : prevData[fieldDate],
        [fieldTime]: name.endsWith('Time') ? value : prevData[fieldTime],
      }));
    } else {
      setNavioData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };



  const handleSaveChanges = () => {
    if (!navioData.Navio) {
      dispatch(setFlashMessage({ message: 'Navio não pode ser Vazio!', messageType: 'error' }));
      const flashTimeout = setTimeout(() => {
        dispatch(setFlashMessage('',''));
      }, 3000);
      return() => clearTimeout(flashTimeout);
    }

    const authStateCookie = document.cookie.split('; ').find((row) => row.startsWith('_auth_state'));
    if (!authStateCookie) {
      navigate('/login');
      return;
    }

    const IDCookie = document.cookie.split(';').find((row) => row.startsWith('_auth')).split('=')[1];

    setIDCookie(IDCookie);

    const token = authStateCookie.split('=')[1];
    const { ID } = navioData;
    const url = `${serverPort}/navios/${ID}`;

    const formattedNavioInfo = {
      ...navioData,
      ETA_Data: formatDate(navioData.ETA_Data),
      ETB_Data: formatDate(navioData.ETB_Data),
      ETS_Data: formatDate(navioData.ETS_Data),
    };

    const formattedTimeNavioInfo = {
      ...formattedNavioInfo,
      ETA_Time: formatTime(navioData.ETA_Time),
      ETB_Time: formatTime(navioData.ETB_Time),
      ETS_Time: formatTime(navioData.ETS_Time),
    };

    console.log('updated Data: ', formattedTimeNavioInfo);
    fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        IDCookie: IDCookie,
      },
      body: JSON.stringify(formattedTimeNavioInfo),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Navio updated successfully!', data);
        const flash = data.success;
        dispatch(setFlashMessage({ message: flash, messageType: 'success' }));
        navigate('/navios');
      })
      .catch((error) => {
        console.error('Error updating Navio:', error);
      });
  };

  const handleDeleteNavio = () => {
    const confirmed = window.confirm('Voçê tem certeza que deseja deletar esse navio?');
    if (confirmed) {
      //set configs and tokens
      const authStateCookie = document.cookie.split('; ').find((row) => row.startsWith('_auth_state'));
      const { ID } = navioData;
      if (!authStateCookie) {
        navigate('/login');
        return;
      }
      const IDCookie = document.cookie.split(';').find((row) => row.startsWith('_auth')).split('=')[1];

      setIDCookie(IDCookie);    
  
      const token = authStateCookie.split('=')[1];

      const requestOptions = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          IDCookie: IDCookie,
        },
      };
      // Perform delete navio logic here
      console.log('Delete navio :', navioData.Navio);
      fetch(`${serverPort}/navios/${ID}`, requestOptions)
      .then((response) => {
        if (response.ok) {
          // Navio successfully deleted
          
          dispatch(setFlashMessage({ message: 'Navio deletado com sucesso!', messageType: 'success' }));
          console.log('Navio deleted successfully');
          navigate('/navios');
          // Add any additional logic or state update here
        } else {
          // Error deleting navio
          console.error('Error deleting navio:', response.status);
          dispatch(setFlashMessage({ message: 'Error, não foi possivel deletar o Navio.', messageType: 'error' }));
          // Handle the error or show an error message to the user
        }
      })
      .catch((error) => {
        console.error('Error deleting navio:', error);
        // Handle the error or show an error message to the user
      });
    } else {
      console.log('Deletion cancelled');
    }
  };
  

  if (!navioInfo) {
    return null;
  }

  return (
    <form className="form-container">
      <h1 className="navio-title">Atualizar Navio</h1>
      {flashMessage && (
        <div className={`flash-message ${flashMessageType === 'success' ? 'success' : 'error'}`}>
          {flashMessage}
        </div>
      )}
      <div className="navio-container">  
        <label className="form-label">
          Navio:
          <input type="text" name="Navio" value={navioData.Navio} onChange={handleChange} required />
        </label>
        <label className="form-label">
          Bandeira:
          <input type="text" name="Bandeira" value={navioData.Bandeira} onChange={handleChange} />
        </label>
        <label className="form-label">
          IMO:
          <input type="number" name="IMO" value={navioData.IMO} onChange={handleChange} />
        </label>
        <label className="form-label">
          Viagem:
          <input type="number" name="Viagem" value={navioData.Viagem} onChange={handleChange} />
        </label>
        <label className="form-label">
          GRT:
          <input type="number" name="GRT" value={navioData.GRT} onChange={handleChange} />
        </label>
        <label className="form-label">
          DWT:
          <input type="number" name="DWT" value={navioData.DWT} onChange={handleChange} />
        </label>
        <label className="form-label">
          LOA:
          <input type="number" name="LOA" value={navioData.LOA} onChange={handleChange} />
        </label>
        <label className="form-label">
          Calado proa:
          <input type="number" name="C_proa" value={navioData.C_proa} onChange={handleChange} />
        </label>
        <label className="form-label">
          Calado popa:
          <input type="number" name="C_popa" value={navioData.C_popa} onChange={handleChange} />
        </label>
        <label className="form-label">
          Calado saida proa:
          <input type="number" name="CS_proa" value={navioData.CS_proa} onChange={handleChange} />
        </label>
        <label className="form-label">
          Calado saida popa:
          <input type="number" name="CS_popa" value={navioData.CS_popa} onChange={handleChange} />
        </label>
        <label className="form-label">
          Armador:
          <input type="text" name="armador" value={navioData.armador} onChange={handleChange} />
        </label>
        <label className="form-label">
          Berço:
          <input
            type="number"
            name="berco"
            value={navioData.berco}
            min="1"
            max="3"
            onChange={handleChange}
          />
        </label>
        <label className="form-label">
          Posição:
          <input type="text" name="posicao" value={navioData.posicao} onChange={handleChange} />
        </label>
        <label className="form-label">
          ETA (Data):
          <input
            type="date"
            name="ETA_Data"
            value={navioData.ETA_Data}
            onChange={handleChange}
          />
        </label>
        <label className="form-label">
          ETA (Hora):
          <input type="time" name="ETA_Time" value={navioData.ETA_Time} onChange={handleChange} />
        </label>
        <label className="form-label">
          ETB (Data):
          <input
            type="date"
            name="ETB_Data"
            value={navioData.ETB_Data}
            onChange={handleChange}
          />
        </label>
        <label className="form-label">
          ETB (Hora):
          <input type="time" name="ETB_Time" value={navioData.ETB_Time} onChange={handleChange} />
        </label>
        <label className="form-label">
          ETS (Data):
          <input
            type="date"
            name="ETS_Data"
            value={navioData.ETS_Data}
            onChange={handleChange}
          />
        </label>
        <label className="form-label">
          ETS (Hora):
          <input type="time" name="ETS_Time" value={navioData.ETS_Time} onChange={handleChange} />
        </label>
        <label className="form-label">
          Situação:
          <input type="text" name="situacao" value={navioData.situacao} onChange={handleChange} />
        </label>
        <label className="form-label">
          Carga:
          <input type="text" name="Carga" value={navioData.Carga} onChange={handleChange} />
        </label>
        <div className="textarea-container">
          <label className="form-label">
            Obs:
            <textarea name="Obs" value={navioData.Obs} onChange={handleChange} />
          </label>
        </div>
      </div>
      <div className="buttons-container">
        <button
          type="button"
          className="save-button"
          onClick={handleSaveChanges}
        >
          Salvar Alterações
        </button>
        <button type="button" className="delete-button" onClick={handleDeleteNavio}>
          Deletar Navio
        </button>
      </div>
    </form>
  );
};

export default UpdateNavio;
