const Task = require('../models/Task');
const User = require('../models/User');
const Team = require('../models/Team');

exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 3600000);

    const [total, completed, pending, inProgress, overdue, recentTasks, upcomingDeadlines] = await Promise.all([
      Task.countDocuments({ assignees: userId }),
      Task.countDocuments({ assignees: userId, status: 'completed' }),
      Task.countDocuments({ assignees: userId, status: 'pending' }),
      Task.countDocuments({ assignees: userId, status: 'in_progress' }),
      Task.countDocuments({ assignees: userId, dueDate: { $lt: now }, status: { $nin: ['completed', 'cancelled'] } }),
      Task.find({ assignees: userId, updatedAt: { $gte: weekAgo } })
        .sort({ updatedAt: -1 }).limit(5).select('title status priority updatedAt'),
      Task.find({ assignees: userId, dueDate: { $gte: now }, status: { $nin: ['completed', 'cancelled'] } })
        .sort({ dueDate: 1 }).limit(5).select('title dueDate priority status'),
    ]);

    // Weekly productivity (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));
      const count = await Task.countDocuments({ assignees: userId, status: 'completed', completedAt: { $gte: dayStart, $lte: dayEnd } });
      weeklyData.push({ date: dayStart.toISOString().split('T')[0], completed: count });
    }

    res.json({
      success: true,
      data: { stats: { total, completed, pending, inProgress, overdue }, recentTasks, upcomingDeadlines, weeklyData },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const taskQuery = req.user.role === 'admin' ? { assignedBy: req.user._id } : {};

    const [totalUsers, activeUsers, totalTasks, completedTasks, totalTeams, overdueTasks] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Task.countDocuments(taskQuery),
      Task.countDocuments({ ...taskQuery, status: 'completed' }),
      Team.countDocuments(),
      Task.countDocuments({ ...taskQuery, dueDate: { $lt: now }, status: { $nin: ['completed', 'cancelled'] } }),
    ]);

    // Task status distribution
    const matchStage = req.user.role === 'admin' ? { $match: { assignedBy: req.user._id } } : { $match: {} };
    const tasksByStatus = await Task.aggregate([
      matchStage,
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const tasksByPriority = await Task.aggregate([
      matchStage,
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Top performers (most tasks completed in last 30 days)
    const thirtyDaysAgo = new Date(now - 30 * 24 * 3600000);
    const performerMatch = req.user.role === 'admin'
      ? { status: 'completed', completedAt: { $gte: thirtyDaysAgo }, assignedBy: req.user._id }
      : { status: 'completed', completedAt: { $gte: thirtyDaysAgo } };

    const topPerformers = await Task.aggregate([
      { $match: performerMatch },
      { $unwind: '$assignees' },
      { $group: { _id: '$assignees', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, count: 1, 'user.name': 1, 'user.avatar': 1, 'user.email': 1 } },
    ]);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const [created, done] = await Promise.all([
        Task.countDocuments({ ...taskQuery, createdAt: { $gte: start, $lte: end } }),
        Task.countDocuments({ ...taskQuery, status: 'completed', completedAt: { $gte: start, $lte: end } }),
      ]);
      monthlyTrend.push({ month: start.toLocaleString('default', { month: 'short' }), created, completed: done });
    }

    const pendingSubmissions = await Task.find({
      ...taskQuery,
      status: { $nin: ['completed', 'cancelled'] },
      $or: [
        { 'submission.isSubmitted': true, 'submission.status': 'pending' },
        { status: 'review' }
      ]
    }).select('title assignee dueDate submission createdAt').populate('assignee', 'name email avatar').limit(10).sort({ 'submission.submittedAt': -1, updatedAt: -1 });

    res.json({
      success: true,
      data: { stats: { totalUsers, activeUsers, totalTasks, completedTasks, totalTeams, overdueTasks }, tasksByStatus, tasksByPriority, topPerformers, monthlyTrend, pendingSubmissions },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSuperAdminDashboard = async (req, res) => {
  try {
    const [totalUsers, totalTasks, totalTeams] = await Promise.all([
      User.countDocuments(),
      Task.countDocuments(),
      Team.countDocuments(),
    ]);
    const usersByRole = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).select('name email role isActive createdAt');
    
    const pendingSubmissions = await Task.find({
      status: { $nin: ['completed', 'cancelled'] },
      $or: [
        { 'submission.isSubmitted': true, 'submission.status': 'pending' },
        { status: 'review' }
      ]
    }).select('title assignees dueDate submission createdAt').populate('assignees', 'name email avatar').limit(10).sort({ 'submission.submittedAt': -1, updatedAt: -1 });

    res.json({ success: true, data: { stats: { totalUsers, totalTasks, totalTeams }, usersByRole, recentUsers, pendingSubmissions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTeamAnalytics = async (req, res) => {
  try {
    const { teamId } = req.params;
    const tasks = await Task.find({ team: teamId }).populate('assignees', 'name avatar');
    const memberStats = {};
    tasks.forEach(task => {
      if (task.assignees && task.assignees.length > 0) {
        task.assignees.forEach(assignee => {
          const uid = assignee._id.toString();
          if (!memberStats[uid]) memberStats[uid] = { user: assignee, total: 0, completed: 0, pending: 0, inProgress: 0 };
          memberStats[uid].total++;
          if (task.status === 'completed') memberStats[uid].completed++;
          else if (task.status === 'pending') memberStats[uid].pending++;
          else if (task.status === 'in_progress') memberStats[uid].inProgress++;
        });
      }
    });

    res.json({ success: true, data: { tasks: tasks.length, memberStats: Object.values(memberStats) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProductivityReport = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const query = { status: 'completed', completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    if (userId) query.assignees = userId;
    else if (req.user.role === 'user') query.assignees = req.user._id;

    const tasks = await Task.find(query)
      .populate('assignees', 'name avatar')
      .select('title priority completedAt totalTimeSpent assignees');

    const totalTime = tasks.reduce((sum, t) => sum + (t.totalTimeSpent || 0), 0);
    res.json({ success: true, data: { tasks, totalCompleted: tasks.length, totalTimeSpent: totalTime } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
