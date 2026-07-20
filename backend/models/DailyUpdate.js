const mongoose = require('mongoose');

const dailyUpdateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workDone: { type: String, required: true },
    blockers: { type: String, default: '' },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    taskTitle: { type: String },
    status: { type: String },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyUpdate', dailyUpdateSchema);
