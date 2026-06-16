const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } = require('../controllers/notificationController');

router.use(protect);
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/all', deleteAllNotifications);
router.delete('/:id', deleteNotification);

module.exports = router;
