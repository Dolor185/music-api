const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    login: String,
    pass: String,
    token: String,
  },
  { versionKey: false }
);

const User = mongoose.model("user", userSchema);

module.exports = { User };
