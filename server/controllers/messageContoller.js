const Message = require('../models/Message');

// Get all messages in a room
exports.getMessagesByRoom = async (req, res) => {
  const { room } = req.params;

  try {
    const messages = await Message.find({ room }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// Add a new message to a room
exports.createMessage = async (req, res) => {
  const { room, username, message } = req.body;

  if (!room || !username || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const newMessage = new Message({ room, username, message, timestamp: new Date() });
    await newMessage.save();
    res.status(201).json({ message: 'Message sent successfully', data: newMessage });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};
