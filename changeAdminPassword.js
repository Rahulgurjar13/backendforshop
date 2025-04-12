// // scripts/createAdmin.js
// require('dotenv').config();
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
// const User = require('../models/User');

// const ADMIN_EMAIL = 'admin@example.com';
// const ADMIN_PASSWORD = 'newadmin456';

// mongoose.connect(process.env.MONGO_URI)
//   .then(async () => {
//     console.log('Connected to MongoDB at', process.env.MONGO_URI);

//     let user = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

//     if (user) {
//       console.log('Admin user already exists:', user.email);
//       const salt = await bcrypt.genSalt(10);
//       const newHash = await bcrypt.hash(ADMIN_PASSWORD, salt);
//       user.password = newHash;
//       await user.save({ validateBeforeSave: false });
//       console.log('Admin password updated to:', ADMIN_PASSWORD);
//       console.log('New password hash:', newHash);
//     } else {
//       console.log('Creating new admin user...');
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

//       user = new User({
//         email: ADMIN_EMAIL,
//         password: hashedPassword,
//         isAdmin: true,
//       });

//       await user.save();
//       console.log('Admin user created:', {
//         email: user.email,
//         isAdmin: user.isAdmin,
//         id: user._id,
//       });
//     }

//     mongoose.connection.close();
//   })
//   .catch(err => {
//     console.error('Error:', err.message);
//     mongoose.connection.close();
//   });