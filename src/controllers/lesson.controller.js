const pool = require('../config/db');

const getLessons = async (req, res) => {
  const teacher_id = req.user.id;
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Доступ разрешен только для учителей' });
    }
    const result = await pool.query(
      'SELECT room_id, created_at FROM lessons WHERE teacher_id = $1 ORDER BY id DESC',
      [teacher_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = { getLessons };
