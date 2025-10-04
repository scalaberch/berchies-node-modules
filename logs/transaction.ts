import { createCustomLogStream, write } from "@modules/logs";
export const enableTransactionLog =
  parseInt(process.env.EBG_LOGGER_ENABLE_TRANSACTION_LOG || "") == 1;

const env = process.env.ENV || "";
const transactionLogname = `transactions/${env}`;

export const logTransaction = async () => {};

const transactionLogConfig = () => {};

const init = async () => {
  await createCustomLogStream(transactionLogname);
};

const post = (username: string, method: string, subject: string, data: any) => {
  const json = JSON.parse(data);
  const action = methodToAction(method);
  const message = `${username} has ${action}${subject} with the following data: ${json}`;
  write(message, false, transactionLogname);
};

const methodToAction = (method: string) => {
  switch (method.toUpperCase()) {
    case "POST":
      return "added a ";
    case "PUT":
      return "updated a ";
    case "DELETE":
      return "removed a ";
    default:
      return "fetched a ";
  }
};

export default {
  init,
  post,
};
