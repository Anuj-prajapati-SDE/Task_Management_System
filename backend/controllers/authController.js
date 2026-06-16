const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendEmail, emailTemplates } = require('../utils/email');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const allowedRole = ['user', 'admin', 'superadmin'].includes(role) ? role : 'user';

    const user = await User.create({ name, email, password, role: allowedRole, emailVerificationToken: verificationToken });

    const verifyLink = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    await sendEmail({ to: email, subject: 'Verify your email', html: emailTemplates.verifyEmail(name, verifyLink) }).catch(() => {});

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

    res.status(201).json({ success: true, message: 'Registered successfully', data: { user, accessToken, refreshToken } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.canRegister = async (req, res) => {
  try {
    const userCount = await User.countDocuments();

    res.status(200).json({
      success: true,
      canRegister: userCount === 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });

    user.lastLogin = new Date();
    user.loginHistory.push({ ip: req.ip, userAgent: req.get('User-Agent') });
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({ success: true, data: { user, accessToken, refreshToken } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(refreshToken))
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const accessToken = generateAccessToken(user._id);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: refreshToken } });
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    // Token missing
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
    }

    
    const user = await User.findOne({
      emailVerificationToken: token,
      isEmailVerified: false,
    }).select('+emailVerificationToken');

    
    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid or already used verification token. Your email might already be verified.',
      });
    }

    // Update only after successful lookup
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (err) {
    console.error('Email verification error:', err);

    return res.status(500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No user with that email' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpire: Date.now() + 3600000,
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendEmail({ to: email, subject: 'Password Reset', html: emailTemplates.resetPassword(user.name, resetLink) });

    res.json({ success: true, message: 'Reset email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'Current password incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};
