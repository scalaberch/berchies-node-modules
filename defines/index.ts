

export enum Environment {
  dev = "dev",
  test = "test",
  staging = "staging",
  prod = "prod",
  production = "production", // alias of prod
}

export type Modules =
  | "queue"
  | "logger"
  | "mongodb"
  | "moralis"
  | "cron"
  | "cache"
  | "slack"
  | "checkpoint"
  | "mysqldb"
  | "http"
  | "prismadb"
  | "discord"
  | "websockets";