const jwt = require('jsonwebtoken');
require('dotenv').config();

const getUserFromToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ message: 'Token not found' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, users) => {
    if (err) return res.status(403).json({ message: 'Token invalid' });
    req.users = users;
    next();
  });
};

module.exports = getUserFromToken;
