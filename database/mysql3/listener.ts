import mysqlLegacy from "mysql";
import { createPool, Pool } from 'mysql2';
// import MySQLEvents from "@rodrigogs/mysql-events";
import MySQLEvents from "@rodrigogs/mysql-events";
import { randomNumber } from "../../helpers";

export const MAX_SERVER_ID = 4294967295;

class EbgMysqlListener {
  private listener;
  private listening: boolean = false;

  constructor(settings) {
    const { database, username: user, password, host, port } = settings

    const connection = mysqlLegacy.createPool({
      host, // Replace with your MySQL host
      user, // Replace with your MySQL user
      password, // Replace with your MySQL password
      database, // Replace with your MySQL database
      connectionLimit: 10, // Adjust as needed
      connectTimeout: 30000,
      acquireTimeout: 30000,
    });

    const serverId = randomNumber(1, MAX_SERVER_ID);
    const mysqlEventsConfig = {
      startAtEnd: true,
      includeSchema: {
        [database]: true,
      },
      serverId,
    };

    this.listener = new MySQLEvents(connection, mysqlEventsConfig);
  }

  start() {
    this.listening = true;
  }

  stop() {
    const parent = this;
    if (!parent.listening) {
      return false;
    }

    parent.listener.stop()
      .then(() => {
        parent.listening = false;
      })
      .catch(err => console.error('Listener error: Something wrong while stopping the listener.', err));
  }
}


const onConnectionError = (error) => {
  console.error("triggered on MySQLEvents.EVENTS.CONNECTION_ERROR");
  console.error(error);
}

const onZongjiError = (error) => {
  console.error("triggered on MySQLEvents.EVENTS.ZONGJI_ERROR");
  console.error(error);
}

const handleOnEvent = async (event) => {
  console.log(event);
  // console.log(event.affectedRows);

  // let emitKey = "";
  // switch (event?.type) {
  //   case "INSERT":
  //     emitKey = "insert";
  //     break;
  //   case "UPDATE":
  //     emitKey = "update";
  //     break;
  //   case "DELETE":
  //     emitKey = "delete";
  //     break;
  // }
}

export const createListener = async (connectionPool, mysqlSettings) => {
  const { database, username: user, password, host, port } = mysqlSettings

  // const pool = createPool({
  //   host, // Replace with your MySQL host
  //   user, // Replace with your MySQL user
  //   password, // Replace with your MySQL password
  //   database, // Replace with your MySQL database
  //   connectionLimit: 10, // Adjust as needed
  // });

  const connection = mysqlLegacy.createPool({
    host, // Replace with your MySQL host
    user, // Replace with your MySQL user
    password, // Replace with your MySQL password
    database, // Replace with your MySQL database
    connectionLimit: 10, // Adjust as needed
    connectTimeout: 30000,
    acquireTimeout: 30000,
  });

  const serverId = randomNumber(1, MAX_SERVER_ID);
  const mysqlEventsConfig = {
    startAtEnd: true,
    includeSchema: {
      [database]: true,
    },
    serverId,
  };

  const instance = new MySQLEvents(connection, mysqlEventsConfig);


  // const connection = await pool.getConnection((cb) => { console.log(cb)});
  // const mysqlEventsConfig = {
  //   connection,
  //   startAtEnd: true,
  //   includeSchema: {
  //     [database]: true,
  //   },
  // }

  // const instance = new MySQLEvents(mysqlEventsConfig);

  // const mysqlEventsConfig = {
  //   startAtEnd: true,
  //   includeSchema: {
  //     [database]: true,
  //   },
  //   serverId: 1,
  // };



  // const instance = new MySQLEvents(connectionPool, mysqlEventsConfig);
  // instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, onConnectionError);
  // instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, onZongjiError);

  // instance.addTrigger({
  //   name: "monitoring",
  //   expression: `${database}.*`,
  //   statement: MySQLEvents.STATEMENTS.ALL,
  //   onEvent: handleOnEvent
  // });

  // @todo: just do something
  instance.start().then(() => {
    console.log("  • Started listening to MySQL database for changes...");
  })
    .catch((err) =>
      console.error("Something bad happened at MySQLEvents", err)
    );

  // return instance;
}

export const createListenerOld = (connectionPool, mysqlSettings) => {
  const { database, username: user, password, host, port } = mysqlSettings

  // const connection = mysqlLegacy.createPool({
  //   ...connectionConfig,
  //   connectTimeout: 30000,
  //   acquireTimeout: 30000,
  // });

  const mysqlEventsConfig = {
    startAtEnd: true,
    includeSchema: {
      [database]: true,
    },
    serverId: 1,
  };

  const instance = new MySQLEvents(connectionPool, mysqlEventsConfig);
  instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, onConnectionError);
  instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, onZongjiError);

  instance.addTrigger({
    name: "monitoring",
    expression: `${database}.*`,
    statement: MySQLEvents.STATEMENTS.ALL,
    onEvent: handleOnEvent
  });

  // @todo: just do something
  instance.start().then(() => {
    console.log("  • Started listening to MySQL database for changes...");
  })
    .catch((err) =>
      console.error("Something bad happened at MySQLEvents", err)
    );

  return instance;
}