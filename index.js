const { ApolloServer } = require("apollo-server");
const jwt = require("jsonwebtoken");
const { ApolloServerPluginLandingPageGraphQLPlayground } = require("apollo-server-core");

require("dotenv").config();

const typeDefs = require("./db/schema");

const resolvers = require("./db/resolvers");

const client = require("./config/db");

//corremos base de datos
client();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers["authorization"] || "";
    if (token) {
      try {
        const usuario = jwt.verify(token, process.env.SECRETO);

        return {
          usuario,
        };
      } catch (err) {
        console.log(err);
      }
    }
  },
  plugins: [
    ApolloServerPluginLandingPageGraphQLPlayground({
      // options
    }),
  ],
});

server.listen().then(({ url }) => {
  console.log("server corriendo en url", url);
});
