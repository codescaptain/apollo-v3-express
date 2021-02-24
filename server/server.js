const http = require("http");
const { ApolloServer, PubSub } = require("apollo-server-express");
const express = require("express");

const messages = [];
const typeDefs = `
  type Message {
    id: ID!
    user: String!
    content: String!
  }
  type Query {
    messages: [Message!]
  }

  type Mutation{
      postMessage(user:String!,content:String!):ID!
  }

  type Subscription{
    messages: [Message!]
  }

`;
const subscribes = [];
const onMessagesUpdates = (fn) => subscribes.push(fn);

const resolvers = {
  Query: {
    messages: () => messages,
  },
  Mutation: {
    postMessage: (parent, { user, content }) => {
      const id = messages.length;
      messages.push({
        id,
        user,
        content,
      });
      subscribes.forEach((fn) => fn());
      return id;
    },
  },
  Subscription: {
    messages: {
      subscribe: (parent, args, { pubsub }) => {
        const channel = Math.random.toString(36).slice(2, 15);
        onMessagesUpdates(() => pubsub.publish(channel, { messages }));
        setTimeout(() => pubsub.publish(channel, { messages }), 0);
        return pubsub.asyncIterator(channel);
      },
    },
  },
};
const pubsub = new PubSub();
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: { pubsub },
  introspection: true,
});
const app = express();
server.applyMiddleware({ app });
const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

httpServer.listen(process.env.PORT || 4000, () => {
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
});
