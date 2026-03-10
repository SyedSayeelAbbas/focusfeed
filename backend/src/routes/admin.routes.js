const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  toggleUserStatus,
  getCategories,
  createCategory,
  deleteCategory,
  getAnalytics,
} = require("../controllers/admin.controller");
const protect = require("../middleware/auth.middleware");
const restrictTo = require("../middleware/role.middleware");

// All admin routes: must be logged in AND have role=admin
router.use(protect, restrictTo("admin"));

// User management
router.get("/users", getAllUsers);
router.put("/users/:id/toggle", toggleUserStatus);

// Category management
router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.delete("/categories/:id", deleteCategory);

// Analytics
router.get("/analytics", getAnalytics);

module.exports = router;