const express = require("express");
const router = express.Router();
const { getFeed, searchArticles, getTopHeadlines } = require("../controllers/article.controller");
const protect = require("../middleware/auth.middleware");

router.use(protect);

router.get("/feed", getFeed);
router.get("/search", searchArticles);
router.get("/top", getTopHeadlines);

module.exports = router;