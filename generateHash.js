// generateHash.js
const bcrypt = require('bcrypt');

const generateHash = async () => {
  const password = 'admin123'; // Change this to your desired password
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Generated hash:', hash);
};

generateHash();