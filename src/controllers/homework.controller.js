const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const assignHomework = async (req, res) => {
  const { student_id, title, board_content } = req.body;
  const teacher_id = req.user.id;
  const hw_id = `hw_${uuidv4()}`;
  try {
    const studentCheck = await pool.query("SELECT role FROM users WHERE id = $1 AND role = 'student'", [student_id]);
    if (studentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Ученик с таким ID не найден.' });
    }

    await pool.query(
      'INSERT INTO homework (hw_id, teacher_id, student_id, title, board_content) VALUES ($1, $2, $3, $4, $5)',
      [hw_id, teacher_id, student_id, title, JSON.stringify(board_content || {})]
    );
    res.json({ success: true, hw_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при назначении ДЗ' });
  }
};

const getStudentHomework = async (req, res) => {
  const student_id = req.user.id;
  try {
    const result = await pool.query(
      'SELECT hw_id, title, status FROM homework WHERE student_id = $1 ORDER BY id DESC',
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getTeacherHomework = async (req, res) => {
  const teacher_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT h.hw_id, h.title, h.status, u.name as student_name, u.email as student_email
       FROM homework h JOIN users u ON h.student_id = u.id
       WHERE h.teacher_id = $1 ORDER BY h.id DESC`,
      [teacher_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getHomeworkForStudentByTeacher = async (req, res) => {
  const { student_id } = req.query;
  const teacher_id = req.user.id;

  if (!student_id) return res.status(400).json({ error: 'student_id обязателен' });

  try {
    const result = await pool.query(
      `SELECT hw_id, title, status
       FROM homework
       WHERE student_id = $1 AND teacher_id = $2
       ORDER BY id DESC`,
      [student_id, teacher_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = { assignHomework, getStudentHomework, getTeacherHomework, getHomeworkForStudentByTeacher };
