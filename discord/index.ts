import _ from "lodash";
import axios from "axios";
import { getEnvVariable } from "@modules/env";
import {
  REST,
  Client,
  Routes,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  GatewayIntentBits,
} from "discord.js";

import { RequestMethods, apiBasePath } from "./defines";

// define all env variables
export const API_BASE_PATH: string = apiBasePath;
export const APP_ID: string = getEnvVariable("DISCORD_APP_ID");
export const BOT_TOKEN: string = getEnvVariable("DISCORD_BOT_TOKEN");
export const PUBLIC_KEY: string = getEnvVariable("DISCORD_PUBLIC_KEY");

/**
 * sends a request to discord api
 *
 * @param method
 * @param endpoint
 * @param payload
 * @param options
 * @returns
 * @throws
 */
export const SendAPIRequest = async (
  method: RequestMethods = "GET",
  endpoint = "",
  payload: any = {},
  options: any = {}
) => {
  const url = `${apiBasePath}${endpoint}`;
  const data = {};

  const headers = {
    Authorization: `Bot ${BOT_TOKEN}`,
    "Content-Type": "application/json",
    "Content-Length": JSON.stringify(data).length,
    ...(options.headers || {}),
  };

  try {
    const response = await axios({
      url,
      method,
      headers,
    });

    if (response.status === 200) {
      console.log("Message sent successfully:", response.data);
    } else {
      console.error("Error sending message:", response.statusText);
    }
  } catch (err) {
    if (err.response) {
      console.error(err.response.status);
      throw new Error(JSON.stringify(err.response.data));
    }
    throw err;
  }

  // const headers = {
  //   "Content-Type": "application/json",
  //   "Content-Length": JSON.stringify(data).length,
  //   Authorization: `Bot ${discordToken}`,
  // };

  // if (options.body) options.body = JSON.stringify(options.body);

  // try {
  //   const response = await axios({
  //     url,
  //     method,
  //     headers: {
  //       Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
  //       "Content-Type": "application/json; charset=UTF-8",
  //       "User-Agent":
  //         "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
  //       ...(options.headers || {}),
  //     },
  //     data: options.body || undefined,
  //   });
  // } catch (err) {
  //   if (err.response) {
  //     console.error(err.response.status);
  //     throw new Error(JSON.stringify(err.response.data));
  //   }

  //   throw err;
  // }
};

/**
 * initializer as a module
 *
 * @returns
 */
const init = () => {
  const request = new REST({ version: "10" }).setToken(BOT_TOKEN);
  const module = {
    request,
    Routes,
    ready: false,
  };

  return new Promise((resolve, reject) => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once("ready", () => {
      module.ready = true;
      resolve({ user: client.user.tag, ...module }); // return the client instance when ready
    });

    client.login(BOT_TOKEN).catch((err) => {
      console.error("❌ Invalid token or no API access:", err);
      reject(err);
    });
  });
};

export default {
  init,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
};
