
export type RequestMethods = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";

export type CommandOptionType = "string" | "integer" | "number" | "boolean";

export interface SlashCommandOption {
  name: string;
  description?: string;
  type: CommandOptionType;
  required?: boolean;
}

export interface SlashCommandDefinition {
  description?: string;
  options?: SlashCommandOption[];
  subCommands?: SlashCommandDefinitionMap;
}

export type SlashCommandDefinitionMap = Record<string, SlashCommandDefinition>;

export interface ExtractedOptions {
  subcommand?: string;
  params: Record<string, unknown>;
}

/**
 * define api base path
 * 
 */
export const apiBasePath = "https://discord.com/api/v10/";