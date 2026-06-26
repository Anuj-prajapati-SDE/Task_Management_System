/**
 * Database Seeder
 * Run: node seed.js
 * Seeds demo users, teams, and tasks
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Team = require('./models/Team');
const Task = require('./models/Task');


const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/task_management_db';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Team.deleteMany({}),
      Task.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create users
    const password = 'password123';

    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@demo.com',
      password,
      role: 'superadmin',
      isActive: true,
      isEmailVerified: true,
      department: 'Management',
      position: 'CTO',
    });

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@demo.com',
      password,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      department: 'Engineering',
      position: 'Engineering Manager',
    });

    const usersData = [
      { name: 'Alice Johnson', email: 'alice@demo.com', password, role: 'user', isActive: true, isEmailVerified: true, department: 'Engineering', position: 'Senior Developer' },
      { name: 'Bob Smith', email: 'bob@demo.com', password, role: 'user', isActive: true, isEmailVerified: true, department: 'Design', position: 'UI/UX Designer' },
      { name: 'Carol Davis', email: 'carol@demo.com', password, role: 'user', isActive: true, isEmailVerified: true, department: 'Marketing', position: 'Marketing Lead' },
      { name: 'David Lee', email: 'david@demo.com', password, role: 'user', isActive: true, isEmailVerified: true, department: 'Engineering', position: 'Backend Developer' },
      { name: 'Eve Wilson', email: 'eve@demo.com', password, role: 'user', isActive: true, isEmailVerified: true, department: 'QA', position: 'QA Engineer' },
      { name: 'user@demo.com User', email: 'user@demo.com', password, role: 'user', isActive: true, isEmailVerified: true, department: 'Engineering', position: 'Developer' },
    ];

    const users = [];
    for (const u of usersData) {
      users.push(await User.create(u));
    }

    const [alice, bob, carol, david, eve, demoUser] = users;
    console.log('Created users');

    // Create teams
    const engineeringTeam = await Team.create({
      name: 'Engineering',
      description: 'Core engineering team building the product',
      owner: admin._id,
      members: [
        { user: admin._id, role: 'leader' },
        { user: alice._id, role: 'member' },
        { user: david._id, role: 'member' },
        { user: eve._id, role: 'member' },
        { user: demoUser._id, role: 'member' },
      ],
    });

    const designTeam = await Team.create({
      name: 'Design & Marketing',
      description: 'Creative team for design and marketing',
      owner: admin._id,
      members: [
        { user: admin._id, role: 'leader' },
        { user: bob._id, role: 'leader' },
        { user: carol._id, role: 'member' },
      ],
    });

    console.log('Created teams');

    // Create tasks
    const now = new Date();
    const future = (days) => new Date(now.getTime() + days * 86400000);
    const past = (days) => new Date(now.getTime() - days * 86400000);

    const tasks = await Task.insertMany([
      // Engineering tasks
      {
        title: 'Set up CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing and deployment to production environment.',
        status: 'completed',
        priority: 'high',
        assignees: [alice._id],
        assignedBy: admin._id,
        team: engineeringTeam._id,
        dueDate: past(5),
        completedAt: past(6),
        tags: ['devops', 'automation'],
        activityHistory: [{ user: admin._id, action: 'created task' }, { user: alice._id, action: 'updated status', field: 'status', oldValue: 'in_progress', newValue: 'completed' }],
      },
      {
        title: 'Implement JWT refresh token rotation',
        description: 'Add refresh token rotation for enhanced security. Invalidate old tokens on use.',
        status: 'in_progress',
        priority: 'urgent',
        assignees: [david._id],
        assignedBy: admin._id,
        team: engineeringTeam._id,
        dueDate: future(2),
        tags: ['security', 'backend'],
        subtasks: [
          { title: 'Design token rotation strategy', isCompleted: true },
          { title: 'Implement server-side logic', isCompleted: true },
          { title: 'Write unit tests', isCompleted: false },
          { title: 'Update API documentation', isCompleted: false },
        ],
        activityHistory: [{ user: admin._id, action: 'created task' }],
      },
      {
        title: 'API rate limiting & DDoS protection',
        description: 'Implement rate limiting on all public endpoints using express-rate-limit.',
        status: 'review',
        priority: 'high',
        assignees: [alice._id],
        assignedBy: admin._id,
        team: engineeringTeam._id,
        dueDate: future(3),
        tags: ['security', 'backend', 'api'],
        activityHistory: [{ user: admin._id, action: 'created task' }, { user: alice._id, action: 'updated status', field: 'status', oldValue: 'in_progress', newValue: 'review' }],
      },
      {
        title: 'Mobile responsive design audit',
        description: 'Review all pages for mobile responsiveness. Fix breakpoints and touch interactions.',
        status: 'pending',
        priority: 'medium',
        assignees: [demoUser._id],
        assignedBy: admin._id,
        team: engineeringTeam._id,
        dueDate: future(7),
        tags: ['frontend', 'mobile', 'css'],
        activityHistory: [{ user: admin._id, action: 'created task' }],
      },
      {
        title: 'Database indexing optimization',
        description: 'Analyze slow queries and add appropriate MongoDB indexes to improve performance.',
        status: 'pending',
        priority: 'high',
        assignees: [david._id],
        assignedBy: admin._id,
        team: engineeringTeam._id,
        dueDate: future(5),
        tags: ['database', 'performance'],
        activityHistory: [{ user: admin._id, action: 'created task' }],
      },
      {
        title: 'Write E2E tests with Playwright',
        description: 'Cover all critical user flows: auth, task CRUD, team management, kanban drag-drop.',
        status: 'pending',
        priority: 'medium',
        assignees: [eve._id],
        assignedBy: admin._id,
        team: engineeringTeam._id,
        dueDate: future(10),
        tags: ['testing', 'qa', 'automation'],
        subtasks: [
          { title: 'Auth flow tests', isCompleted: false },
          { title: 'Task management tests', isCompleted: false },
          { title: 'Kanban board tests', isCompleted: false },
        ],
        activityHistory: [{ user: admin._id, action: 'created task' }],
      },
      // Overdue task
      {
        title: 'Fix memory leak in socket connections',
        description: 'Investigate and fix memory leak reported in production when clients disconnect unexpectedly.',
        status: 'in_progress',
        priority: 'urgent',
        assignees: [alice._id],
        assignedBy: admin._id,
        team: engineeringTeam._id,
        dueDate: past(2),
        tags: ['bug', 'performance', 'socket'],
        activityHistory: [{ user: admin._id, action: 'created task' }],
      },
      // Design tasks
      {
        title: 'Design new onboarding flow',
        description: 'Create a step-by-step onboarding experience for new users with tooltips and guided tour.',
        status: 'in_progress',
        priority: 'high',
        assignees: [bob._id],
        assignedBy: admin._id,
        team: designTeam._id,
        dueDate: future(6),
        tags: ['design', 'ux', 'onboarding'],
        activityHistory: [{ user: admin._id, action: 'created task' }],
      },
      {
        title: 'Brand identity refresh',
        description: 'Update logo, color palette, and typography to align with new brand guidelines.',
        status: 'completed',
        priority: 'medium',
        assignees: [bob._id],
        assignedBy: admin._id,
        team: designTeam._id,
        dueDate: past(3),
        completedAt: past(4),
        tags: ['design', 'branding'],
        activityHistory: [{ user: admin._id, action: 'created task' }, { user: bob._id, action: 'updated status', field: 'status', oldValue: 'in_progress', newValue: 'completed' }],
      },
      // Marketing tasks
      {
        title: 'Q1 marketing campaign',
        description: 'Plan and execute Q1 social media and email marketing campaign targeting SMBs.',
        status: 'pending',
        priority: 'high',
        assignees: [carol._id],
        assignedBy: admin._id,
        team: designTeam._id,
        dueDate: future(14),
        tags: ['marketing', 'campaign', 'social-media'],
        activityHistory: [{ user: admin._id, action: 'created task' }],
      },
      // Personal tasks (demo user)
      {
        title: 'Review pull requests',
        description: 'Review and approve pending pull requests from team members.',
        status: 'pending',
        priority: 'medium',
        assignees: [demoUser._id],
        assignedBy: demoUser._id,
        dueDate: future(1),
        tags: ['code-review'],
        isRecurring: true,
        recurringPattern: { frequency: 'daily', interval: 1 },
        activityHistory: [{ user: demoUser._id, action: 'created task' }],
      },
      {
        title: 'Update project documentation',
        description: 'Update README, API docs, and internal wiki with latest changes.',
        status: 'in_progress',
        priority: 'low',
        assignees: [demoUser._id],
        assignedBy: demoUser._id,
        dueDate: future(4),
        tags: ['documentation'],
        activityHistory: [{ user: demoUser._id, action: 'created task' }],
      },
    ]);

    console.log(`Created ${tasks.length} tasks`);

    // Add demo comments to a task
    await Task.findByIdAndUpdate(tasks[1]._id, {
      $push: {
        comments: {
          $each: [
            { user: admin._id, content: 'This is high priority — please keep me updated on the progress.', createdAt: past(1) },
            { user: david._id, content: 'Working on it! Should have the server-side logic done by EOD.', createdAt: new Date() },
          ]
        }
      }
    });



    console.log('\n✅ Seed complete!\n');
    console.log('Demo credentials:');
    console.log('  superadmin@demo.com / password123  (Super Admin)');
    console.log('  admin@demo.com      / password123  (Admin)');
    console.log('  user@demo.com       / password123  (User)');
    console.log('  alice@demo.com      / password123  (User)');
    console.log('  bob@demo.com        / password123  (User)');
    console.log('  carol@demo.com      / password123  (User)');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
