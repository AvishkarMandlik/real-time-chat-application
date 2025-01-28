const express = require('express');
const { getMessagesByRoom, createMessage } = require('../controllers/messageContoller');

const router = express.Router();

// Get all messages in a specific room
router.get('/:room', getMessagesByRoom);

// Add a new message to a room
router.post('/', createMessage);

module.exports = router;
