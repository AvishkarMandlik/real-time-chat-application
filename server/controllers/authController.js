const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs')

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Format username: First letter capital, rest lowercase, remove spaces
    let formattedUsername = username.trim().charAt(0).toUpperCase() + username.trim().slice(1).toLowerCase();
    formattedUsername = formattedUsername.replace(/\s+/g, ""); // Remove spaces

    let newUsername = formattedUsername;
    let count = 1;

    while (await User.findOne({ username: newUsername })) {
      newUsername = formattedUsername + count;
      count++;
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ username: newUsername, password: hashedPassword, email });
    await user.save();

    let message = newUsername === formattedUsername
      ? "User registered successfully"
      : `Username already exists, so we modified your username to ${newUsername}`;

    res.status(201).json({ success: true, username: newUsername, message });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) return res.status(401).json({ message: 'Invalid credentials' });

    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { registerUser, loginUser };
