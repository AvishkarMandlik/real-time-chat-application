const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const Message = require('./models/Message');
const Room = require('./models/Room');
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const authRoutes = require('./routes/auth');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
});

app.use(express.json());
app.use(cors());

app.use('/api/auth', require('./routes/auth'));
app.use('/rooms', roomRoutes);
app.use('/messages', messageRoutes);
app.use('/api', authRoutes);

const onlineUsers = {}; // Tracks users in each room

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('joinRoom', async ({ username, room }) => {
    socket.join(room);

    const messages = await Message.find({ room }).sort('createdAt');
    socket.emit('chatHistory', messages);

    socket.broadcast.to(room).emit('userJoined', `${username} has joined the chat`);

    if (!onlineUsers[room]) {
      onlineUsers[room] = [];
    }
    if (!onlineUsers[room].includes(username)) {
      onlineUsers[room].push(username);
    }

    // Emit the updated list of online users to the room
    io.to(room).emit('onlineUsers', onlineUsers[room]);
  });

  socket.on('chatMessage', async ({ room, username, message }) => {
    const newMessage = new Message({ room, username, message });
    await newMessage.save();
    io.to(room).emit('chatMessage', newMessage);
  });

  socket.on('leaveRoom', ({ username, room }) => {
    socket.leave(room);

    if (onlineUsers[room]) {
      onlineUsers[room] = onlineUsers[room].filter((user) => user !== username);
      // Emit the updated list of online users to the room
      io.to(room).emit('onlineUsers', onlineUsers[room]);
    }

    socket.broadcast.to(room).emit('userLeft', `${username} has left the chat`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    for (const room in onlineUsers) {
      onlineUsers[room] = onlineUsers[room].filter((user) => user !== socket.id);
      io.to(room).emit('onlineUsers', onlineUsers[room]);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
