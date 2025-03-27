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

const allowedOrigins = ['http://localhost:3000', 'https://real-time-chat-application-git-main-avishkar-mandliks-projects.vercel.app'];
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

// app.use('/api/auth', require('./routes/authRoutes'));
app.use('/rooms', roomRoutes);
app.use('/messages', messageRoutes);
app.use('/api', authRoutes);

const onlineUsers = {}; // Tracks users in each room

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Combined room joining for both chat and video
  socket.on('joinRoom', async ({ username, room, isVideoRoom = false }) => {
    socket.join(room);

    if (!onlineUsers[room]) {
      onlineUsers[room] = [];
    }

    // Add user to room
    onlineUsers[room].push({ userId: socket.id, username });

    // Send chat history
    const messages = await Message.find({ room }).sort('createdAt');
    socket.emit('chatHistory', messages);

    // Different events for video vs regular chat
    if (isVideoRoom) {
      // Video room specific events
      socket.broadcast.to(room).emit('newUser', { userId: socket.id, username });
      io.to(room).emit('participantCount', { count: onlineUsers[room].length });
    } else {
      // Regular chat events
      socket.broadcast.to(room).emit('userJoined', { id: socket.id, username });
    }

    // Update online users for both cases
    io.to(room).emit('onlineUsers', onlineUsers[room]);
  });

  // Video chat signaling
  socket.on('offer', ({ offer, to, from, username }) => {
    io.to(to).emit('offer', { offer, from, username });
  });

  socket.on('answer', ({ answer, to, username }) => {
    io.to(to).emit('answer', { answer, from: socket.id, username });
  });

  socket.on('candidate', ({ candidate, to }) => {
    io.to(to).emit('candidate', { candidate, from: socket.id });
  });

  // Screen sharing
  socket.on('screenShareStarted', ({ room, userId }) => {
    socket.to(room).emit('screenShareStarted', { userId });
  });

  socket.on('screenShareEnded', ({ room, userId }) => {
    socket.to(room).emit('screenShareEnded', { userId });
  });

  // Raise hand feature
  socket.on('raiseHand', ({ room, username, isRaised }) => {
    socket.to(room).emit('handRaised', { username, isRaised });
  });

  // Reactions
  socket.on('sendReaction', ({ room, username, reaction }) => {
    socket.to(room).emit('reaction', { username, reaction });
  });

  // Chat messages
  socket.on('chatMessage', async ({ room, username, message }) => {
    const newMessage = await new Message({ room, username, message }).save();
    io.to(room).emit('chatMessage', newMessage);
  });

  // Typing indicators
  socket.on('typing', ({ username, room }) => {
    socket.to(room).emit('userTyping', `${username} is typing...`);
  });

  socket.on('stopTyping', ({ room }) => {
    socket.to(room).emit('userStoppedTyping');
  });

  // Leaving room
  socket.on('leaveRoom', ({ username, room, isVideoRoom = false }) => {
    if (onlineUsers[room]) {
      onlineUsers[room] = onlineUsers[room].filter(user => user.userId !== socket.id);
      
      if (isVideoRoom) {
        socket.broadcast.to(room).emit('userLeft', { userId: socket.id, username });
        io.to(room).emit('participantCount', { count: onlineUsers[room].length });
      } else {
        socket.broadcast.to(room).emit('userLeft', `${username} has left the chat`);
      }
      
      io.to(room).emit('onlineUsers', onlineUsers[room]);
    }
    socket.leave(room);
  });

  // Disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    Object.keys(onlineUsers).forEach(room => {
      const userIndex = onlineUsers[room].findIndex(user => user.userId === socket.id);
      if (userIndex !== -1) {
        const username = onlineUsers[room][userIndex].username;
        onlineUsers[room].splice(userIndex, 1);
        io.to(room).emit('userLeft', { userId: socket.id, username });
        io.to(room).emit('onlineUsers', onlineUsers[room]);
        io.to(room).emit('participantCount', { count: onlineUsers[room].length });
      }
    });
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
