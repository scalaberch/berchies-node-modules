import http from "http";
import { WSModule } from "./defines";

/**
 * initialize web sockets
 *
 * @param server
 * @returns
 */
const init = async (server: http.Server) => {
  const module = new WSModule(server, "/ws");
  module.start();
  return module;
};

export default {
  init
};
