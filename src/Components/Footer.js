import React, { useEffect, useState } from 'react';
import './Footer.css';
import logo from './logo.png';
import axios from 'axios';

const Footer = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [marineForecast, setMarineForecast] = useState('');

  useEffect(() => {
    // Function to fetch weather data from the API
    const fetchWeatherData = async () => {
      try {
        const apiKey = '55b04e8871ca4e63a8e135726230408';
        const city = 'Imbituba';
        const state = 'Santa Catarina';
        const country = 'Brazil';
        const language = 'pt';
        const response = await axios.get(`https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city},${state},${country}&lang=${language}&days=1`);
        setWeatherData(response.data);

        // Fetch marine forecast data
      const responseMarine = await axios.get(
        `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city},${state},${country}&lang=${language}&days=1&marine=yes`
      );
      console.log('Marine Forecast Response:', responseMarine.data);
      // const swellWaveHeight = responseMarine.data.forecast.forecastday[0].hour[0].swell_ht_mt;
      //   setMarineForecast(swellWaveHeight);

      } catch (error) {
        console.error('Error fetching weather data:', error);
      }
    };

    fetchWeatherData();
  }, [marineForecast]);

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-logo">
          {/* Add your logo here */}
          <img src={logo} alt="Logo" />
        </div>
        <div className="footer-weather">
          {/* Display the weather forecast */}
          {weatherData && (
            <>
              <p><b>Clima em Imbituba: </b>{weatherData.current.temp_c} °C  {weatherData.current.condition.text} </p>
              {/* <p>Marine forecast : {marineForecast} </p> */}
            </>
          )}
        </div>
        <div className="footer-disclaimer">
          {/* Add your copyright disclaimer */}
          &copy; {new Date().getFullYear()} MAX OHL. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
