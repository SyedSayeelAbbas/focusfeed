const User = require("../models/user.model");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * @desc   
 * @route 
 * @access  
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
 * @desc   
 * @route  
 * @access  
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
 * @desc  
 * @route   
 * @access  
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