import { REST, Routes, Client, Events, GatewayIntentBits } from "discord.js";
import axios from "axios";

const { env } = process;
const discordToken = env.DISCORD_TOKEN || "";
const serverId = env.DISCORD_SERVER_ID || "";
const defaultChannel = env.DISCORD_CHANNEL || "";
const clientId = env.DISCORD_CLIENT_ID || "";
const clientSecret = env.DISCORD_CLIENT_SECRET || "";
const redirectUrl = env.DISCORD_REDIRECT_URL || "";

let client: Client;
let ready: Boolean = false;

interface EmbedField {
  name: string;
  value: any;
  inline?: boolean;
}

/**
 * experiment usage of discord.js
 *
 */
const init = () => {
  client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    ready = true;
  });

  client.login(discordToken);
};

/**
 * send a message using the discordapp api
 * https://discord.com/developers/docs/resources/channel#create-message
 *
 * @param hookObject
 * @param channel
 */
const sendLegacy = async (
  channel: string,
  content: string,
  embeds?: Array<object>
) => {
  const targetChannel = channel.length === 0 ? defaultChannel : channel;

  const data = {
    // Your message content and other properties according to the Discord API
    content,
    embeds,
  };

  const headers = {
    "Content-Type": "application/json",
    "Content-Length": JSON.stringify(data).length,
    Authorization: `Bot ${discordToken}`,
  };

  try {
    const response = await axios.post(
      `https://discordapp.com/api/v6/channels/${targetChannel}/messages`,
      data,
      { headers }
    );

    if (response.status === 200) {
      console.log("Message sent successfully:", response.data);
    } else {
      console.error("Error sending message:", response.statusText);
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

/**
 *
 * @param discordId
 */
const convertIdToTag = (discordId: string | number) => `<@!${discordId}>`;

/**
 *
 * @param description
 * @param color
 * @param fields
 * @returns {object}
 */
const createEmbedObject = (
  description: string,
  color: string,
  fields?: Array<EmbedField>
) => {
  const object = {
    type: "rich",
    description,
    color,
    fields,
  };

  return object;
};

/**
 *
 * @param jwt
 */
const generateAuthURL = (jwt: string) => {
  const authUrl = "https://discord.com/oauth2/authorize?";
  const params = new URLSearchParams({
    state: jwt,
    client_id: clientId,
    redirect_uri: redirectUrl,
    response_type: "code",
    scope: "identify email guilds guilds.members.read",
  });

  return `${authUrl}${params.toString()}`;
};

/**
 *
 * @param code
 * @returns
 */
const fetchUserData = async (code: any) => {
  try {
    // Exchange authorization code for access token
    const { data } = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUrl,
        grant_type: "authorization_code",
      })
    );

    const { access_token, expires_in } = data;

    // Get user information at least.
    const { data: userData } = await axios.get(
      "https://discord.com/api/users/@me",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    // then append the accessToken to the user data if it exists
    userData._accessToken = access_token;

    return Promise.resolve(userData);
  } catch (error) {
    return Promise.reject(error.response.data);
  }
};

/**
 *
 * @param accessToken
 */
const fetchUserGuilds = async (accessToken: string) => {
  const { data } = await axios.get("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return data;
};

/**
 *
 * @param accessToken
 */
const hasJoinedEbg = async (accessToken: string) => {
  const guilds = await fetchUserGuilds(accessToken);
  if (guilds.length === 0) {
    return false;
  }

  const filtered = guilds.filter((guild) => guild.id === serverId);
  return filtered.length > 0;
};

export default {
  init,
  sendLegacy,
  generateAuthURL,
  fetchUserData,
  hasJoinedEbg,
};
