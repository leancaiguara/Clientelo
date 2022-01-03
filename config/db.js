const mongoose = require("mongoose");

require("dotenv").config();

const client = async () => {
  try {
    await mongoose.connect(process.env.DB_MONGO, {
      useNewUrlParser: true,
    });
    console.log("DB conectada");
  } catch (err) {
    console.log("Error", err);
    process.exit(1);
  }
};

module.exports = client;
