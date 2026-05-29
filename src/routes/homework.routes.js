const { Router } = require('express');
const { assignHomework, getStudentHomework, getTeacherHomework, getHomeworkByStudentEmail } = require('../controllers/homework.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const router = Router();

router.post('/assign', authenticateToken, authorizeRole(['teacher']), assignHomework);
router.get('/student', authenticateToken, authorizeRole(['student']), getStudentHomework);
router.get('/teacher', authenticateToken, authorizeRole(['teacher']), getTeacherHomework);
router.get('/student-by-email', authenticateToken, authorizeRole(['teacher']), getHomeworkByStudentEmail);

module.exports = router;
