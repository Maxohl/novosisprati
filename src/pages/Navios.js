import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Navios.css';
import NaviosForm from '../Components/NaviosForm';

import { useDispatch, useSelector } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';  

const Navios = ({ serverPort }) => {
  const [navios, setNavios] = useState([]);
  const [selectedNavio, setSelectedNavio] = useState('');
  const [shipNames, setShipNames] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [IDCookie, setIDCookie] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
  const flashMessageType = useSelector((state) => state.flashMessage.flashMessageType);

  const fetchNavios = useCallback(async () => {
    try {
      const authStateCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('_auth_state'));
      if (!authStateCookie) {
        navigate('/login');
        return;
      }

      const rawIDCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('_auth='));
      const IDCookie = rawIDCookie?.split('=')[1];

      if (!IDCookie) {
        console.warn('No IDCookie found');
        navigate('/login');
        return;
}

      setIDCookie(IDCookie);

      const token = authStateCookie.split('=')[1];

      const response = await axios.get(`${serverPort}/navios`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'IDCookie': IDCookie,
        },
      });
      const { data } = response;
      setNavios(data);
      // Store the ship names in the shipNames state variable
      const names = data.map((navio) => navio.Navio);
      setShipNames(names);
    } catch (error) {
      console.error('Error fetching navios:', error);
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
      
    }
  }, [serverPort, navigate]);

  useEffect(() => {
    const flashTimeout = setTimeout(() => {
      dispatch(setFlashMessage(''));
    }, 3000);

    
    fetchNavios();
    if (formSubmitted) {
      setFormSubmitted(false); // Reset the formSubmitted state to false
    }
    return () => clearTimeout(flashTimeout);
  }, [fetchNavios, dispatch, formSubmitted]);

  const handleNavioSelect = useCallback((event) => {
    const selectedNavio = event.target.value;
    setSelectedNavio(selectedNavio);
    const selectedNavioId = navios.find((navio) => navio.Navio === selectedNavio)?.ID;
    console.log('Selected Navio ID:', selectedNavioId);
    
    if (selectedNavioId) {
      const selectedNavioInfo = navios.find((navio) => navio.ID === selectedNavioId);
      navigate(`/navios/${selectedNavioId}`, { state: { navioInfo: selectedNavioInfo, serverPort: serverPort }, });
    }
  }, [navios, navigate, serverPort]);
  
  

  const handleAdicionarNavio = () => {
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    console.log('flashMessageType :',flashMessageType);
    setRegistrationSuccess(false);
  };

  const handleFormSubmit = (flashMessage, flashMessageType) => {
    //setFlashMessage(flashMessage);
    dispatch(setFlashMessage({ message: flashMessage, messageType: flashMessageType })); // Dispatch the action to update the flash message in the Redux store
    setRegistrationSuccess(true); // Update the registrationSuccess state to true
    setFormSubmitted(true); // Set the formSubmitted state to true after a successful form submission

    setTimeout(() => {
      dispatch(setFlashMessage('', ''));
      setShowForm(false); // Hide the form after successful submission
      setRegistrationSuccess(false); // Reset the registrationSuccess state
    }, 3000); // Clear the flash message after 3 seconds
  };

  const handleNameExists = () => {
    dispatch(setFlashMessage({ message: 'Navio já existe', messageType: 'error' })); 
    setShowForm(true);
    setTimeout(() => {
      dispatch(setFlashMessage('', ''));
    }, 3000); // Clear the flash message after 3 seconds
  };
  

  return (
    <div className="Navioscontainer"> 
      <h1 className="Naviostitle">Navios</h1>
      {flashMessage && (
        <div className={`flash-message ${flashMessageType === 'success' ? 'success' : 'error'}`}>
          {flashMessage}
        </div>
      )}
      <div className="Naviosselect-container">
        <select className="Naviosselect" value={selectedNavio} onChange={handleNavioSelect}>
          <option value="">Escolha um Navio</option>
          {navios.map((navio) => (
            <option key={navio.ID} value={navio.Navio}>
              {navio.Navio}
            </option>
          ))}
        </select>
        <button className="Naviosbutton" onClick={handleAdicionarNavio}>
          Adicionar Navio
        </button>
      </div>
      {showForm && !registrationSuccess && (
        <NaviosForm
          IDCookie={IDCookie}
          serverPort={serverPort}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          onFormSubmit={() => setFormSubmitted(true)}
          onNameExists={handleNameExists}
          shipNames={shipNames} // Pass the shipNames prop
        />
      )}

    </div>
  );
};

export default Navios;
