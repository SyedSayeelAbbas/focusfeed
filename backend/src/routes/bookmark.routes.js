const express = require("express");
const router = express.Router();
const { getBookmarks, addBookmark, removeBookmark } = require("../controllers/bookmark.controller");
const protect = require("../middleware/auth.middleware");

router.use(protect); // All bookmark routes require authentication

router.get("/", getBookmarks);
router.post("/", addBookmark);
router.delete("/:id", removeBookmark);

module.exports = router;