const jwt = require('jsonwebtoken');

exports.generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });

exports.generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });

exports.verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
