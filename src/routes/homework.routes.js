const { Router } = require('express');
const { assignHomework, getStudentHomework, getTeacherHomework, getHomeworkForStudentByTeacher } = require('../controllers/homework.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const router = Router();

router.post('/assign', authenticateToken, authorizeRole(['teacher']), assignHomework);
router.get('/student', authenticateToken, authorizeRole(['student']), getStudentHomework);
router.get('/teacher', authenticateToken, authorizeRole(['teacher']), getTeacherHomework);
router.get('/student-by-teacher', authenticateToken, authorizeRole(['teacher']), getHomeworkForStudentByTeacher);

module.exports = router;
