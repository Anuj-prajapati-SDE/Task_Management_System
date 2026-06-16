// teamRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAllTeams, getTeamById, createTeam, updateTeam, deleteTeam, addMember, removeMember, updateMemberRole, inviteMember, getTeamStats } = require('../controllers/teamController');

router.use(protect);
router.get('/', getAllTeams);
router.post('/', createTeam);
router.get('/:id', getTeamById);
router.put('/:id', updateTeam);
router.delete('/:id', authorize('admin', 'superadmin'), deleteTeam);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);
router.patch('/:id/members/:userId/role', updateMemberRole);
router.post('/:id/invite', inviteMember);
router.get('/:id/stats', getTeamStats);

module.exports = router;
