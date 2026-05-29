const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'project-vibe-super-secret-key';

const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email.toLowerCase().trim(), hashedPassword, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const updateProfile = async (req, res) => {
  const { id } = req.params;
  const { name, phone, about, language, timezone } = req.body;

  if (req.user.id !== parseInt(id, 10)) {
    return res.status(403).json({ error: 'Доступ запрещен: вы можете изменять только свой профиль' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET name=$1, phone=$2, about=$3, language=$4, timezone=$5 WHERE id=$6 RETURNING id, name, email, role, phone, about, language, timezone',
      [name, phone || '', about || '', language || '', timezone || 'UTC+3', id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getProfile = async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== parseInt(id, 10)) {
    return res.status(403).json({ error: 'Доступ запрещен: вы можете просматривать только свой профиль' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone, about, language, timezone FROM users WHERE id=$1',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone, about, language, timezone, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = { registerUser, loginUser, updateProfile, getProfile, getAllUsers };
