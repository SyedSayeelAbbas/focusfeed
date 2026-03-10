const { verifyToken } = require("../utils/jwt");
const { sendError } = require("../utils/response");
const User = require("../models/user.model");

const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return sendError(res, 401, "Not authorized. No token provided.");
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user to request
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return sendError(res, 401, "User not found or account deactivated.");
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, "Invalid or expired token.");
  }
};

module.exports = protect;