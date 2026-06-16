const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, user, action, resource, startDate, endDate } = req.query;
    const query = {};
    if (user) query.user = user;
    if (action) query.action = new RegExp(action, 'i');
    if (resource) query.resource = resource;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('user', 'name email avatar role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: logs, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserLoginHistory = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.userId).select('loginHistory lastLogin');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user.loginHistory.slice(-50).reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
