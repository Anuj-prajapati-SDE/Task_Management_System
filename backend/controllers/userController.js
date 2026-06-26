const User = require('../models/User');
const Task = require('../models/Task');

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    const query = {};
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    if (req.user.role === 'admin') {
      query.role = 'user';
    } else {
      if (role) query.role = role;
      if (!query.role) query.role = { $ne: 'superadmin' };
      else if (query.role === 'superadmin') query.role = { $ne: 'superadmin' };
    }
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-loginHistory')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: users, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, position } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already exists' });

    const user = await User.create({ name, email, password, role, department, position, isEmailVerified: true });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, role, department, position, phone, isActive } = req.body;
    const updateData = { name, department, position, phone };
    if (req.user.role === 'superadmin') {
      updateData.role = role;
      updateData.isActive = isActive;
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, department, position, phone } = req.body;
    const updateData = { name, department, position, phone };
    if (req.file) updateData.avatar = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserActivity = async (req, res) => {
  try {
    const tasks = await Task.find({ assignee: req.params.id })
      .populate('assignedBy', 'name avatar role')
      .select('title status priority createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkAction = async (req, res) => {
  try {
    const { action, userIds } = req.body;
    if (action === 'activate') await User.updateMany({ _id: { $in: userIds } }, { isActive: true });
    else if (action === 'deactivate') await User.updateMany({ _id: { $in: userIds } }, { isActive: false });
    else if (action === 'delete') await User.deleteMany({ _id: { $in: userIds } });
    res.json({ success: true, message: `Bulk ${action} completed` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
