import { WebClient } from "@slack/web-api"

const { env } = process;
export const slackOwnerEmail = "kieth@eyeball.gg";
export const slackOauthToken = env.SLACK_OAUTH_TOKEN || '';
export const defaultChannelId = 'C06JAMUDW5N'; // #bot-notification

let web: WebClient;

const init = () => {
  web = new WebClient(slackOauthToken);
  return web
}

const getChannels = async () => {
  // const result = await web.admin.usergroups.listChannels({});
}

/**
 * 
 * @param msg 
 * @param blocks 
 * @param targetChannel 
 * @returns 
 */
const postMessage = async (text: string, attachments?: any, targetChannel?: string) => {
  const payload: any = {
    text, channel: targetChannel || defaultChannelId
  }

  if (attachments) { payload.attachments = attachments; }
  const response = await web.chat.postMessage(payload);
  return response;
}

/**
 * 
 * @param headerText 
 * @param items 
 * @param image 
 * @param buttons 
 */
const generateNotificationBlock = (headerText: string, items: any, image?: string, buttons?: any) => {
  const blocks = [];

  // Add header text
  const header = { type: "section", text: { type: "mrkdwn", text: headerText }}
  blocks.push(header)

  // Add main text content
  const actualText = Object.keys(items).map(key => `*${key}:*\n${items[key]}`).join('\n');
  const content: any = { type: "section", text: { type: "mrkdwn", text: actualText }};
  if (image) {
    content.accessory = { type: "image", 'image_url': image, 'alt_text': headerText }
  }
  blocks.push(content);

  // return { attachments: [{ blocks }] }
  return [{ blocks }]
}

const makeMarkdownLink = (text: string, url: string) => `<${url}|${text}>`


export default {
  init, postMessage, generateNotificationBlock, makeMarkdownLink
}