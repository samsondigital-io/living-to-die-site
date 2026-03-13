import { createClient } from "tinacms/dist/client";
import { queries } from "./types";
export const client = createClient({ url: 'http://localhost:4001/graphql', token: '53d0afa8067e7c490323a2e3ec2cc230d26f8c79', queries,  });
export default client;
  