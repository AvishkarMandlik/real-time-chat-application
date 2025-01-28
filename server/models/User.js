const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Ensure password is hashed before saving in a production environment
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
