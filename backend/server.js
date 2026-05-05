const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('./config/db');
require('./config/redis');

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/question', require('./routes/questionRoutes'));
app.use('/api/status', require('./routes/statusRoutes'));
app.use('/api/refine', require('./routes/refineRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));
app.use('/api/events', require('./routes/sseRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));

// BullMQ workers disabled — slides rendered client-side, HeyGen paused
// To re-enable: uncomment below
// require('./workers/animationWorker');
// require('./workers/videoWorker');

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
