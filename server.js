  const express = require('express');
  const path = require('path'); // Import the 'path' module
  const mysql = require('mysql2');
  const bcrypt = require('bcrypt-nodejs');
  const session = require('express-session');
  const cookieParser = require('cookie-parser');
  const jwt = require('jsonwebtoken');
  const flash = require('connect-flash');
  const moment = require('moment-timezone');
  const sgMail = require('@sendgrid/mail');

  const app = express();
  const cors = require('cors');
  //const { connection } = require('mongoose');
  const port = process.env.PORT || 5000;

  require('dotenv').config();

  // Use the 'path' module to create the correct path to the 'build' folder
  const buildPath = path.join(__dirname, 'build');
 

  app.use(cors({
    origin: [
      'http://novosisprati-990826f489ce.herokuapp.com',
      'https://novosisprati-990826f489ce.herokuapp.com'
    ]
  }));


  app.use(express.static(buildPath));

  // Create a connection pool
const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(express.json());

// Enable session middleware
app.use(
  session({
    secret: process.env.SECRET, // Replace with your own secret key
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Add the cookie-parser middleware
app.use(cookieParser());

//Flash middleware
app.use(flash());


//Verify the ID of the user
const getUserIdFromIDCookie = (IDCookie) => {
try {
  const decoded = jwt.verify(IDCookie, process.env.SECRET);
  const userID = decoded.id;
  return userID;
} catch (error) {
  console.error('Error decoding IDCookie:', error);
  throw new Error('Invalid IDCookie');
}
};

// Function to retrieve data from 'condicionado' table and modify 'Hora_requi' and 'Data_requi' if necessary
async function checkCondi(ID_Navio, Data_requi, Hora_requi) {
const checkQueryCondicionado = `
  SELECT * FROM Condicionado WHERE ID_NavioSub = ? AND (Data = ? OR Data = DATE_SUB(?, INTERVAL 1 DAY)) ;
;
`;

return new Promise((resolve, reject) => {
  pool.query(checkQueryCondicionado, [ID_Navio, Data_requi, Data_requi], (err, results) => {
    if (err) {
      console.error('Error retrieving data from Condicionado:', err);
      reject(err);
      return;
    }

    if (results.length > 0) {
      // A match is found in the 'condicionado' table
      // Modify 'Hora_requi' by adding 1 hour
      const originalMoment = moment(`${Data_requi} ${Hora_requi}`, 'YYYY-MM-DD HH:mm');
      const modifiedMoment = originalMoment.clone().add(1, 'hour');

      let modifiedDataRequi = Data_requi;
      let modifiedHoraRequi = Hora_requi;

      // Check if the modified time crosses into the next day
      if (modifiedMoment.isAfter(originalMoment.endOf('day'))) {
        modifiedDataRequi = originalMoment.add(1, 'day').format('YYYY-MM-DD');
      }
      
      modifiedHoraRequi = modifiedMoment.format('HH:mm');

      // Extract the required fields from the 'condicionado' table
      const {
        ID_NavioMain,
        Data,
        Viagem,
        Servico,
        Berco,
        Posicao_Berco,
        OBS,
        Fatu,
        ID_Agencia,
        Rebocador,
      } = results[0];

      // Create an object with the modified requisicao data from condicionado
      const requisicaoData = {
        ID_NavioMain,
        Data: modifiedDataRequi,
        Hora_requi: modifiedHoraRequi,
        Viagem,
        Servico,
        Berco,
        Posicao_Berco,
        OBS,
        Fatu,
        ID_Agencia,
        Rebocador,
      };

      resolve(requisicaoData);
    } else {
      // No match found in the 'condicionado' table
      resolve(null);
    }
  });
});
}


// Function to build and send the email
async function sendEmail(ID_Navio, ID_Agencia, dataRequisicao, isCondicionada, subject, ID_NavioSub) {
// Retrieve email recipients from the 'emails' table
const emailRecipientsQuery = `
  SELECT email
  FROM emails;
`;

// Execute the query to retrieve email recipients
const emailRecipients = await new Promise((resolve, reject) => {
  pool.query(emailRecipientsQuery, (err, results) => {
    if (err) {
      console.error('Error retrieving email recipients:', err);
      reject(err);
      return;
    }
    resolve(results.map((result) => result.email));
  });
});

  // Retrieve the selectedRebocador from the req.body
  const selectedRebocador = dataRequisicao.selectedRebocador || dataRequisicao.Rebocador;


// Collect unique email addresses in the recipients set
const recipientsSet = new Set(['sisprati@hotmail.com', ...emailRecipients]);

// Check if selectedRebocador exists and is not "naoEnviarEmail"
// if (selectedRebocador && selectedRebocador !== "naoEnviarEmail") {
//   recipientsSet.add(selectedRebocador);
// }


// Retrieve data from 'navios' table using ID_Navio
const navioQuery = `
  SELECT n.Navio, n.IMO, n.Bandeira, n.Armador, n.Carga, n.GRT, n.DWT, n.LOA, n.C_proa, n.C_popa, n.CS_proa, n.CS_popa
  FROM navios AS n
  WHERE n.ID = ?;
`;

// Retrieve data from 'agencia' table using ID_Agencia
const agenciaQuery = `
  SELECT a.nome_agencia, a.email
  FROM agencia AS a
  WHERE a.ID = ?;
`;

// Map of service values and their corresponding replacements
const serviceMap = {
  ATRACACAO: 'ATRACAÇÃO',
  DESATRACACAO: 'DESATRACAÇÃO',
  REATRACACAO: 'REATRACAÇÃO',
  DESATRACACAOF: 'DESATRACAÇÃO FUNDEIO',
  FUNDEIO_INTERNO: 'FUNDEIO INTERNO',
  TROCA: 'TROCA DE BERÇO',
  PUXADA : 'PUXADA',
  LEITURA_DE_CALADO: 'LEITURA DE CALADO',
  TRANSPORTE_DE_ENFERMOS: 'TRANSPORTE DE ENFÊRMOS',
  TRANSPORTE_DE_SUPRIMENTOS: 'TRANSPORTE DE SUPRIMENTOS',
  TRANSPORTE_DE_OBITOS: 'TRANSPORTE DE ÓBITOS',
  TRANSPORTE_DE_PASSAGEIROS: 'TRANSPORTE DE PASSAGEIROS',
  VISTORIA_DE_CASCO: 'VISTORIA DE CASCO'
};

const service = isCondicionada
? serviceMap[dataRequisicao.Servico]
: serviceMap[dataRequisicao.Requi_servico];

console.log("service: ",service)
console.log("serviceMap: ",serviceMap)

// Execute queries to retrieve data
const [navioData, agenciaData] = await Promise.all([
  new Promise((resolve, reject) => {
    pool.query(navioQuery, [ID_Navio], (err, results) => {
      if (err) {
        console.error('Error retrieving data from navios:', err);
        reject(err);
        return;
      }
      resolve(results[0]);
    });
  }),
  new Promise((resolve, reject) => {
    pool.query(agenciaQuery, [ID_Agencia], (err, results) => {
      if (err) {
        console.error('Error retrieving data from agencia:', err);
        reject(err);
        return;
      }
      if (results[0].email) {
        recipientsSet.add(results[0].email);
      }
      resolve(results[0]);
    });
  })
]);

// Convert the recipients set back to an array
const recipients = Array.from(recipientsSet);  

let situacao = '';
if (
  service === 'DESATRACAÇÃO' ||
  service === 'DESATRACAÇÃO FUNDEIO'
) {
  situacao = `<p><b>CALADO DE SAÍDA:</b> FWD: ${navioData.CS_proa}m AFT ${navioData.CS_popa}m</p>`;
} else if(
  service === 'ATRACAÇÃO'
){
  situacao = `<p><b>CALADO DE ENTRADA:</b> FWD: ${navioData.C_proa}m AFT ${navioData.C_popa}m</p>`;
} else if(
  service === 'FUNDEIO INTERNO' ||
  service === 'PUXADA' ||
  service === 'REATRACAÇÃO' ||
  service === 'TROCA DE BERÇO'
){
  situacao = `<b>CALADO DE ENTRADA:</b> FWD: ${navioData.C_proa}m AFT ${navioData.C_popa}m</p> \n`;
  situacao += `<p><b>CALADO DE SAÍDA:</b> FWD: ${navioData.CS_proa}m AFT ${navioData.CS_popa}m</p>`;
} else
{
  situacao = ``
}

// Prepare the Title based on Servico value
let title = '';
if (service === 'PUXADA' || service === 'TROCA DE BERÇO') {
  title = 'Sem a utilização dos serviços de lancha';
}

let navioSubQuery = '';
let NavioSub = '';

if (isCondicionada) {
  navioSubQuery = `
    SELECT Navio
    FROM navios
    WHERE ID = ?;
  `;
  const [navioSubData] = await new Promise((resolve, reject) => {
    pool.query(navioSubQuery, [ID_NavioSub], (err, results) => {
      if (err) {
        console.error('Error retrieving data from navios:', err);
        reject(err);
        return;
      }
      resolve(results);
    });
  });
  NavioSub = navioSubData ? navioSubData.Navio : '';
}


const horaRequiFormatted = !isCondicionada && dataRequisicao.Hora_requi
? moment(dataRequisicao.Hora_requi, 'HH:mm').format('HH:mm')
: '';


// Prepare the email content
console.log("Data requisicao : ",dataRequisicao)
let emailContent = `
  <h1><b>${agenciaData.nome_agencia}</b></h1>
  <br>
  ${
    (isCondicionada || dataRequisicao.berco_requi)
      ? `
      <p><b>REQUISIÇÃO DE SERVIÇOS DE PRATICAGEM</b></p>
      `
      : '<b><p>REQUISIÇÃO DE SERVIÇOS DE LANCHA</p></b>'
  }
  <p><b>${title}</b></p>
  <p><b> NAVIO: </b> ${navioData.Navio}</p>
  <p><b> DATA: </b> ${isCondicionada ? dataRequisicao.Data : dataRequisicao.Data_requi} ${isCondicionada ? '' : ` ${horaRequiFormatted}`}</p>
  <p><b> SERVIÇO: </b> ${service}</p>
  ${isCondicionada ? `<p><b> OBS: </b>Condicionado ao ${NavioSub}</p>` : ''}
  ${isCondicionada ? (dataRequisicao.Berco ? `<p><b> BERÇO: </b> ${dataRequisicao.Berco}</p>` : '') : (dataRequisicao.berco_requi ? `<p><b> BERÇO: </b> ${dataRequisicao.berco_requi}</p>` : '')}
  ${isCondicionada ? (dataRequisicao.Posicao_Berco ? `<p><b> POSIÇÃO: </b> ${dataRequisicao.Posicao_Berco}</p>` : '') : (dataRequisicao.posicao_requi ? `<p><b> POSIÇÃO: </b> ${dataRequisicao.posicao_requi}</p>` : '')}
  <p><b> ARMADOR: </b> ${navioData.Armador} </p>
  <p><b> IMO: </b> ${navioData.IMO}</p>
  <p><b> BANDEIRA: </b> ${navioData.Bandeira}</p>
  ${
    dataRequisicao.berco_requi || (isCondicionada && dataRequisicao.Berco)
      ? `
    <p><b> CARGA: </b> ${navioData.Carga}</p>
    <p><b> GROSS: </b> ${navioData.GRT}</p>
    <p><b> DWT: </b> ${navioData.DWT}</p>
    <p><b> LOA: </b> ${navioData.LOA}</p>
    `
      : ''
  }
  <p>${situacao}</p>
  <p><b> FATURAMENTO: </b> ${isCondicionada ? dataRequisicao.Fatu : dataRequisicao.Fatu_requi}</p>
  <p><b> OBS: </b> ${isCondicionada ? dataRequisicao.OBS : dataRequisicao.Obs_requi}</p>
`

if (selectedRebocador && selectedRebocador !== "naoEnviarEmail") {
emailContent += `
  <p><b> Rebocador: </b> ${selectedRebocador}</p>
`;
}


if (!dataRequisicao.berco_requi && !dataRequisicao.posicao_requi && !isCondicionada) {
emailContent += `
  <div style="margin-top: 20px; border: 2px solid red; border-radius: 5px; text-align: center; padding: 10px;">
    <h3 style="text-decoration: underline; margin: 0;">Aviso!</h3>
    <p style="margin: 0;">
      <b>A IMBITUBA PILOTS - Serviços de Praticagem S/C Ltda.</b>, fornece os serviços de transporte, por lancha, na Zona de Praticagem 22 (ZP22), solicitados no documento <b>“REQUISIÇÃO DE SERVIÇOS DE LANCHA”</b>, sendo responsável apenas pelo veículo transportador e sua tripulação. <b>A IMBITUBA PILOTS</b> não declara que as informações, constantes neste documento e disponibilizadas pelo Requerente, sejam verificadas, precisas e legais. Sendo assim, a <b>IMBITUBA PILOTS</b> não responde por quaisquer erros ou omissões, perdas, quebras e/ou faltas, dado que toda informação é provida por terceiros, sem nenhuma garantia de qualquer espécie.
    </p>
  </div>
`;
}

// Set up the SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//Remove quebra de linhas extras.
emailContent = emailContent.replace(/\n\s*\n/g, '\n');

// Prepare the email parameters
const msg = {
  to: recipients,
  from: 'sisprati@hotmail.com',
  subject: subject,
  html: emailContent,
};



// Send the email
try {
  const response = await sgMail.send(msg);
  console.log('Email sent successfully');
  console.log('SendGrid API response:', response);
  //console.log(msg);
 } catch (error) {
   console.error('Error sending email:', error);
  if (error.response) {
    console.error('SendGrid API error response:', error.response.body);
   }
   throw error;
}

}

// Handle any routes by serving the 'index.html' file
// app.get('*', (req, res) => {
//   res.sendFile(path.join(buildPath, 'index.html'));
// });

app.get('/', (req, res) => {
res.send('Hello, this is your backend!');
});

//get all agencias
app.get('/agencias',(req,res)=> {
pool.getConnection((err,connection)=> {
  if(err) {
    console.log('Error estabilishin database connection:', err);
    res.status(500).json({ error: 'Internal Server Error '});
    return;
  }
  const IDCookie = req.headers['idcookie'];

  try{
    const userID = getUserIdFromIDCookie(IDCookie);

    const query = `
    SELECT *
    FROM agencia
    ORDER BY nome_agencia
    `;

    connection.query(query, [userID], (err, rows) => {
      connection.release();

      if (err) {
        console.error('Error fetching agencias:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      res.json(rows);
    });
  } catch (error) {
    console.error('Error retrieving userID:', error);
    res.status(400).json({ error: 'Invalid IDCookie'});
  }
});
});


// Endpoint for retrieving navios
app.get('/navios', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error establishing database connection:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    const IDCookie = req.headers['idcookie']; // Retrieve the IDCookie from the request headers
    
    try{
      const userID = getUserIdFromIDCookie(IDCookie);
    

    const query = `
      SELECT *
      FROM navios
      WHERE ID_agencia = ?
      ORDER BY Navio;
    `;

    connection.query(query, [userID], (err, rows) => {
      connection.release();

      if (err) {
        console.error('Error fetching navios:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      res.json(rows);
    });
  } catch (error) {
    console.error('Error retrieving userID:', error);
    res.status(400).json({ error: 'Invalid IDCookie' });
  }
  });
});

//endpoint to get all navios 
app.get('/navios/all', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error establishing database connection:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const IDCookie = req.headers['idcookie'];

    try {
      const userID = getUserIdFromIDCookie(IDCookie);
      

      const query = `
      SELECT navios.ID, navios.Navio, navios.IMO, navios.ID_agencia, agencia.codigo
      FROM navios
      INNER JOIN agencia ON navios.ID_agencia = agencia.ID
      ORDER BY navios.Navio;
    `;
    

  
      connection.query(query, (err, rows) => {
        connection.release();
  
        if (err) {
          console.error('Error fetching navios:', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
  
        res.json({userID, navios:rows});
      });
  } catch (error) {
    console.error('Error retrieving userID:', error);
    res.status(400).json({ error: 'Invalid IDCookie' });
  }
  });
});


// Endpoint for saving NaviosForm data
app.post('/navios', (req, res) => {
const {
  DWT,
  GRT,
  IMO,
  LOA,
  armador,
  Bandeira,
  berco,
  C_popa,
  C_proa,
  CS_popa,
  CS_proa,
  Carga,
  ETA_Data,
  ETA_Time,
  ETB_Data,
  ETB_Time,
  ETS_Data,
  ETS_Time,
  Navio,
  Obs,
  posicao,
  situacao,
  Viagem,
} = req.body;
const IDCookie = req.headers['idcookie'];

try {
  const ID_agencia = getUserIdFromIDCookie(IDCookie);

      // Check if CS_popa or CS_proa are empty or null and assign them the value "0"
      const sanitizedCS_popa = CS_popa || "0";
      const sanitizedCS_proa = CS_proa || "0";

  // Create a new entry in the 'navios' table
  const query = `
    INSERT INTO navios (DWT, GRT, IMO, LOA, armador, Bandeira, berco, C_popa, C_proa, CS_popa, CS_proa, Carga, ETA_Data, ETA_Time, ETB_Data, ETB_Time, ETS_Data, ETS_Time, Navio, Obs, posicao, situacao, Viagem, ID_agencia )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  pool.query(
    query,
    [
      DWT,
      GRT,
      IMO,
      LOA,
      armador,
      Bandeira,
      berco,
      C_popa,
      C_proa,
      sanitizedCS_popa,
      sanitizedCS_proa,
      Carga,
      ETA_Data,
      ETA_Time,
      ETB_Data,
      ETB_Time,
      ETS_Data,
      ETS_Time,
      Navio,
      Obs,
      posicao,
      situacao,
      Viagem,
      ID_agencia,
    ],
    (err, results) => {
      if (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      res.json({ success: 'Navio registrado com sucesso!' });
    }
  );
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});



// Endpoint for updating Navios data
app.put('/navios/:id', (req, res) => {
const navioId = req.params.id;
const IDCookie = req.headers['idcookie'];
const {
  DWT,
  GRT,
  IMO,
  LOA,
  armador,
  Bandeira,
  berco,
  C_popa,
  C_proa,
  CS_popa,
  CS_proa,
  Carga,
  ETA_Data,
  ETA_Time,
  ETB_Data,
  ETB_Time,
  ETS_Data,
  ETS_Time,
  Navio,
  Obs,
  posicao,
  situacao,
  Viagem,
} = req.body;

try {
  const ID_agencia = getUserIdFromIDCookie(IDCookie);

  // Update the entry in the 'navios' table
  const query = `
    UPDATE navios
    SET DWT = ?, GRT = ?, IMO = ?, LOA = ?, armador = ?, Bandeira = ?, berco = ?, C_popa = ?, C_proa = ?, CS_popa = ?, CS_proa = ?, Carga = ?, ETA_Data = ?, ETA_Time = ?, ETB_Data = ?, ETB_Time = ?, ETS_Data = ?, ETS_Time = ?, Navio = ?, Obs = ?, posicao = ?, situacao = ?, Viagem = ?
    WHERE ID = ? AND ID_agencia = ?;
  `;

  pool.query(
    query,
    [
      DWT,
      GRT,
      IMO,
      LOA,
      armador,
      Bandeira,
      berco,
      C_popa,
      C_proa,
      CS_popa,
      CS_proa,
      Carga,
      ETA_Data,
      ETA_Time,
      ETB_Data,
      ETB_Time,
      ETS_Data,
      ETS_Time,
      Navio,
      Obs,
      posicao,
      situacao,
      Viagem,
      navioId,
      ID_agencia,
    ],
    (err, results) => {
      if (err) {
        console.error('Error updating data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      // Check if any rows were affected by the update
      if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Navio not found' });
        return;
      }

      res.json({ success: 'Navio Atualizado com sucesso!' });
    }
  );
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});

// Endpoint for deleting a Navio
app.delete('/navios/:id', (req, res) => {
const navioId = req.params.id;
const IDCookie = req.headers['idcookie'];

try {
  const ID_agencia = getUserIdFromIDCookie(IDCookie);

  // Delete the Navio from the 'navios' table
  const query = `
    DELETE FROM navios
    WHERE ID = ? AND ID_agencia = ?;
  `;

  pool.query(query, [navioId, ID_agencia], (err, results) => {
    if (err) {
      console.error('Error deleting Navio:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Check if any rows were affected by the delete operation
    if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Navio not found' });
      return;
    }

    res.json({ success: 'Navio deletado com sucesso!' });
  });
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});


// Endpoint for checking requisicoes
app.get('/check/requisicao', (req, res) => {
const { data, hora } = req.query;

const query = `
  SELECT *
  FROM requisicoes
  WHERE DATE(Data_requi) = ?;
`;

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error getting connection:', err);
    res.status(500).json({ success: false, error: 'Error getting connection' });
    return;
  }

  connection.query(query, [data], (err, rows) => {
    connection.release();

    if (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ success: false, error: 'Error executing query' });
      return;
    }

    if (rows.length === 0) {
      // No existing requisition found for the specified date
      res.json({ success: false });
    } else {
      // Check if there is any requisition with a time difference less than 1 hour
      const selectedTime = new Date(`${data} ${hora}`);
      const hasRequisitionWithinHour = rows.some((requisition) => {
        const existingTime = new Date(`${data} ${requisition.Hora_requi}`);
        const timeDiff = Math.abs(selectedTime - existingTime);
        const hourInMillis = 60 * 60 * 1000;
        return timeDiff < hourInMillis;
      });

      res.json({ success: hasRequisitionWithinHour });
    }
  });
});
});


// Endpoint for retrieving requisicoes
app.get('/requisicoes', (req, res) => {
  const maxRows = 10; // Set the maximum number of rows allowed

  const query = `
    SELECT r.*, n.Navio
    FROM requisicoes AS r
    INNER JOIN navios AS n ON r.ID_Navio = n.ID
    WHERE r.ID_Agencia = ?
    ORDER BY r.ID DESC
    LIMIT ?;
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection:', err);
      res.status(500).json({ error: 'Error getting connection' });
      return;
    }

    const IDCookie = req.headers['idcookie']; // Retrieve the IDCookie from the request headers
    
    try {
      const userID = getUserIdFromIDCookie(IDCookie);

    connection.query(query,[userID, maxRows], (err, rows) => {
      connection.release();

      if (err) {
        console.error('Error executing query:', err);
        res.status(500).json({ error: 'Error executing query' });
        return;
      }

      res.json(rows);
    });
  } catch (error) {
    console.error('Error retrieving userID:', error);
    res.status(400).json({ error: 'Invalid IDCookie' });
  }
  });
});


// Endpoint for saving new requisicoes
app.post('/requisicoes', async (req, res) => {
const {
  ID_Navio,
  Data_requi,
  Hora_requi,
  Viagem,
  Requi_servico,
  berco_requi,
  posicao_requi,
  Obs_requi,
  Fatu_requi,
  rebocador_requi,
  isLancha,
} = req.body;

const IDCookie = req.headers['idcookie'];
const emailSubject = isLancha ? 'REQUISIÇÃO DE SERVIÇOS DE LANCHA' : 'REQUISIÇÃO DE SERVIÇOS DE PRATICAGEM';

try {
  const ID_Agencia = getUserIdFromIDCookie(IDCookie);
  const bercoValue = berco_requi || null;
  const posicaoBercoValue = posicao_requi || null;

  // Check if a requisicao with the same ID_Navio and Data_requi already exists
  const checkQuery = `
    SELECT * FROM requisicoes WHERE ID_Navio = ? AND Data_requi = ?;
  `;

  const results = await new Promise((resolve, reject) => {
    pool.query(checkQuery, [ID_Navio, Data_requi], (err, results) => {
      if (err) {
        console.error('Error checking existing data:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });

  if (results.length > 0) {
    // A requisicao with the same ID_Navio and Data_requi already exists
    // Check the difference between the Hora_requi values
    const existingHoraRequi = results[0].Hora_requi;
    const differenceInHours = moment(Hora_requi, 'HH:mm').diff(moment(existingHoraRequi, 'HH:mm'), 'hours');

    if (Math.abs(differenceInHours) < 1) {
      res.status(400).json({
        error: 'Já existe uma requisição com esse navio na data e horário especificados.',
      });
      return;
    }
  }

  // Retrieve data from the 'condicionado' table and modify 'Hora_requi' if necessary
  const requisicaoDataFromCondicionado = await checkCondi(ID_Navio, Data_requi, Hora_requi);

  // Create a new entry in the 'requisicoes' table for the original requisicao from frontend
  const insertQueryOriginal = `
    INSERT INTO requisicoes (ID_Navio, Data_requi, Hora_requi, viagem, Requi_servico, berco_requi, posicao_requi, Obs_requi, Fatu_requi, ID_Agencia, rebocador_requi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );
  `;

  await new Promise((resolve, reject) => {
    pool.query(
      insertQueryOriginal,
      [
        ID_Navio,
        Data_requi,
        Hora_requi,
        Viagem,
        Requi_servico,
        bercoValue,
        posicaoBercoValue,
        Obs_requi,
        Fatu_requi,
        ID_Agencia,
        rebocador_requi,
      ],
      (err, results) => {
        if (err) {
          console.error('Error inserting original data:', err);
          reject(err);
        } else {
          console.log('Original data saved successfully!');
          resolve(results);
        }
      }
    );
  });

  if (requisicaoDataFromCondicionado) {
    // Create a new entry in the 'requisicoes' table for the modified requisicao from condicionado
    const {
      ID_NavioMain,
      Data: modifiedData,
      Hora_requi: modifiedHoraRequi,
      Viagem: modifiedViagem,
      Servico: modifiedRequi_servico,
      Berco: modifiedBerco_requi,
      Posicao_Berco: modifiedPosicao_requi,
      OBS: modifiedObs_requi,
      Fatu: modifiedFatu_requi,
      ID_Agencia: modifiedID_Agencia,
      Rebocador,
    } = requisicaoDataFromCondicionado;

    const {
      ID_NavioMain : ID_Navio,
      Data: Data_requi,
      Hora_requi,
      Servico: Requi_servico,
      Berco: berco_requi,
      Posicao_Berco: posicao_requi,
      OBS: Obs_requi,
      Fatu: Fatu_requi,
      ID_Agencia,
      rebocador_requi : modifiedRebocador,
    } = requisicaoDataFromCondicionado;

    const DataCondicionado = {
      ID_Navio,
      Data_requi,
      Hora_requi,
      Requi_servico,
      berco_requi,
      posicao_requi,
      Obs_requi,
      Fatu_requi,
      ID_Agencia,
      Rebocador,
    };

    const insertQueryCondicionado = `
    INSERT INTO requisicoes (ID_Navio, Data_requi, Hora_requi, viagem, Requi_servico, berco_requi, posicao_requi, Obs_requi, Fatu_requi, ID_Agencia, rebocador_requi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  await new Promise((resolve, reject) => {
    pool.query(
      insertQueryCondicionado,
      [
        ID_NavioMain,
        modifiedData,
        modifiedHoraRequi,
        modifiedViagem,
        modifiedRequi_servico,
        modifiedBerco_requi,
        modifiedPosicao_requi,
        modifiedObs_requi,
        modifiedFatu_requi,
        modifiedID_Agencia,
        // modifiedRebocador,
        DataCondicionado.Rebocador,
      ],
      (err, results) => {
        if (err) {
          console.error('Error inserting modified data:', err);
          reject(err);
        } else {
          console.log('Modified data saved successfully!');
          resolve(results);
        }
      }
    );
  }); 

    const condicionadoData = await checkCondi(ID_NavioMain,modifiedData, modifiedHoraRequi);

  
  if(condicionadoData){
    const {
      ID_NavioMain,
      Data: modifiedData,
      Hora_requi: modifiedHoraRequi,
      Viagem: modifiedViagem,
      Servico: modifiedRequi_servico,
      Berco: modifiedBerco_requi,
      Posicao_Berco: modifiedPosicao_requi,
      OBS: modifiedObs_requi,
      Fatu: modifiedFatu_requi,
      ID_Agencia: modifiedID_Agencia,
      Rebocador : modifiedRebocador,
    } = condicionadoData;

    const {
      ID_NavioMain : ID_Navio,
      Data: Data_requi,
      Hora_requi,
      Servico: Requi_servico,
      Berco: berco_requi,
      Posicao_Berco: posicao_requi,
      OBS: Obs_requi,
      Fatu: Fatu_requi,
      ID_Agencia,
      Rebocador,
    } = condicionadoData;

    const DataCondi = {
      ID_Navio,
      Data_requi,
      Hora_requi,
      Requi_servico,
      berco_requi,
      posicao_requi,
      Obs_requi,
      Fatu_requi,
      ID_Agencia,
      Rebocador,
    };     
    const insertCondicionado = `
    INSERT INTO requisicoes (ID_Navio, Data_requi, Hora_requi, viagem, Requi_servico, berco_requi, posicao_requi, Obs_requi, Fatu_requi, ID_Agencia, rebocador_requi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  
  await new Promise((resolve, reject) => {
    pool.query(
      insertCondicionado,
      [
        ID_NavioMain,
        modifiedData,
        modifiedHoraRequi,
        modifiedViagem,
        modifiedRequi_servico,
        modifiedBerco_requi,
        modifiedPosicao_requi,
        modifiedObs_requi,
        modifiedFatu_requi,
        modifiedID_Agencia,
        modifiedRebocador,
      ],
      (err, results) => {
        if (err) {
          console.error('Error inserting modified data:', err);
          reject(err);
        } else {
          console.log('Modified data saved successfully!');
          resolve(results);
        }
      }
    );
  });  
  
    // Send email for the modified condicionado
    await sendEmail(
      ID_NavioMain,
      modifiedID_Agencia,
      DataCondi,
      false,
      'REQUISIÇÃO DE SERVIÇOS DE PRATICAGEM',
      ID_Navio
    ).catch((error) => {
      console.error('Error sending email:', error);
    });
  }

    // Send email for the modified requisicao
    await sendEmail(
      ID_NavioMain,
      modifiedID_Agencia,
      DataCondicionado,
      false,
      emailSubject,
      ID_Navio
    ).catch((error) => {
      console.error('Error sending email:', error);
    });
  }

  // Send email for the original requisicao
  await sendEmail(
    ID_Navio,
    ID_Agencia,
    req.body,
    false,
    emailSubject
  ).catch((error) => {
    console.error('Error sending email:', error);
  });

  res.json({ success: 'Data saved successfully!' });
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});



// Endpoint for updating Requisicao data
app.put('/requisicoes/:id', async (req, res) => {
const requisicaoId = req.params.id;
const {
  ID_Navio,
  Data_requi,
  Hora_requi,
  viagem,
  Requi_servico,
  berco_requi,
  posicao_requi,
  Obs_requi,
  Fatu_requi,
  selectedRebocador,
  isLancha
} = req.body;

const IDCookie = req.headers['idcookie'];
const emailSubject = isLancha ? 'ATUALIZAÇÃO DE REQUISIÇÃO DE SERVIÇOS DE LANCHA' : 'ATUALIZAÇÃO DE REQUISIÇÃO DE SERVIÇOS DE PRATICAGEM';

try {
  const ID_Agencia = getUserIdFromIDCookie(IDCookie);
  // Convert the date to the desired format "yyyy/mm/dd" using moment.js
  const formattedDate = moment.utc(Data_requi).format('YYYY/MM/DD');

  // Update the entry in the 'condicionado' table
  const query = `
    UPDATE requisicoes
    SET ID_Navio = ?, Data_requi = ?, Hora_requi = ?, viagem = ?, Requi_servico = ?, berco_requi = ?, posicao_requi = ?, Obs_requi = ?, Fatu_requi = ?, rebocador_requi = ?
    WHERE ID = ? AND ID_Agencia = ?;
  `;

  pool.query(
    query,
    [
      ID_Navio,
      formattedDate,
      Hora_requi,
      viagem,
      Requi_servico,
      berco_requi,
      posicao_requi,
      Obs_requi,
      Fatu_requi,
      selectedRebocador,
      requisicaoId,
      ID_Agencia
    ],
    async (err, results) => {
      if (err) {
        console.error('Error updating data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      // Check if any rows were affected by the update
      if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Requisicao not found' });
        return;
      }

      const updatedRequisicao = req.body;

      // Send email for the updated requisicao
      await sendEmail(
        ID_Navio,
        ID_Agencia,
        updatedRequisicao,
        false,
        emailSubject
      ).catch((error) => {
        console.error('Error sending email:', error);
      });

      res.json({ success: 'Requisicao atualizada com sucesso!' });
    }
  );
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});


// Endpoint for deleting a Requisicao
app.delete('/requisicoes/:id', (req, res) => {
const requisicaoID = req.params.id;
const IDCookie = req.headers['idcookie'];

try {
  const ID_agencia = getUserIdFromIDCookie(IDCookie);

  // Retrieve the requisicao from the 'requisicoes' table before deleting it
  const querySelect = `
    SELECT *
    FROM requisicoes
    WHERE ID = ? AND ID_agencia = ?;
  `;

  pool.query(querySelect, [requisicaoID, ID_agencia], async (err, results) => {
    if (err) {
      console.error('Error retrieving Requisicao:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Check if the requisicao exists
    if (results.length === 0) {
      res.status(404).json({ error: 'Requisicao not found' });
      return;
    }

    const requisicao = results[0];

    // Delete the requisicao from the 'requisicoes' table
    const queryDelete = `
      DELETE FROM requisicoes
      WHERE ID = ? AND ID_agencia = ?;
    `;

    pool.query(queryDelete, [requisicaoID, ID_agencia], async (err, results) => {
      if (err) {
        console.error('Error deleting Requisicao:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      // Check if any rows were affected by the delete operation
      if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Requisicao not found' });
        return;
      }

      // Send email for the deleted requisicao
      await sendEmail(
        requisicao.ID_Navio,
        ID_agencia,
        requisicao,
        false,
        'CANCELAMENTO DE REQUISIÇÃO DE SERVIÇOS DE PRATICAGEM'
      ).catch((error) => {
        console.error('Error sending email:', error);
      });

      res.json({ success: 'Requisição Cancelada!' });
    });
  });
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});


// Endpoint for retrieving condicionada
app.get('/condicionada', (req, res) => {
const maxRows = 10; // Set the maximum number of rows allowed
const query = `
  SELECT c.*, nm.Navio AS NavioMain, ns.Navio AS NavioSub
  FROM Condicionado AS c
  INNER JOIN navios AS nm ON c.ID_NavioMain = nm.ID
  INNER JOIN navios AS ns ON c.ID_NavioSub = ns.ID
  WHERE c.ID_Agencia = ?
  ORDER BY c.ID DESC
  LIMIT ?;
`;

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error getting connection:', err);
    res.status(500).json({ error: 'Error getting connection' });
    return;
  }

  const IDCookie = req.headers['idcookie']; // Retrieve the IDCookie from the request headers
    
    try {
      const userID = getUserIdFromIDCookie(IDCookie);

  connection.query(query, [userID,maxRows], (err, rows) => {
    connection.release();

    if (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ error: 'Error executing query' });
      return;
    }

    res.json(rows);
  });
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});
});

// Endpoint for saving condicionada
app.post('/condicionada', async (req, res) => {
const {
  ID_NavioMain,
  ID_NavioSub,
  Data,
  Viagem,
  Servico,
  Berco,
  Posicao_Berco,
  OBS,
  Fatu,
  selectedRebocador,
} = req.body;

const IDCookie = req.headers['idcookie'];

try {
  const ID_Agencia = getUserIdFromIDCookie(IDCookie);

  // Check if a condicionada with the same ID_NavioMain, ID_NavioSub, and Data already exists
  const checkQuery = `
    SELECT * FROM Condicionado WHERE ID_NavioMain = ? AND ID_NavioSub = ? AND Data = ?;
  `;

  pool.query(checkQuery, [ID_NavioMain, ID_NavioSub, Data], async (err, results) => {
    if (err) {
      console.error('Error checking existing data:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length > 0) {
      // A condicionada with the same ID_NavioMain, ID_NavioSub, and Data already exists
      res.status(400).json({
        error: 'Já existe uma requisição condicionada com esses navios na data especificada.',
      });
      return;
    }

    // Create a new entry in the 'condicionada' table
    const insertQuery = `
      INSERT INTO Condicionado (ID_NavioMain, ID_NavioSub, Data, Viagem, Servico, Berco, Posicao_Berco, OBS, Fatu, ID_Agencia, Rebocador)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    pool.query(
      insertQuery,
      [
        ID_NavioMain,
        ID_NavioSub,
        Data,
        Viagem,
        Servico,
        Berco,
        Posicao_Berco,
        OBS,
        Fatu,
        ID_Agencia,
        selectedRebocador,
      ],
      async (err, results) => {
        if (err) {
          console.error('Error inserting data:', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }

        // Call the function to send the email and await its completion
        try {
          await sendEmail(
            ID_NavioMain,
            ID_Agencia,
            req.body,
            true,
            'REQUISIÇÃO CONDICIONADA DE SERVIÇOS DE PRATICAGEM',
            ID_NavioSub
          );
          res.json({ success: 'Data saved successfully!' });
        } catch (error) {
          console.error('Error sending email:', error);
          res.status(500).json({ error: 'Error sending email' });
        }
      }
    );
  });
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});




// Endpoint for updating Condicionada data
app.put('/condicionada/:id', async (req, res) => {
const condicionadaId = req.params.id;
const {
  ID_NavioMain,
  ID_NavioSub,
  Data,
  Viagem,
  Servico,
  Berco,
  Posicao_Berco,
  OBS,
  Fatu,
  selectedRebocador,
} = req.body;

const IDCookie = req.headers['idcookie'];

try {
  const ID_Agencia = getUserIdFromIDCookie(IDCookie);
  // Convert the date to the desired format "yyyy/mm/dd" using moment.js
  const formattedDate = moment.utc(Data).format('YYYY/MM/DD');

  // Update the entry in the 'condicionado' table
  const query = `
    UPDATE Condicionado
    SET ID_NavioMain = ?, ID_NavioSub = ?, Data = ?, Viagem = ?, Servico = ?, Berco = ?, Posicao_Berco = ?, OBS = ?, Fatu = ?, Rebocador = ?
    WHERE ID = ? AND ID_Agencia = ?;
  `;

  pool.query(
    query,
    [
      ID_NavioMain,
      ID_NavioSub,
      formattedDate,
      Viagem,
      Servico,
      Berco,
      Posicao_Berco,
      OBS,
      Fatu,
      selectedRebocador,
      condicionadaId,
      ID_Agencia,
    ],
    async (err, results) => {
      if (err) {
        console.error('Error updating data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      // Check if any rows were affected by the update
      if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Condicionada not found' });
        return;
      }

      try {
        // Call the function to send the email and await its completion
        await sendEmail(
          ID_NavioMain,
          ID_Agencia,
          req.body,
          true,
          'ATUALIZAÇÃO DE REQUISIÇÃO CONDICIONADA DE SERVIÇOS DE PRATICAGEM',
          ID_NavioSub
        );
        res.json({ success: 'Condicionada atualizada com sucesso!' });
      } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Error sending email' });
      }
    }
  );
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});



// Endpoint for deleting a Condicionada
app.delete('/condicionada/:id', async (req, res) => {
const condicionadaID = req.params.id;
const IDCookie = req.headers['idcookie'];
const {
  ID_NavioMain,
  ID_NavioSub,
  Data,
  Viagem,
  Servico,
  Berco,
  Posicao_Berco,
  OBS,
  Fatu,
} = req.body;

try {
  const ID_agencia = getUserIdFromIDCookie(IDCookie);

  // Delete the condicionada from the 'condicionado' table
  const query = `
    DELETE FROM Condicionado
    WHERE ID = ? AND ID_agencia = ?;
  `;

  pool.query(query, [condicionadaID, ID_agencia], async (err, results) => {
    if (err) {
      console.error('Error deleting Condicionada:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Check if any rows were affected by the delete operation
    if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Condicionada not found' });
      return;
    }

    try {
      // Call the function to send the email and await its completion
      await sendEmail(
        ID_NavioMain,
        ID_agencia,
        req.body,
        true,
        'CANCELAMENTO DE REQUISIÇÃO CONDICIONADA DE SERVIÇOS DE PRATICAGEM',
        ID_NavioSub
      );
      res.json({ success: 'Requisição Condicionada Cancelada!' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Error sending email' });
    }
  });
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});





// Endpoint for retrieving requisicoes with current date
app.get('/requisicoes-current-date', (req, res) => {
  const maxRows = 10; // Set the maximum number of rows allowed

  const currentDate = new Date();
  const currentDateString = currentDate.toISOString().split('T')[0];

  const query = `
    SELECT r.*, n.Navio
    FROM requisicoes AS r
    INNER JOIN navios AS n ON r.ID_Navio = n.ID
    WHERE DATE(r.Data_requi) = '${currentDateString}'
    ORDER BY r.ID DESC
    LIMIT ?;
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection:', err);
      res.status(500).json({ error: 'Error getting connection' });
      return;
    }

    connection.query(query, [maxRows], (err, rows) => {
      connection.release();

      if (err) {
        console.error('Error executing query:', err);
        res.status(500).json({ error: 'Error executing query' });
        return;
      }

      res.json(rows);
    });
  });
});

// Endpoint for retrieving data from 'condicionado' table with current date
app.get('/condicionado-current-date', (req, res) => {
const currentDate = new Date();
const currentDateString = currentDate.toISOString().split('T')[0];

const query = `
  SELECT c.ID_NavioMain, c.ID_NavioSub, c.Servico, c.Data, n1.Navio AS NavioMain, n2.Navio AS NavioSub
  FROM Condicionado AS c
  INNER JOIN navios AS n1 ON c.ID_NavioMain = n1.ID
  INNER JOIN navios AS n2 ON c.ID_NavioSub = n2.ID
  WHERE c.Data >= '${currentDateString}';
`;

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error getting connection:', err);
    res.status(500).json({ error: 'Error getting connection' });
    return;
  }

  connection.query(query, (err, rows) => {
    connection.release();

    if (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ error: 'Error executing query' });
      return;
    }

    res.json(rows);
  });
});
});



// Endpoint for retrieving profile data
app.get('/profile', (req, res) => {
const IDCookie = req.headers['idcookie'];

try {
  const userID = getUserIdFromIDCookie(IDCookie);

  const queryAgencia = `
    SELECT nome_agencia,email
    FROM agencia
    WHERE ID = ?;
  `;

  const queryRequisicoes = `
    SELECT *
    FROM requisicoes
    WHERE ID_Agencia = ?
    ORDER BY Data_requi DESC;
  `;

  const queryNavios = `
    SELECT *
    FROM navios
    WHERE ID_agencia = ?;
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error establishing database connection:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    connection.query(queryAgencia, [userID], (err, agenciaRows) => {
      if (err) {
        console.error('Error fetching agencia:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      const nomeAgencia = agenciaRows[0].nome_agencia;
      const emailAgencia = agenciaRows[0].email;

      connection.query(queryRequisicoes, [userID], (err, requisicoesRows) => {
        if (err) {
          console.error('Error fetching requisicoes:', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }

        connection.query(queryNavios, [userID], (err, naviosRows) => {
          connection.release();

          if (err) {
            console.error('Error fetching navios:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
          }

          const profileData = {
            nomeAgencia: nomeAgencia,
            emailAgencia : emailAgencia,
            requisicoes: requisicoesRows,
            navios: naviosRows,
          };

          res.json(profileData);
        });
      });
    });
  });
} catch (error) {
  console.error('Error retrieving userID:', error);
  res.status(400).json({ error: 'Invalid IDCookie' });
}
});

//endpoint to update agencia email
app.put('/profile', async (req, res) => {
try {
  const { IDCookie, email } = req.body;

  // Verify the ID of the user
  const userID = getUserIdFromIDCookie(IDCookie);

  // Update the email in the "agencia" table
  const updateQuery = 'UPDATE agencia SET email = ? WHERE ID = ?';
  await new Promise((resolve, reject) => {
    pool.query(updateQuery, [email, userID], (error, results) => {
      if (error) {
        console.error('Error updating profile:', error);
        reject(error);
      } else {
        console.log(results);
        resolve(results);
      }
    });
  });

  res.json({ message: 'success' });
} catch (error) {
  console.error('Error updating profile:', error);
  res.status(500).json({ error: 'Failed to update email' });
}
});


// Endpoint for retrieving rebocadores
app.get('/rebocador', (req, res) => {
const maxRows = 10; // Set the maximum number of rows allowed

const query = `
  SELECT ID, nome, email
  FROM rebocadores
  LIMIT ?;
`;

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error getting connection:', err);
    res.status(500).json({ error: 'Error getting connection' });
    return;
  }

  try {
    const IDCookie = req.headers['idcookie'];
    const userID = getUserIdFromIDCookie(IDCookie);

    connection.query(query, [maxRows], (err, rows) => {
      connection.release();

      if (err) {
        console.error('Error executing query:', err);
        res.status(500).json({ error: 'Error executing query' });
        return;
      }

      res.json(rows);
    });
  } catch (error) {
    console.error('Error retrieving userID:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});
});





// Logout endpoint
app.post('/logout', (req, res) => {
req.session.isLoggedIn = false;
req.session.username = ''; // Clear the stored username
res.clearCookie('isLoggedIn');
res.sendStatus(200);
});


// Login endpoint
app.post('/login', (req, res) => {
const { username, password } = req.body;

console.log('Received login request:', username ); // Add this line to log the received username

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error getting connection:', err);
    res.status(500).json({ error: 'Error getting connection' });
    return;
  }

  const query = `
    SELECT *
    FROM usuarios
    WHERE user = ?;
  `;

  connection.query(query, [username], (err, rows) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ error: 'Error executing query' });
      return;
    }

    if (rows.length === 0) {
      // User not found
      console.log('User not found:', username);
      req.flash('error', 'Invalid credentials');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const savedPassword = rows[0].password;

    // Compare the provided password with the saved hashed password
    bcrypt.compare(password, savedPassword, (bcryptErr, result) => {
      if (bcryptErr) {
        console.error('Error comparing passwords:', bcryptErr);
        req.flash('error', 'Invalid credentials');
        res.status(500).json({ error: 'Error comparing passwords' });
        return;
      }

      if (!result) {
        // Passwords do not match
        console.log('Invalid password for user:', username);
        req.flash('error', 'Invalid credentials');
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Login successful
      const jwtToken = jwt.sign(
        { id: rows[0].ID_agencia, username: username }, process.env.SECRET

      )
      console.log('Login successful:', username);
      console.log('token: ',jwtToken);
      
      req.flash('success', 'Login successful');  
      res.json({ success : 'Seja Bem Vindo!' , token: jwtToken });
    });
  });
});
});  


app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});