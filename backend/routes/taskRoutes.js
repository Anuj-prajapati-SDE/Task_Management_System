const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getAllTasks, getTaskById, createTask, updateTask, deleteTask,
  addComment, deleteComment, addSubtask, updateSubtask, deleteSubtask,
  startTimeTracking, stopTimeTracking, updateTaskOrder,
  getKanbanTasks, getCalendarTasks,
} = require('../controllers/taskController');

router.use(protect);

router.get('/', getAllTasks);
router.post('/', upload.array('attachments', 5), createTask);
router.put('/order', updateTaskOrder);
router.get('/kanban', getKanbanTasks);
router.get('/calendar', getCalendarTasks);
router.get('/:id', getTaskById);
router.put('/:id', upload.array('attachments', 5), updateTask);
router.delete('/:id', authorize('admin', 'superadmin'), deleteTask);

// Comments
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', deleteComment);

// Subtasks
router.post('/:id/subtasks', addSubtask);
router.put('/:id/subtasks/:subtaskId', updateSubtask);
router.delete('/:id/subtasks/:subtaskId', deleteSubtask);

// Time tracking
router.post('/:id/time/start', startTimeTracking);
router.post('/:id/time/stop', stopTimeTracking);

module.exports = router;
