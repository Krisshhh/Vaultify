const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/adminAuth');
const {
  getDashboardStats,
  getUserAnalytics,
  getFileAnalytics,
  getAllUsers,
  getSystemHealth,
  updateUserRole
} = require('../controllers/adminController');

// Dashboard overview statistics
router.get('/dashboard/stats', requireAdmin, getDashboardStats);

// User analytics
router.get('/analytics/users', requireAdmin, getUserAnalytics);

// File analytics
router.get('/analytics/files', requireAdmin, getFileAnalytics);

// System health metrics
router.get('/system/health', requireAdmin, getSystemHealth);

// User management
router.get('/users', requireAdmin, getAllUsers);
router.put('/users/:userId/role', requireAdmin, updateUserRole);

module.exports = router;
