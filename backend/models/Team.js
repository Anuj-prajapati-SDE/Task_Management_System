const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    avatar: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['leader', 'member', 'viewer'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    invitations: [
      {
        email: String,
        token: String,
        role: { type: String, enum: ['leader', 'member', 'viewer'], default: 'member' },
        expiresAt: Date,
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);
