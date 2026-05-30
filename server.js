require('dotenv').config({ path: require('path').join(__dirname, 'DoubleLang-backend/.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const pool = require('./src/config/db');
const userRoutes = require('./src/routes/user.routes');
const homeworkRoutes = require('./src/routes/homework.routes');
const scheduleRoutes = require('./src/routes/schedule.routes');
const lessonRoutes = require('./src/routes/lesson.routes');
const materialRoutes = require('./src/routes/material.routes');
const { initSocket } = require('./src/socket/socketHandler');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  /https:\/\/.*\.vercel\.app$/,
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
  },
  credentials: true,
}));
app.use(express.json());

// Маршруты API
app.use('/api', userRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/materials', materialRoutes);

// Инициализация базы данных
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
        phone VARCHAR(50),
        about TEXT,
        language VARCHAR(50),
        timezone VARCHAR(50) DEFAULT 'UTC+3',
        avatar_url VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lesson_materials (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        material_type VARCHAR(50) NOT NULL,
        content JSONB,
        file_url VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) UNIQUE NOT NULL,
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        board_content JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_email VARCHAR(255) DEFAULT '',
        lesson_date DATE NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        end_time VARCHAR(5) NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS homework (
        id SERIAL PRIMARY KEY,
        hw_id VARCHAR(255) UNIQUE NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_email VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        board_content JSONB,
        status VARCHAR(50) DEFAULT 'assigned',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_homework_teacher ON homework(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_homework_student_email ON homework(student_email);
      CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule(teacher_id);
    `);

    console.log('✅ База данных инициализирована');
  } catch (err) {
    console.error('❌ Ошибка инициализации БД:', err.message);
  }
}

initSocket(io, pool);

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
  });
});
