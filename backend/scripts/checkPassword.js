const bcrypt = require("bcrypt");

const hash =
  "$2b$10$UDTUfoLeLGJL07BexiFlvu2JcDj1ONUwsv6YcFUM9KxIVG9bDaYu"; // from DB

(async () => {
  console.log("check '1234@' ->", await bcrypt.compare("1234@", hash));
  console.log("check '1234'  ->", await bcrypt.compare("1234", hash));
})();
