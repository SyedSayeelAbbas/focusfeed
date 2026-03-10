require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const connectDB        = require('./config/db');
const errorMiddleware  = require('./middleware/error.middleware');
const authRoutes       = require('./routes/auth.routes');
const userRoutes       = require('./routes/user.routes');
const articleRoutes    = require('./routes/article.routes');
const bookmarkRoutes   = require('./routes/bookmark.routes');
const adminRoutes      = require('./routes/admin.routes');

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// ✅ FIX: Serve frontend files from root
// /css/style.css → frontend/public/css/style.css
// /dashboard.html → frontend/public/dashboard.html
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// API Routes
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/articles',  articleRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/admin',     adminRoutes);

// Fallback — serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

app.use(errorMiddleware);


module.exports = app;