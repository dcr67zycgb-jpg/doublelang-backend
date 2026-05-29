const { Router } = require('express');
const { getScheduleForTeacher, createScheduleEntry, deleteScheduleEntry } = require('../controllers/schedule.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', authenticateToken, authorizeRole(['teacher']), getScheduleForTeacher);
router.post('/', authenticateToken, authorizeRole(['teacher']), createScheduleEntry);
router.delete('/:id', authenticateToken, authorizeRole(['teacher']), deleteScheduleEntry);

module.exports = router;
