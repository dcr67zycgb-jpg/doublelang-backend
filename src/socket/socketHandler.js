const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'project-vibe-super-secret-key';

const initSocket = (io, pool) => {

  // Middleware для аутентификации сокетов по JWT токену
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Аутентификация не удалась: токен отсутствует.'));
    }
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return next(new Error('Аутентификация не удалась: невалидный токен.'));
      }
      socket.user = user; // Сохраняем данные пользователя (id, role, name) в объект сокета
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`Аутентифицированный пользователь [${socket.user.name}] подключился:`, socket.id);

    socket.on('join_room', (roomId) => {
      const { id: userId, name: userName } = socket.user;

      socket.join(roomId);
      console.log(`Пользователь ${userName} (${userId}) присоединился к комнате: ${roomId}`);
      socket.to(roomId).emit('system_message', `👋 ${userName} присоединился к уроку`);
      socket.to(roomId).emit('user_joined', socket.id);

      // WebRTC сигнализация
      socket.on('webrtc_offer', (offer, targetSocketId) => {
        socket.to(targetSocketId).emit('webrtc_offer', offer, socket.id);
      });
      socket.on('webrtc_answer', (answer, targetSocketId) => {
        socket.to(targetSocketId).emit('webrtc_answer', answer, socket.id);
      });
      socket.on('webrtc_ice_candidate', (candidate, targetSocketId) => {
        socket.to(targetSocketId).emit('webrtc_ice_candidate', candidate, socket.id);
      });

      // Интерактивная доска
      socket.on('board_change', async (newBlocks) => {
        socket.to(roomId).emit('update_board', newBlocks);
        try {
          const teacherId = socket.user.role === 'teacher' ? userId : null;
          await pool.query(
            `INSERT INTO lessons (room_id, teacher_id, board_content)
             VALUES ($1, $2, $3)
             ON CONFLICT (room_id) DO UPDATE SET board_content = $3, updated_at = NOW()`,
            [roomId, teacherId, JSON.stringify(newBlocks)]
          );
        } catch (err) {
          console.error('Ошибка при сохранении доски:', err.message);
        }
      });

      socket.on('draw_line', (line) => {
        socket.to(roomId).emit('draw_line', line);
      });

      // Загрузка состояния доски
      socket.on('load_board', async () => {
        try {
          const result = await pool.query(
            'SELECT board_content FROM lessons WHERE room_id = $1',
            [roomId]
          );
          if (result.rows.length > 0) {
            socket.emit('load_board', result.rows[0].board_content);
          }
        } catch (err) {
          console.error('Ошибка при загрузке доски:', err.message);
        }
      });

      // Чат
      socket.on('chat_message', (message) => {
        io.to(roomId).emit('new_chat_message', {
          text: message,
          sender: userName,
          id: socket.id,
          timestamp: new Date(),
        });
      });

      socket.on('disconnect', () => {
        console.log(`Пользователь ${userName} (${userId}) отключился от комнаты: ${roomId}`);
        socket.to(roomId).emit('system_message', `🚪 ${userName} покинул урок`);
        socket.to(roomId).emit('user_disconnected', socket.id);
      });
    });

    socket.on('disconnect', () => {
      console.log(`Пользователь [${socket.user.name}] отключился:`, socket.id);
    });
  });
};

module.exports = { initSocket };
