import fs from "fs";
import path from "path";
import { IncomingMessage, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { generateUUID } from "@modules/strings";

const mainSocketsSrc = "./src/sockets.ts";

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
    this.ws = new WebSocketServer({ server, path });
  }

  public async loadHandler() {
    if (fs.existsSync(mainSocketsSrc)) {
      const module = await import(path.resolve(mainSocketsSrc));
      this.handler = module.default ?? module; // support both default and named export
    }
  }

  public async start() {
    const _this = this;

    // load the handlers
    await this.loadHandler();

    // attach the on connection handler
    this.ws.on("connection", async (socket: WebSocket, req: IncomingMessage) => {
      const client = new WSClient(socket);

      // if handler onConnect exists, then we execute it.
      if (_this.handler?.onConnect) {
        await _this.handler.onConnect(client, req);
      }

      // then add the client to the list
      this.clients[client.id] = client;

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
    });
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
}

export class WSClient {
  public socket: WebSocket;
  public id: string;
  public user: any;

  constructor(socket: WebSocket) {
    this.socket = socket;
    this.id = generateUUID();
  }

  public async send(data: Partial<WSMessageOut>) {
    const readyState = this.socket.readyState;
    if (readyState === WebSocket.OPEN) {
      const stringData = JSON.stringify(data);
      this.socket.send(stringData);
    }
  }

  public close() {
  }

  public setUser(user: any) {
    this.user = user;
  }
}
