const Notification = require('../models/Notification');

exports.createNotification = async (io, { recipient, sender, type, title, message, relatedTask, relatedTeam, link }) => {
  const notification = await Notification.create({ recipient, sender, type, title, message, relatedTask, relatedTeam, link });
  // Real-time push via Socket.IO
  if (io) io.to(recipient.toString()).emit('new_notification', notification);
  return notification;
};
