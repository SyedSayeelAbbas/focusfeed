const Bookmark = require("../models/bookmark.model");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * @desc    Get all bookmarks for the logged-in user
 * @route   GET /api/bookmarks
 * @access  Private
 */
const getBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    return sendSuccess(res, 200, "Bookmarks fetched.", {
      count: bookmarks.length,
      bookmarks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add an article to bookmarks
 * @route   POST /api/bookmarks
 * @access  Private
 */
const addBookmark = async (req, res, next) => {
  try {
    const { articleId, title, description, url, urlToImage, source, publishedAt, category } =
      req.body;

    if (!articleId || !title || !url) {
      return sendError(res, 400, "articleId, title, and url are required.");
    }

    const existing = await Bookmark.findOne({
      user: req.user._id,
      articleId,
    });

    if (existing) {
      return sendError(res, 400, "Article is already bookmarked.");
    }

    const bookmark = await Bookmark.create({
      user: req.user._id,
      articleId,
      title,
      description,
      url,
      urlToImage,
      source,
      publishedAt,
      category,
    });

    return sendSuccess(res, 201, "Article bookmarked successfully.", { bookmark });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove a bookmark
 * @route   DELETE /api/bookmarks/:id
 * @access  Private
 */
const removeBookmark = async (req, res, next) => {
  try {
    const bookmark = await Bookmark.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!bookmark) {
      return sendError(res, 404, "Bookmark not found.");
    }

    await bookmark.deleteOne();
    return sendSuccess(res, 200, "Bookmark removed successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = { getBookmarks, addBookmark, removeBookmark };