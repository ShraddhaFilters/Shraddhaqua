require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.post('/submit-form', async (req, res) => {
  const { name, email, phone, description } = req.body;

  // Validate required fields
  if (!name || !phone || !email ||!description) {
    return res.status(400).send("All fields are required.");
  }

  // Format the message to send
  const message = `New submission:
Name: ${name || "N/A"}
Phone: ${phone || "N/A"}
Email: ${email || "N/A"}
Message: ${description || "N/A"}`;

  try {
    // Send the message to the Telegram group
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message
    });

    // Send success response to frontend
    res.status(200).send("Message sent to our team!");
  } catch (err) {
    console.error("Telegram API Error:", err.message);
    res.status(500).send("Failed to send message.");
  }
});

// Start the server
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
