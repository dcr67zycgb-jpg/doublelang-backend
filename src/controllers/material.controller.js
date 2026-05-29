const pool = require('../config/db');

const createMaterial = async (req, res) => {
  const { title, material_type, content, file_url } = req.body;
  const teacher_id = req.user.id;
  try {
    const result = await pool.query(
      'INSERT INTO lesson_materials (teacher_id, title, material_type, content, file_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [teacher_id, title, material_type, content || null, file_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании материала' });
  }
};

const getMaterials = async (req, res) => {
  const teacher_id = req.user.id;
  try {
    const result = await pool.query(
      'SELECT * FROM lesson_materials WHERE teacher_id = $1 ORDER BY created_at DESC',
      [teacher_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении материалов' });
  }
};

const updateMaterial = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const teacher_id = req.user.id;
  try {
    const result = await pool.query(
      'UPDATE lesson_materials SET title = $1 WHERE id = $2 AND teacher_id = $3 RETURNING *',
      [title, id, teacher_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Материал не найден или у вас нет прав на его изменение' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении материала' });
  }
};

const deleteMaterial = async (req, res) => {
  const { id } = req.params;
  const teacher_id = req.user.id;
  try {
    await pool.query('DELETE FROM lesson_materials WHERE id = $1 AND teacher_id = $2', [id, teacher_id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении материала' });
  }
};

module.exports = { createMaterial, getMaterials, updateMaterial, deleteMaterial };
