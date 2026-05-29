const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const assignHomework = async (req, res) => {
  const { student_email, title, board_content } = req.body;
  const teacher_id = req.user.id;
  const hw_id = `hw_${uuidv4()}`;
  try {
    await pool.query(
      'INSERT INTO homework (hw_id, teacher_id, student_email, title, board_content) VALUES ($1, $2, $3, $4, $5)',
      [hw_id, teacher_id, student_email.toLowerCase().trim(), title, JSON.stringify(board_content || {})]
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
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [student_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ученик не найден' });
    }
    const student_email = userResult.rows[0].email;
    const result = await pool.query(
      'SELECT hw_id, title, status FROM homework WHERE student_email = $1 ORDER BY id DESC',
      [student_email]
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
      'SELECT hw_id, title, student_email, status FROM homework WHERE teacher_id = $1 ORDER BY id DESC',
      [teacher_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getHomeworkByStudentEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email обязателен' });
  try {
    const result = await pool.query(
      'SELECT hw_id, title, status FROM homework WHERE student_email = $1 ORDER BY id DESC',
      [email.toLowerCase().trim()]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = { assignHomework, getStudentHomework, getTeacherHomework, getHomeworkByStudentEmail };
