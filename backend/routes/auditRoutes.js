const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAuditLogs, getUserLoginHistory } = require('../controllers/auditController');

router.use(protect);
router.get('/logs', authorize('admin', 'superadmin'), getAuditLogs);
router.get('/login-history/:userId', authorize('admin', 'superadmin'), getUserLoginHistory);

module.exports = router;
