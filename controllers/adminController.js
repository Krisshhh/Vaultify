const User = require('../models/User');
const File = require('../models/File');
const FileShare = require('../models/FileShare');
const Analytics = require('../models/Analytics');

// Get dashboard overview statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalFiles = await File.countDocuments();
    const totalShares = await FileShare.countDocuments({ isActive: true });
    
    // Recent activity counts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const recentUploads = await File.countDocuments({ uploadDate: { $gte: thirtyDaysAgo } });
    const recentShares = await FileShare.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    // Storage usage
    const storageStats = await File.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' },
          avgSize: { $avg: '$size' }
        }
      }
    ]);
    
    const totalStorageBytes = storageStats.length > 0 ? storageStats[0].totalSize : 0;
    const avgFileSize = storageStats.length > 0 ? storageStats[0].avgSize : 0;

    res.json({
      overview: {
        totalUsers,
        totalAdmins,
        totalFiles,
        totalShares,
        totalStorageGB: (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2),
        avgFileSizeMB: (avgFileSize / (1024 * 1024)).toFixed(2)
      },
      recent: {
        newUsers: recentUsers,
        newUploads: recentUploads,
        newShares: recentShares
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};

// Get user analytics
exports.getUserAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
    console.log('Analytics query date range:', { daysAgo, period });
    
    // User registration trends
    const userTrends = await User.aggregate([
      { $match: { createdAt: { $gte: daysAgo }, role: 'user' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Active users (users who logged in recently)
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: daysAgo },
      role: 'user'
    });
    
    // User activity by event type
    const userActivity = await Analytics.aggregate([
      { $match: { timestamp: { $gte: daysAgo } } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get total analytics count for debugging
    const totalAnalytics = await Analytics.countDocuments();
    const recentAnalytics = await Analytics.countDocuments({ timestamp: { $gte: daysAgo } });
    
    console.log('Analytics debug:', {
      totalAnalytics,
      recentAnalytics,
      userTrends: userTrends.length,
      activeUsers,
      userActivity: userActivity.length
    });

    res.json({
      userTrends,
      activeUsers,
      userActivity,
      debug: {
        totalAnalytics,
        recentAnalytics,
        queryPeriod: period,
        queryDate: daysAgo
      }
    });
  } catch (err) {
    console.error('User analytics error:', err);
    res.status(500).json({ message: 'Failed to fetch user analytics', error: err.message });
  }
};

// Get file analytics
exports.getFileAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
    // File upload trends
    const uploadTrends = await File.aggregate([
      { $match: { uploadDate: { $gte: daysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$uploadDate' } },
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // File types distribution
    const fileTypes = await File.aggregate([
      {
        $group: {
          _id: '$mimetype',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Most downloaded files
    const popularFiles = await FileShare.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$fileId',
          totalDownloads: { $sum: '$downloadCount' },
          shareCount: { $sum: 1 }
        }
      },
      { $sort: { totalDownloads: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'files',
          localField: '_id',
          foreignField: '_id',
          as: 'fileInfo'
        }
      },
      { $unwind: '$fileInfo' }
    ]);

    res.json({
      uploadTrends,
      fileTypes,
      popularFiles
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch file analytics', error: err.message });
  }
};

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, role } = req.query;
    
    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments(query);
    
    // Get file counts for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const fileCount = await File.countDocuments({ user: user._id });
      const shareCount = await FileShare.countDocuments({ sharedBy: user._id, isActive: true });
      
      return {
        ...user.toObject(),
        fileCount,
        shareCount
      };
    }));

    res.json({
      users: usersWithStats,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

// Get system health metrics
exports.getSystemHealth = async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Recent errors or issues (you can implement error logging)
    const recentLogins = await Analytics.countDocuments({
      eventType: 'user_login',
      timestamp: { $gte: oneHourAgo }
    });
    
    const recentUploads = await Analytics.countDocuments({
      eventType: 'file_upload',
      timestamp: { $gte: oneHourAgo }
    });
    
    const recentDownloads = await Analytics.countDocuments({
      eventType: 'file_download',
      timestamp: { $gte: oneHourAgo }
    });
    
    // Daily activity
    const dailyActivity = await Analytics.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    res.json({
      currentHour: {
        logins: recentLogins,
        uploads: recentUploads,
        downloads: recentDownloads
      },
      dailyActivity,
      systemStatus: 'healthy' // You can implement more sophisticated health checks
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch system health', error: err.message });
  }
};

// Update user role (promote/demote)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User role updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user role', error: err.message });
  }
};
