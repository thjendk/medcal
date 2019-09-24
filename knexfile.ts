require("dotenv-flow").config({
  node_env: process.env.NODE_ENV ? process.env.NODE_ENV : "development"
});

module.exports = {
  development: {
    client: "mysql",
    connection: process.env.DATABASE_URL
  },
  production: {
    client: "mysql",
    connection: process.env.DATABASE_URL
  }
};
