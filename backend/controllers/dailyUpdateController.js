const DailyUpdate = require('../models/DailyUpdate');
const Task = require('../models/Task');

exports.createDailyUpdate = async (req, res) => {
  try {
    const { workDone, blockers, task: taskId, status } = req.body;
    if (!workDone) {
      return res.status(400).json({ success: false, message: 'Work done description is required' });
    }

    let taskTitle = null;
    let task = null;

    if (taskId) {
      task = await Task.findById(taskId);
      if (task) {
        taskTitle = task.title;

        // 1. Post comment to the task
        const commentContent = `Daily Update: ${workDone}${blockers ? `\nBlockers: ${blockers}` : ''}`;
        task.comments.push({
          user: req.user._id,
          content: commentContent
        });

        // 2. Update status if changed
        if (status && task.status !== status) {
          task.status = status;
          if (status === 'completed') {
            task.completedAt = new Date();
          }
        }
        await task.save();
      }
    }

    const dailyUpdate = await DailyUpdate.create({
      user: req.user._id,
      workDone,
      blockers: blockers || '',
      task: taskId || null,
      taskTitle,
      status: status || 'general',
      date: new Date()
    });

    res.status(201).json({ success: true, data: dailyUpdate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDailyUpdates = async (req, res) => {
  try {
    const query = (req.user.role === 'admin' || req.user.role === 'superadmin') ? {} : { user: req.user._id };
    const updates = await DailyUpdate.find(query)
      .populate('user', 'name email avatar role')
      .populate('task', 'title')
      .sort({ date: -1 });
    res.json({ success: true, data: updates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
