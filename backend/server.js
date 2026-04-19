const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
require('./config/redis');  

dotenv.config();
connectDB();
require('./config/redis');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/question', require('./routes/questionRoutes'));
app.use('/api/status',   require('./routes/statusRoutes'));
app.use('/api/claude',   require('./routes/geminiRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});