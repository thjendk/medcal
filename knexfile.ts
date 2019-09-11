require("dotenv-flow").config({ node_env: "development" });

module.exports = {
  development: {
    client: "mysql",
    connection: process.env.DATABASE_URL
  }
};
