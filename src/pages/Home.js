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

  const renderRequiServico = (requiServico) => {
    if (requiServico === 'ATRACACAO') {
      return 'ATRACAÇÃO';
    } else if (requiServico === 'DESATRACACAO') {
      return 'DESATRACAÇÃO';
    } else if (requiServico === 'REATRACACAO') {
      return 'REATRACAÇÃO';
    } else if (requiServico === 'DESATRACACAOF') {
      return 'DESATRACAÇÃO FUNDEIO';
    } else if (requiServico === 'FUNDEIO_INTERNO') {
      return 'FUNDEIO INTERNO';
    } else if (requiServico === 'TROCA') {
      return 'TROCA DE BERÇO';
    } else {
      return requiServico;
    }
  };

  const formatDateString = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
              {requisicoes.map((requisicao) => (
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
      </div>
    </div>
  );
}

export default Home;

//55b04e8871ca4e63a8e135726230408
