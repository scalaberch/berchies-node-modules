import cors from "cors"
import { Express } from "express";
import { isDevEnv } from "../env";

const applyCors = (server: Express, config: any) => {
  if (isDevEnv()) {
    // @todo: might wanna check this one first for vulns?
    return server.use(cors());
  }

  // server.use()
  server.use(cors({
    credentials: true,
    origin: function (origin, callback) {
      // allow requests with no origin 
      // (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (config.cors.domains.indexOf(origin) === -1) {
        var msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}.`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    }
  }));
}

export default applyCors;