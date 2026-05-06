const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (!decoded.grade || !decoded.institutionName || !decoded.institutionType || !decoded.name) {
      try {
        const user = await User.findById(decoded.id).select('name gradeYear institutionType institutionName').lean();
        if (user) {
          req.user.grade = user.gradeYear;
          req.user.name = user.name;
          req.user.institutionType = user.institutionType;
          req.user.institutionName = user.institutionName;
        }
      } catch {}
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = protect;