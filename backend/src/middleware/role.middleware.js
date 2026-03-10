const { sendError } = require("../utils/response");

/**
 * Restrict access to specific roles
 * Usage: restrictTo("admin") or restrictTo("admin", "moderator")
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        "You do not have permission to perform this action."
      );
    }
    next();
  };
};

module.exports = restrictTo;