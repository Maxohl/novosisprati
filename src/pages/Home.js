import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Home.css';
import { useSelector, useDispatch } from 'react-redux';
import { setFlashMessage } from '../Reducers/actions';

function Home(props) {
  const { serverPort } = props;
  const [requisicoes, setRequisicoes] = useState([]);
  const [condicionado, setCondicionado] = useState([]);
  const flashMessage = useSelector((state) => state.flashMessage.flashMessage);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchRequisicoes = async () => {
      try {
        const response = await axios.get(`${serverPort}/requisicoes-current-date`);
        const { data } = response;
        setRequisicoes(data);
      } catch (error) {
        console.error('Error fetching requisicoes:', error);
      }
    };

    const fetchCondicionado = async () => {
      try {
        const response = await axios.get(`${serverPort}/condicionado-current-date`);
        const { data } = response;
        setCondicionado(data);
      } catch (error) {
        console.error('Error fetching condicionado:', error);
      }
    };

    fetchRequisicoes();
    fetchCondicionado();
  }, [serverPort]);

  useEffect(() => {
    const flashTimeout = setTimeout(() => {
      dispatch(setFlashMessage(''));
    }, 3000);

    return () => clearTimeout(flashTimeout);
  }, [dispatch]);

  const serviceMapping = {
    'ATRACACAO': 'ATRACAÇÃO',
    'DESATRACACAO': 'DESATRACAÇÃO',
    'REATRACACAO': 'REATRACAÇÃO',
    'DESATRACACAOF': 'DESATRACAÇÃO FUNDEIO',
    'FUNDEIO_INTERNO': 'FUNDEIO INTERNO',
    'TROCA': 'TROCA DE BERÇO',
    'LEITURA_DE_CALADO': 'LEITURA DE CALADO',
    'TRANSPORTE_DE_ENFERMOS': 'TRANSPORTE DE ENFERMOS',
    'TRANSPORTE_DE_MANTIMENTOS': 'TRANSPORTE DE MANTIMENTOS',
    'TRANSPORTE_DE_OBITOS': 'TRANSPORTE DE ÓBITOS',
    'TRANSPORTE_DE_PASSAGEIROS': 'TRANSPORTE DE PASSAGEIROS',
    'VISTORIA_DE_CASCO': 'VISTORIA DE CASCO'
  };
  
  const renderRequiServico = (requiServico) => {
    return serviceMapping[requiServico] || requiServico;
  };

  const formatDateString = (dateString) => {
    const options = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC', // Set the expected timezone (UTC)
    };
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', options).format(date);
  };

  const requisicoesWithBerco = requisicoes.filter(requisicao => requisicao.berco_requi);
  const requisicoesWithoutBerco = requisicoes.filter(requisicao => !requisicao.berco_requi);

  return (
    <div className="Homecontainer">
      {flashMessage && <div className="flash-message">{flashMessage}</div>}
      <div>
        <h1 className="Homeheading">Pagina Inicial</h1>

        <div>
          <h2 className="TableTitle">Requisições do dia</h2>
          <table className="HomeTable">
            <thead>
              <tr>
                <th>Navio</th>
                <th>Serviço</th>
                <th>Horário</th>
              </tr>
            </thead>
            <tbody>
              {requisicoesWithBerco.map((requisicao) => (
                <tr key={requisicao.ID}>
                  <td>{requisicao.Navio}</td>
                  <td>{renderRequiServico(requisicao.Requi_servico)}</td>
                  <td>{requisicao.Hora_requi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="TableTitle">Requisições Condicionadas</h2>
          <table className="HomeTable">
            <thead>
              <tr>
                <th>Navio</th>
                <th>Condicionado ao</th>
                <th>Serviço</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {condicionado.map((cond) => (
                <tr key={cond.ID}>
                  <td>{cond.NavioMain}</td>
                  <td>{cond.NavioSub}</td>
                  <td>{renderRequiServico(cond.Servico)}</td>
                  <td>{formatDateString(cond.Data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="TableTitle">Requisições de Lancha</h2>
          <table className="HomeTable">
            <thead>
              <tr>
                <th>Navio</th>
                <th>Serviço</th>
                <th>Horário</th>
              </tr>
            </thead>
            <tbody>
              {requisicoesWithoutBerco.map((requisicao) => (
                <tr key={requisicao.ID}>
                  <td>{requisicao.Navio}</td>
                  <td>{renderRequiServico(requisicao.Requi_servico)}</td>
                  <td>{requisicao.Hora_requi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default Home;


//55b04e8871ca4e63a8e135726230408
