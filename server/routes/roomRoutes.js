const express = require('express');
const { createRoom, getRooms, getRoomById, deleteRoom } = require('../controllers/roomContoller');

const router = express.Router();

router.post('/', createRoom);
router.get('/', getRooms);
router.get('/:id', getRoomById);
router.delete('/:id', deleteRoom);

module.exports = router;
