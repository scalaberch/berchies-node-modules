import { EBGRequest, EBGResponse, EBGNext } from "../http/interfaces";
import {
  REST,
  Client,
  Routes,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  GatewayIntentBits,
  InteractionResponseType,
  InteractionType,
  APIApplicationCommandInteractionDataOption,
  ApplicationCommandOptionType,
} from "discord.js";

import _ from "lodash";
import nacl from "tweetnacl";
import { PUBLIC_KEY } from "./index";
import { ExtractedOptions } from "./defines";

export type RequestMethods = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";

/**
 * output as json but discord-friendly format json
 *
 * @param res
 * @param payload
 * @param type
 * @param visibleOnlyToUser
 * @returns
 */
export const outputAsJson = (
  res: EBGResponse,
  payload: any,
  type: number = InteractionResponseType.ChannelMessageWithSource,
  visibleOnlyToUser = false
) => {
  const flags = visibleOnlyToUser ? 64 : 0;

  return res.outputJson({
    type,
    data: {
      ...payload,
      flags,
    },
  });
};

/**
 * function to verify request signature from discord bot
 *
 * @param clientPublicKey
 * @returns
 */
const verifyDiscordRequest = (clientPublicKey = "") => {
  return function (req: EBGRequest, res: EBGResponse, next: EBGNext) {
    const signature = req.get("X-Signature-Ed25519");
    const timestamp = req.get("X-Signature-Timestamp");
    const body = req.rawBody || "";

    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, "hex"),
      Buffer.from(clientPublicKey, "hex")
    );

    if (!isVerified) {
      return res.outputError(
        "Bad request signature! Please check your request and try again.",
        {},
        401
      );
    }

    next();
  };
};

/**
 * generates the middleare to verify discord request.
 *
 * @returns
 */
export const generateVerifyDiscordRequestMiddleware = () =>
  verifyDiscordRequest(PUBLIC_KEY);

/**
 * main entrypoint for handling discord's interaction request
 *
 * @param req
 * @param res
 */
export const handleInteractionRequest = async (
  req: EBGRequest,
  res: EBGResponse,
  slashCommandCallback?: Function
) => {
  const { type, data, channel, channel_id, guild, guild_id, member } = req.body;

  let responseType: InteractionResponseType =
    InteractionResponseType.ChannelMessageWithSource;
  let responseData: any = {};
  let visibleOnlyToUser = false;

  switch (type) {
    case InteractionType.Ping: // ping from discord fore verification
      responseType = InteractionResponseType.Pong;
      break;
    case InteractionType.ApplicationCommand:
      if (typeof slashCommandCallback === "function") {
        const { name, options } = data;
        const cmdOptions = extractOptions(options);

        const callbackResult = await slashCommandCallback(name, {
          ...cmdOptions,
          channel_id,
          guild_id,
          member,
          channel,
          guild,
        });

        responseData = { ...callbackResult, ...responseData };
      }
      break;
    case InteractionType.MessageComponent: // user clicks a button / selects from select menu
    case InteractionType.ApplicationCommandAutocomplete: // discord is requesting autocomplete suggestions
    case InteractionType.ModalSubmit: // user submits a modal dialog
      break;
    default:
      responseData = { content: "❌ Unknown interaction" };
      visibleOnlyToUser = true;
  }

  return outputJson(res, responseType, responseData, visibleOnlyToUser);
};

/**
 * properly formatted json output caller
 *
 * @param response
 * @returns
 */
const outputJson = (
  response: EBGResponse,
  responseType: InteractionResponseType = InteractionResponseType.ChannelMessageWithSource,
  payload: any = {},
  visibleOnlyToUser = false,
  removeEmbeds = false,
  httpStatusCode = 200
) => {
  if (visibleOnlyToUser) {
    payload = { ...payload, flags: 64 };
  }
  if (removeEmbeds) {
    payload = { ...payload, flags: 4 };
  }

  // @todo: make sure data field must be typed to comply for discord's content output
  return response.outputJson(
    {
      type: responseType,
      data: payload,
    },
    httpStatusCode
  );
};

/**
 * cleanup the command options passed by discord so that it'll be clean
 *
 * @param options
 * @returns
 */
const extractOptions = (
  options?: APIApplicationCommandInteractionDataOption[]
): ExtractedOptions => {
  const result: ExtractedOptions = { params: {} };

  if (!options) return result;

  for (const option of options) {
    if (option.type === ApplicationCommandOptionType.Subcommand) {
      result.subcommand = option.name;
      Object.assign(result.params, extractOptions(option.options).params);
    } else if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
      // If there's a subcommand group, combine its name with the subcommand inside
      const nested = extractOptions(option.options);
      result.subcommand = nested.subcommand
        ? `${option.name} ${nested.subcommand}`
        : option.name;
      Object.assign(result.params, nested.params);
    } else {
      result.params[option.name] = option.value;
    }
  }

  return result;
};

export default {};
