// verifyToken.js

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  console.log('Headers:', req.headers); // Log the headers to check if the Authorization header is present
  const token = req.headers.authorization;

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, 'thesecretofalifetime', (err, decoded) => {
    if (err) {
      console.log('Invalid token');
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = decoded;
    console.log('Decoded token:', decoded);
    next();
  });
}

module.exports = verifyToken;
