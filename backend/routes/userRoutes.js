const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getAllUsers, getUserById, createUser, updateUser, deleteUser,
  toggleUserStatus, updateProfile, getUserActivity, bulkAction,
} = require('../controllers/userController');

const User = require('../models/User')

router.get('/count', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.use(protect);

router.get('/', authorize('admin', 'superadmin'), getAllUsers);
router.post('/', authorize('admin', 'superadmin'), createUser);
router.post('/bulk-action', authorize('superadmin'), bulkAction);
router.put('/profile', upload.single('avatar'), updateProfile);
router.get('/:id', getUserById);
router.put('/:id', authorize('admin', 'superadmin'), updateUser);
router.delete('/:id', authorize('superadmin'), deleteUser);
router.patch('/:id/toggle-status', authorize('admin', 'superadmin'), toggleUserStatus);
router.get('/:id/activity', authorize('admin', 'superadmin'), getUserActivity);

module.exports = router;
