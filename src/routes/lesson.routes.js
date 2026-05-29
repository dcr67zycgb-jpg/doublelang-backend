const { Router } = require('express');
const { getLessons } = require('../controllers/lesson.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', authenticateToken, getLessons);

module.exports = router;
