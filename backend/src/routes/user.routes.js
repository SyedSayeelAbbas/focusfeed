const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, updateInterests } = require("../controllers/user.controller");
const protect = require("../middleware/auth.middleware");

router.use(protect); // All user routes require authentication

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/interests", updateInterests);

module.exports = router;