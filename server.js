require('dotenv').config({ path: require('path').join(__dirname, 'DoubleLang-backend/.env') }); // Загружаем переменные окружения из DoubleLang-backend/.env
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { Pool } = require('pg'); // Библиотека для PostgreSQL
const cors = require('cors'); // 1. Подключаем библиотеку CORS
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'doublelang-super-secret-key';

// Настраиваем подключение к базе
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Автоматически создаем таблицы при запуске сервера
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY
      );
    `);

    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student';
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(50) UNIQUE NOT NULL,
        board_content TEXT
      );
    `);

    await pool.query(`
      ALTER TABLE lessons
        ADD COLUMN IF NOT EXISTS teacher_id INTEGER;
    `);

    console.log('✅ База данных обновлена: добавлены пользователи!');
  } catch (err) {
    console.error('❌ Ошибка БД:', err.message);
  }
}
initDB();
 

const app = express();
app.use(express.json()); // Позволяет серверу читать логин и пароль
app.use(cors()); // 2. Разрешаем запросы с других портов

// 3. ДОБАВЛЯЕМ НОВЫЙ МАРШРУТ ДЛЯ СПИСКА УРОКОВ
app.get('/api/lessons', async (req, res) => {
  const { teacher_id } = req.query;
  try {
    let result;
    if (teacher_id) {
      // Ищем уроки только конкретного учителя
      result = await pool.query('SELECT room_id FROM lessons WHERE teacher_id = $1 ORDER BY id DESC', [teacher_id]);
    } else {
      result = await pool.query('SELECT room_id FROM lessons ORDER BY id DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении уроков' });
  }
});

// 4. Регистрация нового пользователя
app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hash, role]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка регистрации:', err.message);
    res.status(500).json({ error: 'Ошибка регистрации. Возможно, email уже занят.' });
  }
});

// 5. Вход в систему (Логин)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, SECRET_KEY, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } else {
      res.status(401).json({ error: 'Неверный логин или пароль' });
    }
  } catch (err) {
    console.error('Ошибка логина:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

const server = http.createServer(app);

// Настраиваем CORS, чтобы наш фронтенд (React) мог беспрепятственно подключиться
const io = new Server(server, { 
  cors: { origin: "*" } 
});

io.on('connection', async (socket) => {
  const roomId = socket.handshake.query.roomId;
  const userName = socket.handshake.query.userName;
  const userId = socket.handshake.query.userId; // Получаем ID пользователя

  socket.join(roomId);
  console.log(`${userName} (${socket.id}) зашел в комнату: ${roomId}`);

  // 1. ЗАГРУЖАЕМ ИСТОРИЮ (Распаковываем JSON из базы)
  try {
    const result = await pool.query('SELECT board_content FROM lessons WHERE room_id = $1', [roomId]);
    if (result.rows.length > 0 && result.rows[0].board_content) {
      // Превращаем текст из БД обратно в массив
      const blocksArray = JSON.parse(result.rows[0].board_content);
      socket.emit('update_board', blocksArray);
    }
  } catch (err) {
    console.error('Ошибка при загрузке доски:', err.message);
  }

  socket.to(roomId).emit('system_message', `👋 ${userName} присоединился к уроку`);
  // --- WebRTC Сигналинг ---
  socket.on('webrtc_offer', (offer) => {
    socket.to(roomId).emit('webrtc_offer', offer);
  });
  socket.on('webrtc_answer', (answer) => {
    socket.to(roomId).emit('webrtc_answer', answer);
  });
  socket.on('webrtc_ice_candidate', (candidate) => {
    socket.to(roomId).emit('webrtc_ice_candidate', candidate);
  });
  // 2. СОХРАНЯЕМ ИЗМЕНЕНИЯ (Упаковываем массив в JSON)
  socket.on('board_change', async (newBlocks) => {
    // Пересылаем массив другим участникам (Socket.io сам умеет передавать массивы)
    socket.to(roomId).emit('update_board', newBlocks);

    try {
      // Упаковываем массив в строку для PostgreSQL
      const jsonString = JSON.stringify(newBlocks);
      const teacherId = (userId && userId !== 'null') ? userId : null;

      // Сохраняем урок с привязкой к ID учителя
      await pool.query(`
        INSERT INTO lessons (room_id, teacher_id, board_content)
        VALUES ($1, $2, $3)
        ON CONFLICT (room_id) DO UPDATE SET board_content = $3
      `, [roomId, teacherId, jsonString]);
    } catch (err) {
      console.error('Ошибка при сохранении:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`${userName} отключился`);
    socket.to(roomId).emit('system_message', `🚪 ${userName} покинул урок`);
  });
});

server.listen(3000, () => {
  console.log('WebSocket сервер запущен на порту 3000 🚀');
});
