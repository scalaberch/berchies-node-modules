import fs from "fs";
import path from "path";
import { IncomingMessage, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { generateUUID } from "@modules/strings";
import { isRunningInTypeScript } from "@modules/server";

const mainSocketsSrc = "./src/sockets";
const PING_INTERVAL = 30000;

export interface WSConfig {
  uri: string;
  enableAuth: boolean;
  authMethod: "jwt" | "oauth";
}

export interface WSHandler {
  onConnect: Function;
  onMessage: Function;
  onClose: Function;
  broadcastToAll?: Function;
}

export enum MessageTypes {
  ping = "ping",
  pong = "pong",
  refreshAccessToken = "refresh",
}

export interface WSMessageIn {
  type: string;
  payload: any;
}

export interface WSMessageOut {
  response: string;
  data: any;
}

export class WSModule {
  public clients: Record<string, WSClient> = {};
  public handler: WSHandler;
  public ws: WebSocketServer;

  constructor(server: Server, path: "/ws") {
    this.clients = {};
    this.ws = new WebSocketServer({ server, path });
  }

  public async loadHandler() {
    const srcFile = `${mainSocketsSrc}.${isRunningInTypeScript() ? "ts" : "js"}`;

    if (fs.existsSync(srcFile)) {
      const module = await import(path.resolve(srcFile));
      this.handler = module.default ?? module; // support both default and named export
    } else {
      console.warn("Module not loaded!");
    }
  }

  public async start() {
    const _this = this;
    let interval;

    // load the handlers
    await this.loadHandler();

    // attach the on connection handler
    this.ws.on("connection", async (socket: WebSocket, req: IncomingMessage) => {
      const _this = this;
      const ip = req.socket.remoteAddress;
      const client = new WSClient(socket);

      // if handler onConnect exists, then we execute it.
      if (_this.handler?.onConnect) {
        await _this.handler.onConnect(client, req);
      }

      // then add the client to the list
      this.clients[client.id] = client;

      // handle pong response
      socket.on("pong", () => {
        client.setAlive(true);
      });

      // then handle on message recieved
      socket.on("message", (data: string) => {
        const message = data.toString();
        try {
          const data: WSMessageIn = JSON.parse(message);
          const type = data?.type || "";

          if (type === "ping") {
            client.send({ response: "pong" });
            return;
          }

          if (this.handler?.onMessage) {
            this.handler.onMessage(client, data);
          }
        } catch (error) {
          console.error("Invalid parsing message: ", error);
        }
      });

      // and then lastly handle on close
      socket.on("close", () => {
        if (this.handler?.onClose) {
          this.handler.onClose(client);
        }

        // then remove the client from the list.
        delete this.clients[client.id];
      });

      // add error handler
      socket.on("error", console.error);
    });

    // attach on close handler
    this.ws.on("close", () => {
      clearInterval(interval);
    });

    interval = setInterval(function () {
      const clients = Object.values(_this.clients);
      if (clients.length === 0) {
        return;
      }

      clients.forEach((client: WSClient) => {
        //   // if (ws.isAlive === false) return ws.terminate();
        //   //   // ws.isAlive = false;
        client.ping();
      });
    }, PING_INTERVAL);
  }

  public getClientCount() {
    return Object.keys(this.clients).length;
  }

  public shutdown() {
    this.ws.close(() => {
      console.log("WebSocket server closed.");
    });

    const clients = Object.values(this.clients);
    clients.forEach((client) => {
      client.socket.close(1001, "Server shutting down.");
    });
  }

  public sendToAll(data: any) {
    if (this.getClientCount() === 0) {
      return;
    }

    const clients = Object.values(this.clients);

    clients.forEach((client) => {
      client.send(data);
    });
  }

  public getAllClients() {}
}

export class WSClient {
  public socket: WebSocket;
  public id: string;
  public user: any;
  public isAlive: boolean;

  constructor(socket: WebSocket) {
    this.socket = socket;
    this.id = generateUUID();
    this.isAlive = true;
  }

  public async send(data: Partial<WSMessageOut>) {
    const readyState = this.socket.readyState;
    if (readyState === WebSocket.OPEN) {
      const stringData = JSON.stringify(data);
      this.socket.send(stringData);
    }
  }

  public ping() {
    const readyState = this.socket.readyState;
    if (readyState === WebSocket.OPEN) {
      this.socket.ping();
    }
  }

  public close(forceTerminate = false) {
    if (forceTerminate) {
      this.socket.terminate();
      return;
    }

    this.socket.close();
  }

  public setUser(user: any) {
    this.user = user;
  }

  public setAlive(alive: boolean) {
    this.isAlive = alive;
  }
}
