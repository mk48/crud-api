const db = require("knex")({
  client: "sqlite3", // or 'better-sqlite3'
  connection: {
    filename: "./db/db.sqlite",
  },
  useNullAsDefault: true, // SQLite-specific setting
  debug: true, // Shows queries in console (disable in production)
});

module.exports = db;
