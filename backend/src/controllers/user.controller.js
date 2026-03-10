const User = require("../models/user.model");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return sendSuccess(res, 200, "Profile fetched.", { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile (name, avatar, theme, language)
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ["name", "avatar", "theme", "language"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return sendSuccess(res, 200, "Profile updated successfully.", { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user interests
 * @route   PUT /api/users/interests
 * @access  Private
 */
const updateInterests = async (req, res, next) => {
  try {
    const { interests } = req.body;

    if (!Array.isArray(interests)) {
      return sendError(res, 400, "Interests must be an array.");
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { interests },
      { new: true }
    );

    return sendSuccess(res, 200, "Interests updated successfully.", {
      interests: user.interests,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, updateInterests };