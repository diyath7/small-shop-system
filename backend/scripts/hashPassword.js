const bcrypt = require("bcrypt");

const password = "1234@"; // this will be the NEW password for admin1

(async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log("Hashed password:", hash);
})();
