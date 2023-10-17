import React, { useState, useEffect } from 'react';
import './NavioFilter.css';

function NavioFilter({ navios, agencias, onNavioSelect, onClose }) {
  const [navioFilter, setNavioFilter] = useState('');
  const [imoFilter, setImoFilter] = useState('');
  const [agenciaFilter, setAgenciaFilter] = useState('');

  // Initially, set filteredNavios to all navios
  const [filteredNavios, setFilteredNavios] = useState(navios);

  // Use useEffect to handle filtering
  useEffect(() => {
    // Filter the navios based on the filter criteria
    const filtered = navios.filter((navio) => {
      const match =
        (navio.Navio && navio.Navio.toLowerCase().includes(navioFilter.toLowerCase())) &&
        (navio.IMO && navio.IMO.toLowerCase().includes(imoFilter.toLowerCase())) &&
        (!agenciaFilter || (navio.ID_agencia && navio.ID_agencia === parseInt(agenciaFilter, 10)));
    
      return match;
    });

    // Update the filteredNavios state
    setFilteredNavios(filtered);
  }, [navios, navioFilter, imoFilter, agenciaFilter]);

  const handleClick = (selectedNavio) => {
    onNavioSelect(selectedNavio);
  };

    // When the close button is clicked, call the onClose callback to hide the component
    const handleClose = () => {
      onClose();
    };

  return (
    <div className='overlay'>
        <div className="navio-filter-container">
          <div className="navio-filter-header">
            <h3>Filtrar Navios</h3>
            <button className="close-button" onClick={onClose}>
              &times;
            </button>
          </div>
          <div className="navio-filter-inputs">
            <input
              type="text"
              placeholder="Procurar por Nome do Navio"
              value={navioFilter}
              onChange={(e) => setNavioFilter(e.target.value)}
            />
            <input
              type="text"
              placeholder="Procurar pelo IMO"
              value={imoFilter}
              onChange={(e) => setImoFilter(e.target.value)}
            />
            <select
              value={agenciaFilter}
              onChange={(e) => setAgenciaFilter(e.target.value)}
            >
              <option value="">Selecionar Agência</option>
              {agencias.map((agencia) => (
                <option key={agencia.ID} value={agencia.ID}>
                  {agencia.nome_agencia}
                </option>
              ))}
            </select>
          </div>
          <div className="navio-table-container">
            <table className="navio-filter-table">
            <thead>
              <tr>
                <th colSpan="1">Navio</th>
                <th colSpan="1">Agência</th>
                <th colSpan="1">IMO</th>
              </tr>
            </thead>
              <tbody>
                {filteredNavios.map((navio) => (
                  <tr
                    key={navio.ID}
                    onClick={() => handleClick(navio)}
                  >
                    <td className='navio-cell'>{navio.Navio}</td>
                    <td> {agencias.find((agencia) => agencia.ID === navio.ID_agencia)?.nome_agencia || ''} </td>
                    <td>{navio.IMO}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}

export default NavioFilter;
