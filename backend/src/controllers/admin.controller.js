const User = require("../models/user.model");
const Category = require("../models/category.model");
const Bookmark = require("../models/bookmark.model");
const analyticsService = require("../services/analytics.service");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/admin/users
 * @access  Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Users fetched.", {
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate or activate a user
 * @route   PUT /api/admin/users/:id/toggle
 * @access  Admin
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, "User not found.");

    user.isActive = !user.isActive;
    await user.save();

    return sendSuccess(
      res,
      200,
      `User has been ${user.isActive ? "activated" : "deactivated"}.`,
      { isActive: user.isActive }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all categories
 * @route   GET /api/admin/categories
 * @access  Admin
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    return sendSuccess(res, 200, "Categories fetched.", { categories });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new category
 * @route   POST /api/admin/categories
 * @access  Admin
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, label, icon, description } = req.body;
    const category = await Category.create({ name, label, icon, description });
    return sendSuccess(res, 201, "Category created.", { category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/admin/categories/:id
 * @access  Admin
 */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return sendError(res, 404, "Category not found.");
    return sendSuccess(res, 200, "Category deleted.");
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get platform analytics
 * @route   GET /api/admin/analytics
 * @access  Admin
 */
const getAnalytics = async (req, res, next) => {
  try {
    const stats = await analyticsService.getPlatformStats();
    return sendSuccess(res, 200, "Analytics fetched.", { stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  toggleUserStatus,
  getCategories,
  createCategory,
  deleteCategory,
  getAnalytics,
};