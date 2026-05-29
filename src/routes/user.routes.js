const { Router } = require('express');
const { registerUser, loginUser, updateProfile, getProfile, getAllUsers } = require('../controllers/user.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/users', authenticateToken, authorizeRole(['teacher', 'admin']), getAllUsers);
router.put('/profile/:id', authenticateToken, updateProfile);
router.get('/profile/:id', authenticateToken, getProfile);

module.exports = router;
