require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const user = await User.findOne({ email: 'admin@example.com' });
    if (!user) {
      console.log('User not found');
      return mongoose.connection.close();
    }

    const isMatch = await bcrypt.compare('newadmin456', user.password);
    console.log('Password match:', isMatch);
    console.log('Stored hash:', user.password);
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB error:', err);
    mongoose.connection.close();
  });