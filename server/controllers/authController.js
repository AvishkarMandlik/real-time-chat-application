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
  const { usernameOrEmail, password } = req.body;

  try {
    // Find user by either username or email
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    // console.log("Login attempt for:", usernameOrEmail);
    // console.log("User found:", user);

    if (!user) return res.status(401).json({ message: "Invalid Username or Email" });

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid Password" });

    res.status(200).json({ message: "Login successful", user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { registerUser, loginUser };
