import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from 'react-auth-kit';
import { Provider } from 'react-redux';
import store from './Reducers/store';

import Navbar from './Components/Navbar';
import Footer from './Components/Footer';
import Home from './pages/Home';
import Navios from './pages/Navios';
import UpdateNavio from './pages/UpdateNavio';
import Requisicoes from './pages/Requisicoes';
import NewRequisicoes from './pages/NewRequisicoes';
import Condicionada from './pages/Condicionada';
import Login from './pages/Login';
import NewCondicionada from './pages/NewCondicionada';
import UpdateCondicionada from './pages/UpdateCondicionada';
import UpdateRequisicao from './pages/UpdateRequisicao';
import ProfilePage from './pages/Profile';


function App() {
  //const serverPort =  'https://sispratibackend-eccb6aae0b16.herokuapp.com';
  //const serverPort = 'http://localhost:5000'
  const serverPort = 'https://sisprati-backend.onrender.com';
  const [navios] = useState([]);

  return (
    <Provider store={store}>
      <AuthProvider
        authType={'cookie'}
        authName={'_auth'}
        cookieDomain={window.location.hostname}
        cookieSecure={false}
      >
        <Router>
          <div className="App">
            <Navbar serverPort={serverPort} />
            <Routes>
              <Route path="/" element={<Home serverPort={serverPort} />} />
              <Route path="/navios" element={<Navios serverPort={serverPort} />} />
              <Route path="/navios/:id" element={<UpdateNavio serverPort={serverPort} />} />
              <Route
                path="/requisicoes"
                element={<Requisicoes serverPort={serverPort} navios={navios} />}
              />
              <Route
                path="/requisicoes/new"
                element={<NewRequisicoes serverPort={serverPort} />}
              />
              <Route path="/requisicoes/:id" element={<UpdateRequisicao serverPort={serverPort} />} />
              <Route
                path="/condicionada"
                element={<Condicionada serverPort={serverPort} />}
              /> 
              <Route
                path="/condicionada/new"
                element={<NewCondicionada serverPort={serverPort} />}
              />
              <Route path="/condicionada/:id" element={<UpdateCondicionada serverPort={serverPort} />} />
              <Route path="/login" element={<Login serverPort={serverPort} />} />
              <Route path="/profile" element={<ProfilePage serverPort={serverPort} />} />
            </Routes>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </Provider>
  );
}

export default App;
