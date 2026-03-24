const User = require("../models/user.model");
const { generateToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * @desc    
 * @route   
 * @access  
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, interests, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 400, "Email is already registered.");
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';

    const user = await User.create({
      name,
      email,
      password,
      interests: interests || [],
      role: assignedRole,
    });

    const token = generateToken(user._id, user.role);

    return sendSuccess(res, 201, "Account created successfully.", {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        interests: user.interests,
        role: user.role,
        theme: user.theme,
        language: user.language,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    
 * @route   
 * @access  
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, "Email and password are required.");
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 401, "Invalid email or password.");
    }

    if (!user.isActive) {
      return sendError(res, 403, "Your account has been deactivated.");
    }

    const token = generateToken(user._id, user.role);

    return sendSuccess(res, 200, "Login successful.", {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        interests: user.interests,
        role: user.role,
        theme: user.theme,
        language: user.language,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    
 * @route   
 * @access 
 */
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, "User fetched successfully.", { user: req.user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    
 * @route   
 * @access  
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword))) {
      return sendError(res, 400, "Current password is incorrect.");
    }

    user.password = newPassword;
    await user.save();

    return sendSuccess(res, 200, "Password changed successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, changePassword };