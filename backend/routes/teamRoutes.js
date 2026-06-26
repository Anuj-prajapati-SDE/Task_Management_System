// teamRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAllTeams, getTeamById, createTeam, updateTeam, deleteTeam, addMember, removeMember, updateMemberRole, inviteMember, getTeamStats, addTeamChat, editTeamChat, deleteTeamChat } = require('../controllers/teamController');

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
router.post('/:id/chats', addTeamChat);
router.put('/:id/chats/:chatId', editTeamChat);
router.delete('/:id/chats/:chatId', deleteTeamChat);

module.exports = router;
