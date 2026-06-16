const Team = require('../models/Team');
const User = require('../models/User');
const Task = require('../models/Task');
const { createNotification } = require('../utils/notification');
const crypto = require('crypto');

exports.getAllTeams = async (req, res) => {
  try {
    const query = req.user.role === 'user'
      ? { 'members.user': req.user._id }
      : {};
    const teams = await Team.find(query)
      .populate('owner', 'name avatar email')
      .populate('members.user', 'name avatar email role');
    res.json({ success: true, data: teams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'name avatar email')
      .populate('members.user', 'name avatar email role department position');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;
    const team = await Team.create({
      name, description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'leader' }],
    });
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const already = team.members.find(m => m.user.toString() === userId);
    if (already) return res.status(400).json({ success: false, message: 'Already a member' });

    team.members.push({ user: userId, role });
    await team.save();

    const io = req.app.get('io');
    await createNotification(io, {
      recipient: userId,
      sender: req.user._id,
      type: 'team_joined',
      title: 'Added to Team',
      message: `${req.user.name} added you to team "${team.name}"`,
      relatedTeam: team._id,
      link: `/teams/${team._id}`,
    });

    const updated = await Team.findById(team._id).populate('members.user', 'name avatar email');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: { user: req.params.userId } } },
      { new: true }
    ).populate('members.user', 'name avatar email');
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const team = await Team.findOneAndUpdate(
      { _id: req.params.id, 'members.user': req.params.userId },
      { $set: { 'members.$.role': req.body.role } },
      { new: true }
    ).populate('members.user', 'name avatar email');
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.inviteMember = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const token = crypto.randomBytes(32).toString('hex');
    team.invitations.push({ email, token, role, expiresAt: new Date(Date.now() + 7 * 24 * 3600000), invitedBy: req.user._id });
    await team.save();

    // In production, send email with invitation link
    res.json({ success: true, message: 'Invitation sent', data: { token } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTeamStats = async (req, res) => {
  try {
    const tasks = await Task.find({ team: req.params.id });
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length,
    };
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
