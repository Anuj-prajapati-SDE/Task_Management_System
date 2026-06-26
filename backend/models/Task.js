const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const timeEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startTime: Date,
  endTime: Date,
  duration: Number, // in minutes
  note: String,
});

const submissionSchema = new mongoose.Schema({
  notes: { type: String },
  attachments: [
    {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      path: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedAt: { type: Date },
  isSubmitted: { type: Boolean, default: false },
  reviewedAt: { type: Date },
  reviewNotes: { type: String },
});

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  field: String,
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'review', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    dueDate: { type: Date },
    startDate: { type: Date },
    tags: [{ type: String, trim: true }],
    labels: [{ type: String }],
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [commentSchema],
    subtasks: [subtaskSchema],
    submission: submissionSchema,
    assigneeReview: { type: Boolean, default: false },
    assigneeCompleted: { type: Boolean, default: false },
    timeEntries: [timeEntrySchema],
    totalTimeSpent: { type: Number, default: 0 }, // in minutes
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    activityHistory: [activitySchema],
    isRecurring: { type: Boolean, default: false },
    recurringPattern: {
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      interval: Number,
      endDate: Date,
    },
    completedAt: Date,
    rejectReason: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

taskSchema.index({ assignees: 1, status: 1 });
taskSchema.index({ team: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Task', taskSchema);
