const Task = require('../models/Task');
const User = require('../models/User');

const { sendEmail, emailTemplates } = require('../utils/email');
const { createNotification } = require('./notificationController');

const populateTask = (query) =>
  query
    .populate('assignees', 'name email avatar role')
    .populate('assignedBy', 'name avatar role')
    .populate('team', 'name')
    .populate('comments.user', 'name avatar')
    .populate('chats.user', 'name avatar')
    .populate('subtasks.assignee', 'name avatar');

exports.getAllTasks = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, assignees, team, search, sortBy = 'createdAt', sortOrder = 'desc', dueDate } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'user') {
      query.assignees = req.user._id;
    } else if (req.user.role === 'admin') {
      query.$or = [{ assignedBy: req.user._id }, { assignees: req.user._id }];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignees) query.assignees = assignees;
    if (team) query.team = team;
    if (search) query.$text = { $search: search };
    if (dueDate) {
      const date = new Date(dueDate);
      query.dueDate = { $lte: new Date(date.setHours(23, 59, 59, 999)) };
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const total = await Task.countDocuments(query);
    const tasks = await populateTask(Task.find(query).sort(sort).skip((page - 1) * limit).limit(Number(limit)));

    res.json({ success: true, data: tasks, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await populateTask(Task.findById(req.params.id));
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, status, priority, assignees, team, dueDate, startDate, tags, labels, dependencies, isRecurring, recurringPattern } = req.body;

    const taskData = {
      title, description, status, priority, dueDate, startDate, tags, labels, dependencies, isRecurring, recurringPattern,
      assignedBy: req.user._id,
    };

    const parseField = (field) => {
      if (typeof field === 'string') {
        try { return JSON.parse(field); } catch (e) { return field; }
      }
      return field;
    };

    let parsedAssignees = assignees ? parseField(assignees) : [];
    if (!Array.isArray(parsedAssignees)) parsedAssignees = [parsedAssignees].filter(Boolean);
    
    if (parsedAssignees.length > 0) taskData.assignees = parsedAssignees;
    if (team && team !== '' && team !== 'null') taskData.team = team;
    
    if (tags) taskData.tags = parseField(tags);
    if (labels) taskData.labels = parseField(labels);
    if (dependencies) taskData.dependencies = parseField(dependencies);
    if (isRecurring !== undefined) taskData.isRecurring = parseField(isRecurring);
    if (recurringPattern) taskData.recurringPattern = parseField(recurringPattern);

    if (status === 'completed') {
      taskData.completedAt = new Date();
    }

    if (req.files && req.files.length > 0) {
      taskData.attachments = req.files.map((f) => ({
        filename: f.filename,
        originalName: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        path: `/uploads/${f.filename}`,
        uploadedBy: req.user._id,
      }));
    }

    taskData.activityHistory = [{ user: req.user._id, action: 'created task', timestamp: new Date() }];

    const task = await Task.create(taskData);

    // Notify assignees
    if (parsedAssignees && parsedAssignees.length > 0) {
      for (const assigneeId of parsedAssignees) {
        if (assigneeId !== req.user._id.toString()) {
          const assigneeUser = await User.findById(assigneeId);
          if (assigneeUser?.notificationPreferences?.email) {
            await sendEmail({ to: assigneeUser.email, subject: 'New Task Assigned', html: emailTemplates.taskAssigned(assigneeUser.name, title, `${process.env.CLIENT_URL}/tasks/${task._id}`) }).catch(() => { });
          }
          await createNotification(req.app.get('io'), {
            user: assigneeId,
            title: 'New Task Assigned',
            message: `You have been assigned to task: ${title}`,
            type: 'task_assigned',
            link: `/tasks/${task._id}`
          });
        }
      }
    }

    const populated = await populateTask(Task.findById(task._id));
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const assigner = task.assignedBy ? await User.findById(task.assignedBy) : null;
    if (req.user.role === 'admin' && assigner && assigner.role === 'superadmin') {
      const keysToUpdate = Object.keys(req.body).filter(
        (k) => req.body[k] !== undefined && k !== 'activityHistory' && k !== '$unset'
      );
      const hasDisallowedChanges = keysToUpdate.some((k) => !['assignees', 'assigneeReview', 'assigneeCompleted', 'status', 'rejectReason'].includes(k));
      const hasDisallowedUnset = req.body.$unset && Object.keys(req.body.$unset).some((k) => !['assignees', 'assigneeReview', 'assigneeCompleted', 'status', 'rejectReason'].includes(k));

      if (hasDisallowedChanges || hasDisallowedUnset) {
        return res.status(403).json({
          success: false,
          message: 'Admins can only modify the assignees and assignee progress fields on tasks assigned by a superadmin',
        });
      }
    }

    if (req.user.role === 'user') {
      const allowedKeys = ['status', 'rejectReason'];
      const keysToUpdate = Object.keys(req.body).filter(
        (k) => req.body[k] !== undefined && k !== 'activityHistory' && k !== '$unset'
      );
      const hasDisallowedChanges = keysToUpdate.some((k) => !allowedKeys.includes(k));
      if (hasDisallowedChanges || req.body.$unset) {
        return res.status(403).json({
          success: false,
          message: 'Regular users are not allowed to edit task properties other than status.',
        });
      }
    }

    // Track changes
    const changedFields = [];
    const fields = ['title', 'description', 'status', 'priority', 'assignees', 'dueDate', 'tags', 'assigneeReview', 'assigneeCompleted', 'rejectReason'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined && String(task[field]) !== String(req.body[field])) {
        changedFields.push({ user: req.user._id, action: `updated ${field}`, field, oldValue: task[field], newValue: req.body[field] });
      }
    });

    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedAt = new Date();
    } else if (req.body.status && req.body.status !== 'completed' && task.status === 'completed') {
      req.body.completedAt = null;
    }

    if (req.body.team === '' || req.body.team === 'null') {
      req.body.team = null;
      req.body.$unset = req.body.$unset || {};
      req.body.$unset.team = 1;
      delete req.body.team;
    }
    const parseField = (field) => {
      if (typeof field === 'string') {
        try { return JSON.parse(field); } catch (e) { return field; }
      }
      return field;
    };

    ['assignees', 'tags', 'labels', 'dependencies', 'recurringPattern', 'isRecurring'].forEach(key => {
      if (req.body[key] !== undefined) {
        req.body[key] = parseField(req.body[key]);
      }
    });

    if (req.body.assignees && !Array.isArray(req.body.assignees)) {
      req.body.assignees = [req.body.assignees].filter(Boolean);
    }

    const updateQuery = { ...req.body, $push: { activityHistory: { $each: changedFields } } };

    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map((f) => ({
        filename: f.filename,
        originalName: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        path: `/uploads/${f.filename}`,
        uploadedBy: req.user._id,
      }));
      updateQuery.$push.attachments = { $each: newAttachments };
    }

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      { new: true, runValidators: true }
    );

    // Notify assignees if changed
    if (req.body.assignees && req.body.assignees.length > 0) {
      for (const assigneeId of req.body.assignees) {
        if (!task.assignees.some(a => a.toString() === assigneeId) && assigneeId !== req.user._id.toString()) {
          await createNotification(req.app.get('io'), {
            user: assigneeId,
            title: 'New Task Assigned',
            message: `You have been assigned to task: ${updated.title}`,
            type: 'task_assigned',
            link: `/tasks/${updated._id}`
          });
        }
      }
    }

    const populated = await populateTask(Task.findById(updated._id));
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedBy', 'role');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (req.user.role === 'admin' && task.assignedBy && task.assignedBy.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admins cannot delete tasks assigned by a superadmin' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content, mentions } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { user: req.user._id, content, mentions: mentions || [] } } },
      { new: true }
    );

    const io = req.app.get('io');
    // Notify mentioned users
    if (mentions && mentions.length > 0) {

    }

    const populated = await populateTask(Task.findById(task._id));
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    await Task.findByIdAndUpdate(req.params.id, { $pull: { comments: { _id: req.params.commentId } } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addSubtask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { subtasks: req.body } },
      { new: true }
    );
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSubtask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, 'subtasks._id': req.params.subtaskId },
      { $set: { 'subtasks.$': { ...req.body, _id: req.params.subtaskId } } },
      { new: true }
    );
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSubtask = async (req, res) => {
  try {
    await Task.findByIdAndUpdate(req.params.id, { $pull: { subtasks: { _id: req.params.subtaskId } } });
    res.json({ success: true, message: 'Subtask deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.startTimeTracking = async (req, res) => {
  try {
    const entry = { user: req.user._id, startTime: new Date(), note: req.body.note };
    const task = await Task.findByIdAndUpdate(req.params.id, { $push: { timeEntries: entry } }, { new: true });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.stopTimeTracking = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const entry = task.timeEntries.find((e) => e.user.toString() === req.user._id.toString() && !e.endTime);
    if (!entry) return res.status(400).json({ success: false, message: 'No active time entry' });

    const endTime = new Date();
    const duration = Math.round((endTime - entry.startTime) / 60000);
    entry.endTime = endTime;
    entry.duration = duration;
    task.totalTimeSpent = (task.totalTimeSpent || 0) + duration;
    await task.save();
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTaskOrder = async (req, res) => {
  try {
    const { tasks } = req.body; // [{ id, order, status }]
    const bulkOps = tasks.map(({ id, order, status }) => ({
      updateOne: { filter: { _id: id }, update: { order, status } },
    }));
    await Task.bulkWrite(bulkOps);
    res.json({ success: true, message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getKanbanTasks = async (req, res) => {
  try {
    const query = req.user.role === 'user'
      ? { assignees: req.user._id }
      : req.user.role === 'admin'
        ? { $or: [{ assignedBy: req.user._id }, { assignees: req.user._id }] }
        : {};
    if (req.query.team) query.team = req.query.team;

    const tasks = await populateTask(Task.find(query).sort({ order: 1, createdAt: -1 }));
    const kanban = {
      pending: tasks.filter((t) => t.status === 'pending'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      review: tasks.filter((t) => t.status === 'review'),
      completed: tasks.filter((t) => t.status === 'completed'),
      cancelled: tasks.filter((t) => t.status === 'cancelled'),
    };
    res.json({ success: true, data: kanban });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCalendarTasks = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {
      dueDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };
    if (req.user.role === 'user') {
      query.assignees = req.user._id;
    } else if (req.user.role === 'admin') {
      query.$or = [{ assignedBy: req.user._id }, { assignees: req.user._id }];
    }

    const tasks = await populateTask(Task.find(query));
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Only an assignee can submit
    if (!task.assignees.some(id => String(id) === String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Only an assignee can submit the task' });
    }

    const { notes } = req.body;
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: `/uploads/${file.filename}`,
        uploadedBy: req.user._id,
      }));
    }

    if (!task.submission) {
      task.submission = {};
    }
    task.submission.notes = notes;
    task.submission.attachments = attachments;
    task.submission.status = 'pending';
    task.submission.submittedAt = new Date();
    task.submission.isSubmitted = true;
    task.markModified('submission');
    task.status = 'review'; // Also change overall status to review

    task.activityHistory.push({
      user: req.user._id,
      action: 'submitted task',
      field: 'submission',
      newValue: 'pending',
    });

    await task.save();

    // Notify Assigner
    if (task.assignedBy && String(task.assignedBy) !== String(req.user._id)) {

    }

    const updatedTask = await populateTask(Task.findById(task._id));
    res.json({ success: true, data: updatedTask });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reviewSubmission = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Only assigner or superadmin can review
    if (String(task.assignedBy) !== String(req.user._id) && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to review this submission' });
    }

    const { status, reviewNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    if (!task.submission) {
      return res.status(400).json({ success: false, message: 'Task submission object is missing' });
    }

    if (!task.submission.isSubmitted) {
      return res.status(400).json({ success: false, message: 'Task submission.isSubmitted is false' });
    }

    task.submission.status = status;
    task.submission.reviewedAt = new Date();
    task.submission.reviewNotes = reviewNotes;
    task.markModified('submission');

    if (status === 'approved') {
      task.status = 'completed';
      task.completedAt = new Date();
    } else if (status === 'rejected') {
      task.status = 'in_progress';
      task.submission.isSubmitted = false; // Allow resubmission
    }

    task.activityHistory.push({
      user: req.user._id,
      action: `submission ${status}`,
      field: 'submission.status',
      newValue: status,
    });

    await task.save();

    // Notify Assignees
    if (task.assignees && task.assignees.length > 0) {

    }

    const updatedTask = await populateTask(Task.findById(task._id));
    res.json({ success: true, data: updatedTask });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Chats
exports.addTaskChat = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const newChat = { user: req.user._id, message };
    task.chats.push(newChat);
    await task.save();

    const updatedTask = await Task.findById(task._id).populate('chats.user', 'name avatar');
    const populatedChat = updatedTask.chats[updatedTask.chats.length - 1];

    if (req.app.get('io')) {
      req.app.get('io').to(task._id.toString()).emit('new_task_chat', populatedChat);
    }

    // Notify other assignees
    if (task.assignees && task.assignees.length > 0) {
      for (const assigneeId of task.assignees) {
        if (assigneeId.toString() !== req.user._id.toString()) {
          await createNotification(req.app.get('io'), {
            user: assigneeId,
            title: 'New Chat Message',
            message: `New message in task: ${task.title}`,
            type: 'chat_message',
            link: `/tasks/${task._id}`
          });
        }
      }
    }

    res.json({ success: true, data: populatedChat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTaskChat = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const chat = task.chats.id(req.params.chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    if (chat.user.toString() !== req.user._id.toString() && req.user.role === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    chat.message = req.body.message || chat.message;
    await task.save();

    const updatedTask = await Task.findById(task._id).populate('chats.user', 'name avatar');
    const populatedChat = updatedTask.chats.id(req.params.chatId);

    if (req.app.get('io')) {
      req.app.get('io').to(task._id.toString()).emit('task_chat_updated', populatedChat);
    }

    res.json({ success: true, data: populatedChat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTaskChat = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const chat = task.chats.id(req.params.chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    if (chat.user.toString() !== req.user._id.toString() && req.user.role === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    task.chats.pull(req.params.chatId);
    await task.save();

    if (req.app.get('io')) {
      req.app.get('io').to(task._id.toString()).emit('task_chat_deleted', req.params.chatId);
    }

    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
