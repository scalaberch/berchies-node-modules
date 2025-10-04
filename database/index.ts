import Mongo from "./mongo"
import Mysql from "./mysql"
import Prisma from "./prisma";
import Config from "./config"

import Mysql3 from "./mysql3"

export const mongo = Mongo;
export const mysql = Mysql;
export const prisma = Prisma;
export const config = Config;
export const mysql3 = Mysql3;

// Defines
export interface MysqlModuleConfig {
  enableBinaryLogListener: Boolean;
  provider?: string;
}