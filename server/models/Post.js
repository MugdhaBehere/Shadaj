import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  authorId: String,
  authorName: String,
  authorAvatar: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  authorId: { type: String, required: true },
  authorName: String,
  authorAvatar: String,
  authorRole: String,
  authorInstrument: String,
  content: { type: String, required: true },
  image: String,
  video: String,
  audio: String,
  isAI: { type: Boolean, default: false },
  likedBy: [String], // Array of User IDs
  comments: [commentSchema],
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);
export default Post;