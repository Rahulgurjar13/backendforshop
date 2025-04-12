const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const multer = require('multer');
const { check, validationResult } = require('express-validator');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

// Cloudinary config (use your environment variables)
cloudinary.config({
  // cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer config (memory storage only)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const isValid = filetypes.test(file.mimetype);
    cb(null, isValid);
  },
});

// Validation rules
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

// Helper to upload image buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, filename) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: `blog/${filename}`, folder: 'blog' },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// GET all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET one post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST - create new post
router.post(
  '/',
  authenticateAdmin,
  upload.single('coverImage'),
  postValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { title, excerpt, content, category, featured, author, readTime } = req.body;
      const parsedAuthor = typeof author === 'string' ? JSON.parse(author) : author;

      let imageUrl = 'https://via.placeholder.com/600x400.png?text=No+Image';

      if (req.file) {
        imageUrl = await uploadToCloudinary(req.file.buffer, Date.now().toString());
      }

      const post = new Post({
        title,
        excerpt,
        content,
        category,
        coverImage: imageUrl,
        readTime: readTime ? parseInt(readTime) : Math.ceil(content.split(' ').length / 200),
        featured: featured === 'true' || featured === true,
        author: {
          name: parsedAuthor.name,
          avatar: parsedAuthor.avatar || 'https://via.placeholder.com/150.png?text=User',
        },
        date: new Date(),
      });

      await post.save();
      res.status(201).json(post);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create post', details: error.message });
    }
  }
);

// PUT - update post
router.put(
  '/:id',
  authenticateAdmin,
  upload.single('coverImage'),
  postValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { title, excerpt, content, category, featured, author, readTime } = req.body;
      const parsedAuthor = typeof author === 'string' ? JSON.parse(author) : author;

      const existingPost = await Post.findById(req.params.id);
      if (!existingPost) return res.status(404).json({ error: 'Post not found' });

      let imageUrl = existingPost.coverImage;
      if (req.file) {
        imageUrl = await uploadToCloudinary(req.file.buffer, Date.now().toString());
      }

      const updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        {
          title,
          excerpt,
          content,
          category,
          coverImage: imageUrl,
          readTime: readTime ? parseInt(readTime) : Math.ceil(content.split(' ').length / 200),
          featured: featured === 'true' || featured === true,
          author: {
            name: parsedAuthor.name,
            avatar: parsedAuthor.avatar || 'https://via.placeholder.com/150.png?text=User',
          },
        },
        { new: true }
      );

      res.status(200).json(updatedPost);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update post', details: error.message });
    }
  }
);

// DELETE post
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    await Post.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
