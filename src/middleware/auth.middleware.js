const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'project-vibe-super-secret-key';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'Требуется токен авторизации' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Невалидный или просроченный токен' });
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Доступ запрещен для вашей роли' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
