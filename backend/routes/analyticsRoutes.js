const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getUserDashboard, getAdminDashboard, getSuperAdminDashboard, getTeamAnalytics, getProductivityReport } = require('../controllers/analyticsController');

router.use(protect);
router.get('/dashboard/user', getUserDashboard);
router.get('/dashboard/admin', authorize('admin', 'superadmin'), getAdminDashboard);
router.get('/dashboard/superadmin', authorize('superadmin'), getSuperAdminDashboard);
router.get('/team/:teamId', getTeamAnalytics);
router.get('/productivity', getProductivityReport);

module.exports = router;
