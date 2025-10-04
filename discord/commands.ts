import _ from "lodash";
import { APP_ID } from "@modules/discord";
import { getAppInstance } from "@modules/server";
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import {
  SlashCommandDefinitionMap,
  SlashCommandDefinition,
} from "@modules/discord/defines";

export type SlashCommandDefinitions = SlashCommandDefinitionMap;

/**
 * builds the slash commands definition list that will be used on the node.js server
 *
 * @param defineMap
 * @returns
 */
export const buildSlashCommandDefinition = (
  defineMap: SlashCommandDefinitionMap
) => {
  const commands = Object.keys(defineMap).map((commandKey) => {
    const commandDefinition = defineMap[commandKey];
    const command = executeDefineSlashCommand(
      new SlashCommandBuilder(),
      commandKey,
      commandDefinition
    );
    return command.toJSON();
  });

  return commands;
};

/**
 * defines the slash command object
 *
 * @param command
 * @param name
 * @param definition
 * @returns
 */
const executeDefineSlashCommand = (
  command: SlashCommandBuilder | SlashCommandSubcommandBuilder,
  name: string,
  definition: SlashCommandDefinition
) => {
  const description = definition.description || "";
  const options = definition.options || [];
  const subCommands = definition.subCommands || {};

  // set name and description
  command.setName(name);
  command.setDescription(description);

  // check for options
  if (options.length > 0) {
    for (const option of options) {
      const optionName = option?.name || "";
      if (optionName.length === 0) {
        continue;
      }

      const optDescription = option?.description || "";
      const type = option?.type || "string";
      const required = option?.required || false;
      const optionObject = {};

      switch (type) {
        default:
          command.addStringOption((opt) =>
            opt
              .setName(optionName)
              .setDescription(optDescription)
              .setRequired(required)
          );
      }
    }
  }

  // check for sub commands
  const subCommandKeys = Object.keys(subCommands);
  if (subCommandKeys.length > 0 && command instanceof SlashCommandBuilder) {
    for (const subCommandKey of subCommandKeys) {
      const newSubCommand = executeDefineSlashCommand(
        new SlashCommandSubcommandBuilder(),
        subCommandKey,
        subCommands[subCommandKey]
      ) as SlashCommandSubcommandBuilder;

      command.addSubcommand(newSubCommand);
    }
  }

  return command;
};

/**
 * gets all slash command that are registered to this bot.
 * if guild id is empty, then it will fetch all commands
 * from all guilds that installed this bot.
 *
 * @param guildId
 * @returns
 */
const getSlashCommandsFromRemote = async (guildId = "", stringify = false) => {
  const Discord = getAppInstance("discord");
  if (!Discord.ready) {
    return [];
  }

  const { request, Routes } = Discord;
  const endpoint =
    guildId === ""
      ? Routes.applicationCommands(APP_ID)
      : Routes.applicationGuildCommands(APP_ID, guildId);

  // Fetch currently registered commands
  try {
    const current = (await request.get(endpoint)) as any[];

    // if stringify is enabled, parse it to be a string and then output
    if (stringify) {
      return JSON.stringify(
        current.map((c) => ({
          name: c.name,
          description: c.description,
          options: c.options,
        }))
      );
    }

    return current;
  } catch (error) {
    console.error("❌ Error fetching slash commands:", error);
    return [];
  }
};

/**
 * synchronize the slash commands to the bot. if guild id is empty
 * then it will synchronize for all guilds that have installed this :)
 *
 * @param guildId
 * @param localCommandList
 */
const syncSlashCommands = async (guildId = "", localCommandList = []) => {
  const remoteCommandList = await getSlashCommandsFromRemote(guildId);
  const isUpToDate = _.isEqual(localCommandList, remoteCommandList);

  if (!isUpToDate) {
    // do push to discord what's local
    pushSlashCommandsToRemote(guildId, localCommandList);
  }

  // console.log(JSON.stringify(localCommandList));
  // console.log(JSON.stringify(remoteCommandList));
  // console.log(`isUpToDate: ${isUpToDate}`);
};

/**
 * push slash commands to remote. if guild id is empty
 * then it will push for all guilds that have installed this :)
 *
 * @param guildId
 * @param commandList
 * @returns
 */
const pushSlashCommandsToRemote = async (guildId = "", commandList = []) => {
  const Discord = getAppInstance("discord");
  if (!Discord.ready) {
    return false;
  }

  const { request, Routes } = Discord;
  const endpoint =
    guildId === ""
      ? Routes.applicationCommands(APP_ID)
      : Routes.applicationGuildCommands(APP_ID, guildId);

  // Fetch currently registered commands
  try {
    (await request.put(endpoint, {
      body: commandList,
    })) as any[];

    return true;
  } catch (error) {
    console.error("❌ Error registering commands:", error);
    return false;
  }
};

export default {
  buildSlashCommandDefinition,
  getSlashCommandsFromRemote,
  syncSlashCommands,
  pushSlashCommandsToRemote,
};
