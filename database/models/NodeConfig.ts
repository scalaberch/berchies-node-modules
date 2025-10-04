import { Schema, model } from "mongoose";

export interface NodeConfigDoc {
  cronSoloMode: boolean;
  cronHostname: string;
  checkpointPassword: string;
  lastKnownMintTokenId: number;
  isComputingLeaderboard?: boolean;
  isMintingBadges?: boolean;
  underMaintenance?: boolean;
  maintenanceStartDate?: string;
  maintenanceEndDate?: string;
}

const NodeConfigSchema = new Schema({
  cronSoloMode: { type: Boolean, default: false },
  cronHostname: { type: String, default: "" },
  checkpointPassword: { type: String, default: "" },
  lastKnownMintTokenId: { type: Number, default: 1 },
  isComputingLeaderboard: { type: Boolean, default: false },
  isMintingBadges: { type: Boolean, default: false },
  underMaintenance: { type: Boolean, default: false },
  maintenanceStartDate: { type: String, default: "" },
  maintenanceEndDate: { type: String, default: "" },
});

export default model<NodeConfigDoc>("NodeConfig", NodeConfigSchema);
