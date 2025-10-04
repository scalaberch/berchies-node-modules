import { Schema, model } from "mongoose";

export interface NodeServersDoc {
  hostname: string;
  ipAddress: string;
  isMaster: boolean;
  environment: string;
  port: number;
}

const NodeServersSchema = new Schema({
  hostname: { type: String, default: "" },
  ipAddress: { type: String, default: "" },
  isMaster: { type: Boolean, default: false },
  environment: { type: String, default: "" },
  port: { type: Number, default: 80 }
});

export default model<NodeServersDoc>("NodeServers", NodeServersSchema);