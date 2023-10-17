import React, { useEffect, useState } from 'react';
import './Navbar.css';
import { Link, useNavigate } from 'react-router-dom';
import { useSignOut, useIsAuthenticated } from 'react-auth-kit';
import axios from 'axios';

function Navbar({ serverPort }) {
  const isAuthenticated = useIsAuthenticated();
  const signOut = useSignOut();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const response = await axios.post(`${serverPort}/logout`);
    signOut();
    navigate('/home');
  };

  return (
    <div className="navbar">
      <Link to="/">
        <button>Home</button>
      </Link>
      <Link to="/navios">
        <button>Navios</button>
      </Link>
      <Link to="/requisicoes">
        <button>Requisições</button>
      </Link>
      <Link to="/condicionada">
        <button>Condicionada</button>
      </Link>
      {isAuthenticated() ? (
        <>
          <Link to="/profile">
            <button>Perfil</button>
          </Link>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <Link to="/login">
          <button>Login</button>
        </Link>
      )}
    </div>
  );
}

export default Navbar;
