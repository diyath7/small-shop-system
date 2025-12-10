const bcrypt = require("bcrypt");

(async () => {
  const password = "admin123"; // use a new clean password
  const hash = await bcrypt.hash(password, 10);
  console.log("NEW HASH:", hash);
})();
