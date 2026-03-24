const newsService = require("../services/news.service");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * @desc    Get personalized news feed based on user interests
 * @route   GET /api/articles/feed
 * @access  Private
 */
const getFeed = async (req, res, next) => {
  try {
    console.log("🔍 getFeed called");
    console.log("Interests:", req.user.interests);
    console.log("NEWS_API_KEY:", process.env.NEWS_API_KEY ? "SET ✅" : "MISSING ❌");

    const interests = req.user.interests;
    const language = req.user.language || "en";
    const { page = 1, pageSize = 20 } = req.query;

    let articles;

    if (!interests || interests.length === 0) {
      // No interests set — fall back to general top headlines
      console.log("[getFeed] No interests set, fetching general headlines");
      articles = await newsService.fetchTopHeadlines("general", language, {
        pageSize: Number(pageSize),
      });
    } else {
      articles = await newsService.fetchByInterests(interests, language, {
        page: Number(page),
        pageSize: Number(pageSize),
      });
    }

    console.log(`[getFeed] Returning ${articles.length} articles`);

    return sendSuccess(res, 200, "Feed fetched successfully.", {
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error("getFeed error:", error.message);
    return sendError(
      res,
      503,
      "Could not fetch articles. Please try again later."
    );
  }
};

/**
 * @desc    
 * @route   
 * @access  
 */
const searchArticles = async (req, res, next) => {
  try {
    const { q, page = 1, pageSize = 10 } = req.query;
    if (!q) return sendError(res, 400, "Search query (q) is required.");

    console.log(`[searchArticles] query="${q}"`);

    const articles = await newsService.searchNews(q, {
      page: Number(page),
      pageSize: Number(pageSize),
    });

    return sendSuccess(res, 200, "Search results fetched.", {
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error("searchArticles error:", error.message);
    return sendError(res, 503, "Search failed. Please try again later.");
  }
};

/**
 * @desc    
 * @route   
 * @access  
 */
const getTopHeadlines = async (req, res, next) => {
  try {
    const { pageSize = 20, category = "general", language = "en" } = req.query;

    console.log(`[getTopHeadlines] category="${category}"`);

    const articles = await newsService.fetchTopHeadlines(category, language, {
      pageSize: Number(pageSize),
    });

    return sendSuccess(res, 200, "Top headlines fetched.", {
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error("getTopHeadlines error:", error.message);
    return sendError(
      res,
      503,
      "Could not fetch headlines. Please try again later."
    );
  }
};

module.exports = { getFeed, searchArticles, getTopHeadlines };