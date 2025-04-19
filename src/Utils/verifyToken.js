// verifyToken.js

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  // Try reading token from header first
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader && authHeader.split(' ')[1]; // in case it's 'Bearer token'
  
  // Fallback: try reading token from cookies
  const tokenFromCookie = req.cookies?.jwt;

  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }

  jwt.verify(token, 'thesecretofalifetime', (err, decoded) => {
    if (err) {
      console.log('Invalid or expired token');
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }

    req.user = decoded;
    next();
  });
}

module.exports = verifyToken;
