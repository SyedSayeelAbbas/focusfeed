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

router.use(protect, restrictTo("admin"));

router.get("/users", getAllUsers);
router.put("/users/:id/toggle", toggleUserStatus);

router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/analytics", getAnalytics);

module.exports = router;