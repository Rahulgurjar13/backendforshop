const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { check, validationResult } = require('express-validator');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

// Uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('Uploads directory ensured:', uploadsDir);
  } catch (err) {
    console.error('Failed to ensure uploads directory:', err);
  }
};
ensureUploadsDir();

// Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.access(uploadsDir, fs.constants.W_OK);
      cb(null, uploadsDir);
    } catch (err) {
      console.error('Uploads directory not writable:', err);
      cb(new Error('Uploads directory is not accessible or writable'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only JPEG, JPG, and PNG images are allowed'));
  },
});

// Validation
const postValidation = [
  check('title').notEmpty().withMessage('Title is required'),
  check('excerpt').notEmpty().withMessage('Excerpt is required'),
  check('content').notEmpty().withMessage('Content is required'),
  check('category').notEmpty().withMessage('Category is required'),
  check('author').custom((value) => {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed.name) throw new Error('Author name is required');
    return true;
  }),
];

// GET all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    console.log(`GET /api/posts - Fetched ${posts.length} posts from ${req.ip}`);
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error.message);
    res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
  }
});

// GET single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      console.warn(`Post not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Post not found' });
    }
    console.log(`GET /api/posts/${req.params.id} - Fetched post from ${req.ip}`);
    res.status(200).json(post);
  } catch (error) {
    console.error('Error fetching post:', error.message);
    res.status(500).json({ error: 'Failed to fetch post', details: error.message });
  }
});

// POST new post (Admin)
router.post(
  '/',
  authenticateAdmin,
  upload.single('coverImage'),
  postValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, excerpt, content, category, featured, author, readTime } = req.body;
      const parsedAuthor = typeof author === 'string' ? JSON.parse(author) : author;

      const postData = {
        title,
        excerpt,
        content,
        category,
        coverImage: req.file ? `/uploads/${req.file.filename}` : '/uploads/placeholder.jpg',
        readTime: readTime ? parseInt(readTime, 10) : Math.ceil(content.split(' ').length / 200),
        featured: featured === 'true' || featured === true,
        author: {
          name: parsedAuthor.name,
          avatar: parsedAuthor.avatar || '/uploads/default-avatar.jpg',
        },
        date: new Date(),
      };

      const post = new Post(postData);
      await post.save();
      console.log(`POST /api/posts - Created post ${post._id} from ${req.ip}`);
      res.status(201).json(post);
    } catch (error) {
      console.error('Error creating post:', error.message);
      if (req.file) {
        await fs.unlink(path.join(uploadsDir, req.file.filename)).catch((err) =>
          console.warn('Failed to clean up file:', req.file.filename, err)
        );
      }
      res.status(500).json({ error: 'Failed to create post', details: error.message });
    }
  }
);

// PUT update post (Admin)
router.put(
  '/:id',
  authenticateAdmin,
  upload.single('coverImage'),
  postValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, excerpt, content, category, featured, author, readTime } = req.body;
      const parsedAuthor = typeof author === 'string' ? JSON.parse(author) : author;

      const existingPost = await Post.findById(req.params.id);
      if (!existingPost) {
        console.warn(`Post not found: ${req.params.id}`);
        return res.status(404).json({ error: 'Post not found' });
      }

      const postData = {
        title,
        excerpt,
        content,
        category,
        coverImage: req.file ? `/uploads/${req.file.filename}` : existingPost.coverImage,
        readTime: readTime ? parseInt(readTime, 10) : Math.ceil(content.split(' ').length / 200),
        featured: featured === 'true' || featured === true,
        author: {
          name: parsedAuthor.name,
          avatar: parsedAuthor.avatar || '/uploads/default-avatar.jpg',
        },
        date: existingPost.date,
      };

      if (req.file && existingPost.coverImage !== '/uploads/placeholder.jpg') {
        await fs.unlink(path.join(__dirname, '..', existingPost.coverImage)).catch((err) =>
          console.warn('Failed to delete old image:', existingPost.coverImage, err)
        );
      }

      const post = await Post.findByIdAndUpdate(req.params.id, postData, { new: true });
      console.log(`PUT /api/posts/${req.params.id} - Updated post from ${req.ip}`);
      res.status(200).json(post);
    } catch (error) {
      console.error('Error updating post:', error.message);
      if (req.file) {
        await fs.unlink(path.join(uploadsDir, req.file.filename)).catch((err) =>
          console.warn('Failed to clean up file:', req.file.filename, err)
        );
      }
      res.status(500).json({ error: 'Failed to update post', details: error.message });
    }
  }
);

// DELETE post (Admin)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      console.warn(`Post not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.coverImage !== '/uploads/placeholder.jpg') {
      await fs.unlink(path.join(__dirname, '..', post.coverImage)).catch((err) =>
        console.warn('Failed to delete image:', post.coverImage, err)
      );
    }

    await Post.findByIdAndDelete(req.params.id);
    console.log(`DELETE /api/posts/${req.params.id} - Deleted post from ${req.ip}`);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error.message);
    res.status(500).json({ error: 'Failed to delete post', details: error.message });
  }
});

module.exports = router;