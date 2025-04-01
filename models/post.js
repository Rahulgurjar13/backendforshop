const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  coverImage: { type: String, default: '/uploads/placeholder.jpg' },
  date: { type: Date, default: Date.now },
  readTime: { type: Number, required: true },
  featured: { type: Boolean, default: false },
  author: {
    name: { type: String, required: true },
    avatar: { type: String, default: '/uploads/default-avatar.jpg' },
  },
});

// Indexes
postSchema.index({ date: -1 });
postSchema.index({ category: 1 });

// Pre-save hook
postSchema.pre('save', function (next) {
  this.coverImage = this.coverImage || '/uploads/placeholder.jpg';
  this.author.avatar = this.author.avatar || '/uploads/default-avatar.jpg';
  next();
});

module.exports = mongoose.model('Post', postSchema);