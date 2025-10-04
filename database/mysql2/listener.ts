import mysqlLegacy from "mysql";
import MySQLEvents from "@rodrigogs/mysql-events";

/**
 * check if listener is enabled from configuration
 */
const isListenerEnabled = () => {

}

/**
 * create a binary log listener object
 *
 * @param notifyOnStart
 */
const crateBinaryLogListener = async (db, notifyOnStart = false) => {
  // const connectionConfig = getConfig("config");
  // const dbName = _.get(connectionConfig, "database", "");

  // const connection = mysqlLegacy.createPool({
  //   ...connectionConfig,
  //   connectTimeout: 30000,
  //   acquireTimeout: 30000,
  // });

  // const serverId = randomNumber(1, MAX_SERVER_ID);
  // const mysqlEventsConfig = {
  //   startAtEnd: true,
  //   includeSchema: {
  //     [dbName]: true,
  //   },
  //   serverId,
  // };

  // const instance = new MySQLEvents(connection, mysqlEventsConfig);
  // instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, (err) => {
  //   console.error("triggered on MySQLEvents.EVENTS.CONNECTION_ERROR");
  //   console.error(err);
  // });
  // instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, (err) => {
  //   console.error("triggered on MySQLEvents.EVENTS.ZONGJI_ERROR");
  //   console.error(err);
  // });

  // instance.addTrigger({
  //   name: "monitoring",
  //   expression: `${config.database}.*`,
  //   statement: MySQLEvents.STATEMENTS.ALL,
  //   onEvent: async (event) => {
  //     // console.log(event);
  //     // console.log(event.affectedRows);

  //     let emitKey = "";
  //     switch (event?.type) {
  //       case "INSERT":
  //         emitKey = "insert";
  //         break;
  //       case "UPDATE":
  //         emitKey = "update";
  //         break;
  //       case "DELETE":
  //         emitKey = "delete";
  //         break;
  //     }

  //     if (emitKey !== "") {
  //       dbEvent.emit(emitKey, event)
  //     }

  //   },
  // });

  // return instance;
};