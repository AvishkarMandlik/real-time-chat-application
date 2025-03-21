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
const authRoutes = require('./routes/authRoutes');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigins = ['http://localhost:3000', 'https://real-time-chat-app-7gqk.onrender.com'];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  },
});

app.use(express.json());
app.use(cors());

app.use('/api/auth', require('./routes/authRoutes'));
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
      socket.broadcast.to(room).emit('userJoined', { id: socket.id, username });

      onlineUsers[room] = [...(onlineUsers[room] || []), username];
      io.to(room).emit('onlineUsers', onlineUsers[room]);
  });

  socket.on('chatMessage', async ({ room, username, message }) => {
      const newMessage = await new Message({ room, username, message }).save();
      io.to(room).emit('chatMessage', newMessage);
  });

  socket.on('typing', ({ username, room }) => socket.to(room).emit('userTyping', `${username} is typing...`));
  socket.on('stopTyping', ({ room }) => socket.to(room).emit('userStoppedTyping'));

  socket.on('leaveRoom', ({ username, room }) => {
      socket.leave(room);
      onlineUsers[room] = onlineUsers[room]?.filter(user => user !== username);
      io.to(room).emit('onlineUsers', onlineUsers[room]);
      socket.broadcast.to(room).emit('userLeft', `${username} has left the chat`);
  });
  socket.on('screenShare', ({ room, isSharing }) => {
    socket.broadcast.to(room).emit('screenShare', { isSharing, userId: socket.id });
  });
  socket.on('offer', ({ offer, to }) => io.to(to).emit('offer', { offer, from: socket.id }));
  socket.on('answer', ({ answer, to }) => io.to(to).emit('answer', { answer, from: socket.id }));
  socket.on('candidate', ({ candidate, to }) => io.to(to).emit('candidate', { candidate, from: socket.id }));

  socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      Object.keys(onlineUsers).forEach(room => {
          onlineUsers[room] = onlineUsers[room].filter(user => user !== socket.id);
          io.to(room).emit('onlineUsers', onlineUsers[room]);
      });
      io.emit('userLeft', socket.id);
  });
});





// io.on('connection', (socket) => {
//   console.log('New user connected:', socket.id);

//   socket.on('joinRoom', async ({ username, room }) => {
//     socket.join(room);

//     const messages = await Message.find({ room }).sort('createdAt');
//     socket.emit('chatHistory', messages);

//     socket.broadcast.to(room).emit('userJoined', `${username} has joined the chat`);

//     if (!onlineUsers[room]) {
//       onlineUsers[room] = [];
//     }
//     if (!onlineUsers[room].includes(username)) {
//       onlineUsers[room].push(username);
//     }

//     // Emit the updated list of online users to the room
//     io.to(room).emit('onlineUsers', onlineUsers[room]);
//   });

//   socket.on('chatMessage', async ({ room, username, message }) => {
//     const newMessage = new Message({ room, username, message });
//     await newMessage.save();
//     io.to(room).emit('chatMessage', newMessage);
//   });

//   socket.on('typing', ({ username, room }) => {
//     socket.to(room).emit('userTyping', `${username} is typing...`);
//   });

//   socket.on('stopTyping', ({ room }) => {
//     socket.to(room).emit('userStoppedTyping');
//   });

//   socket.on('leaveRoom', ({ username, room }) => {
//     socket.leave(room);

//     if (onlineUsers[room]) {
//       onlineUsers[room] = onlineUsers[room].filter((user) => user !== username);
//       // Emit the updated list of online users to the room
//       io.to(room).emit('onlineUsers', onlineUsers[room]);
//     }

//     socket.broadcast.to(room).emit('userLeft', `${username} has left the chat`);
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);

//     for (const room in onlineUsers) {
//       onlineUsers[room] = onlineUsers[room].filter((user) => user !== socket.id);
//       io.to(room).emit('onlineUsers', onlineUsers[room]);
//     }
//   });
// });


// io.on('connection', (socket) => {
//   console.log('New user connected:', socket.id);

//   socket.on('joinRoom', ({ username, room }) => {
//       socket.join(room);
//       io.to(room).emit('onlineUsers', `${username} joined`);

//       // Notify existing users to start WebRTC signaling
//       socket.broadcast.to(room).emit('userJoined', { id: socket.id, username });
//   });
//   socket.on('screenShare', ({ room, isSharing }) => {
//     socket.broadcast.to(room).emit('screenShare', { isSharing, userId: socket.id });
//   });

//   socket.on('offer', ({ offer, to }) => {
//       io.to(to).emit('offer', { offer, from: socket.id });
//   });

//   socket.on('answer', ({ answer, to }) => {
//       io.to(to).emit('answer', { answer, from: socket.id });
//   });

//   socket.on('candidate', ({ candidate, to }) => {
//       io.to(to).emit('candidate', { candidate, from: socket.id });
//   });

//   socket.on('disconnect', () => {
//       console.log('User disconnected:', socket.id);
//       io.emit('userLeft', socket.id);
//   });
// });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
