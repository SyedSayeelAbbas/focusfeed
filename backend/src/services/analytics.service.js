const User = require("../models/user.model");
const Bookmark = require("../models/bookmark.model");

const getPlatformStats = async () => {
  const [totalUsers, activeUsers, totalBookmarks, topInterests] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    Bookmark.countDocuments(),

    User.aggregate([
      { $unwind: "$interests" },
      { $group: { _id: "$interests", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { interest: "$_id", count: 1, _id: 0 } },
    ]),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsersThisWeek = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  return {
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    totalBookmarks,
    newUsersThisWeek,
    topInterests,
  };
};

module.exports = { getPlatformStats };