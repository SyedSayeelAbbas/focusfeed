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

app.use(express.static(path.join(__dirname, '../../frontend/public')));

app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/articles',  articleRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/admin',     adminRoutes);


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

app.use(errorMiddleware);


app.use((req, res, next) => {
  
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }
  res.status(404).sendFile('404.html', {
    root: path.join(__dirname, '../../frontend/public')
  });
});


module.exports = app;