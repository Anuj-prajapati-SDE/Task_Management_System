const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createDailyUpdate, getDailyUpdates } = require('../controllers/dailyUpdateController');

router.use(protect);

router.post('/', createDailyUpdate);
router.get('/', getDailyUpdates);

module.exports = router;
