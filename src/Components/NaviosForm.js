
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './NaviosForm.css';

import { useDispatch } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';

const NaviosForm = (props) => {
  const dispatch = useDispatch();
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


  const handleInputChange = (event) => {
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
        [name]: value.toUpperCase(),
      }));
    }
  };

  const handleFormClose = () => {
    props.onClose(); // Call the onClose function from props
  };

  const handleFormSubmit  = async (e) => {
    e.preventDefault();

    try{
    console.log('Ship Names:', props.shipNames);
    // Check if the name already exists in the select options
    const nameExists = props.shipNames.includes(navioData.Navio);

    console.log('Name exists:', nameExists);
    
    if (nameExists) {
      console.log('Name exists:', nameExists); // Log if the name already exists
      props.onNameExists();
      return;
    }

    const formattedNavioData = {
      ...navioData,
      ETA_Data: formatDate(navioData.ETA_Data),
      ETB_Data: formatDate(navioData.ETB_Data),
      ETS_Data: formatDate(navioData.ETS_Data),
    };

    const formattedTimeNavioData = {
      ...formattedNavioData,
      ETA_Time: formatTime(navioData.ETA_Time),
      ETB_Time: formatTime(navioData.ETB_Time),
      ETS_Time: formatTime(navioData.ETS_Time),
    };

    console.log(formattedTimeNavioData);

    const authStateCookie = document.cookie.split('; ').find((row) => row.startsWith('_auth_state'));

    const token = authStateCookie.split('=')[1];

    const response = await axios.post(`${props.serverPort}/navios`,formattedTimeNavioData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'IDCookie': props.IDCookie,
      },
    });

    setNavioData({
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
    console.log('Response:', response.data);
    props.onSubmit('Navio adicionado com sucesso!','success');
    props.onFormSubmit();
    } catch (error) {
    console.error('Error adding navio:', error);
    dispatch(setFlashMessage('Erro ao adicionar navio', 'error'));
    // Handle the error or update the UI accordingly
  }
  };

  const formatDate = (date) => {
    const [year, month, day] = date.split('-');
    return `${year}/${month}/${day}`;
  };

  const formatTime = (time) => {
    const [hour, minute] = time.split(':');
    return `${hour}:${minute}:00`;
  };

  return (
    <form className="NaviosForm" onSubmit={handleFormSubmit}>
      <label>
        Nome do Navio:
        <input
          type="text"
          name="Navio"
          value={navioData.Navio}
          onChange={handleInputChange}
          placeholder="Navio"
          required
        />
      </label>
      <label>
        Bandeira:
        <input
          type="text"
          name="Bandeira"
          value={navioData.Bandeira}
          onChange={handleInputChange}
          placeholder="Bandeira"
          required
        />
      </label>
      <label>
        IMO:
        <input
          type="number"
          name="IMO"
          value={navioData.IMO}
          onChange={handleInputChange}
          placeholder="IMO"
          required
        />
      </label>
      <label>
        Viagem:
        <input
          type="number"
          name="Viagem"
          value={navioData.Viagem}
          onChange={handleInputChange}
          placeholder="Viagem"
          required
        />
      </label>
      <label>
        GRT:
        <input
          type="number"
          name="GRT"
          value={navioData.GRT}
          onChange={handleInputChange}
          placeholder="GRT"
          required
        />
      </label>
      <label>
        DWT:
        <input
          type="number"
          name="DWT"
          value={navioData.DWT}
          onChange={handleInputChange}
          placeholder="DWT"
          required
        />
      </label>
      <label>
        LOA:
        <input
          type="number"
          name="LOA"
          value={navioData.LOA}
          onChange={handleInputChange}
          placeholder="LOA"
          step="0.01"
          required
        />
      </label>
      <label>
        Calado proa:
        <input
          type="number"
          name="C_proa"
          value={navioData.C_proa}
          onChange={handleInputChange}
          placeholder="Calado proa"
          step="0.01"
          required
        />
      </label>
      <label>
        Calado popa:
        <input
          type="number"
          name="C_popa"
          value={navioData.C_popa}
          onChange={handleInputChange}
          placeholder="Calado popa"
          step="0.01"
          required
        />
      </label>
      <label>
        Calado saida proa:
        <input
          type="number"
          name="CS_proa"
          value={navioData.CS_proa}
          onChange={handleInputChange}
          placeholder="Calado saida proa"
          step="0.01"
        />
      </label>
      <label>
        Calado saida popa:
        <input
          type="number"
          name="CS_popa"
          value={navioData.CS_popa}
          onChange={handleInputChange}
          placeholder="Calado saida popa"
          step="0.01"
        />
      </label>
      <label>
        Armador:
        <input
          type="text"
          name="armador"
          value={navioData.armador}
          onChange={handleInputChange}
          placeholder="Armador"
          required
        />
      </label>
      <label>
        Berço:
        <input
          type="number"
          name="berco"
          value={navioData.berco}
          onChange={handleInputChange}
          placeholder="Berço"
          min="1"
          max="3"
          required
        />
      </label>
      <label>
        Posição:
        <input
          type="text"
          name="posicao"
          value={navioData.posicao}
          onChange={handleInputChange}
          placeholder="Posição"
          required
        />
      </label>
      <label>
        ETA (Data):
        <input
          type="date"
          name="ETA_Data"
          value={navioData.ETA_Data}
          onChange={handleInputChange}
          required
        />
      </label>
      <label>
        ETA (Hora):
        <input
          type="time"
          name="ETA_Time"
          value={navioData.ETA_Time}
          onChange={handleInputChange}
          required
        />
      </label>
      <label>
        ETB (Data):
        <input
          type="date"
          name="ETB_Data"
          value={navioData.ETB_Data}
          onChange={handleInputChange}
          required
        />
      </label>
      <label>
        ETB (Hora):
        <input
          type="time"
          name="ETB_Time"
          value={navioData.ETB_Time}
          onChange={handleInputChange}
          required
        />
      </label>
      <label>
        ETS (Data):
        <input
          type="date"
          name="ETS_Data"
          value={navioData.ETS_Data}
          onChange={handleInputChange}
          required
        />
      </label>
      <label>
        ETS (Hora):
        <input
          type="time"
          name="ETS_Time"
          value={navioData.ETS_Time}
          onChange={handleInputChange}
          required
        />
      </label>
      <label>
        Situação:
        < br />
        <select
          name="situacao"
          value={navioData.situacao}
          onChange={handleInputChange}
          required
        >
          <option value="">Escolha uma situação</option>
          <option value="ATRACADO">ATRACADO</option>
          <option value="ESPERADO">ESPERADO</option>
          <option value="FUNDEADO">FUNDEADO</option>
        </select>
      </label>
      <label>
        Carga:
        <input
          type="text"
          name="Carga"
          value={navioData.Carga}
          onChange={handleInputChange}
          placeholder="Carga"
          required
        />
      </label>
      <label className='labelObs'>
        Observações:
        <textarea
          name="Obs"
          value={navioData.Obs}
          onChange={handleInputChange}
          placeholder="Observações"
        />
      </label>
      <div className="NaviosForm__submit-button">
        <button type="submit" className="submit-button">
          Salvar
        </button>
        <button type="button" className="cancel-button" onClick={handleFormClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
  
};

export default NaviosForm;