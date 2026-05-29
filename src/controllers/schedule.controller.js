const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const getScheduleForTeacher = async (req, res) => {
  const teacher_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email
       FROM schedule s
       JOIN users u ON s.student_id = u.id
       WHERE s.teacher_id = $1
       ORDER BY s.lesson_date, s.start_time`,
      [teacher_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const createScheduleEntry = async (req, res) => {
  const { student_email, title, lesson_date, start_time, end_time } = req.body;
  const teacher_id = req.user.id;
  const room_id = `sched_${uuidv4()}`;
  try {
    const studentResult = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND role = 'student'",
      [student_email.toLowerCase().trim()]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ученик с таким email не найден' });
    }
    const student_id = studentResult.rows[0].id;
    const result = await pool.query(
      `INSERT INTO schedule (teacher_id, student_id, title, lesson_date, start_time, end_time, room_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [teacher_id, student_id, title, lesson_date, start_time, end_time, room_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const deleteScheduleEntry = async (req, res) => {
  const { id } = req.params;
  const teacher_id = req.user.id;
  try {
    await pool.query('DELETE FROM schedule WHERE id = $1 AND teacher_id = $2', [id, teacher_id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = { getScheduleForTeacher, createScheduleEntry, deleteScheduleEntry };
