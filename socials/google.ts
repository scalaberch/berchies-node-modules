import axios from "axios"

const { env }         = process;
const clientId        = env.GOOGLE_OAUTH_CLIENT_ID || '';
const clientSecret    = env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const baseRedirectUri = env.GOOGLE_OAUTH_REDIRECT_URL || '';

/**
 * 
 * @returns 
 */
const getOauthRedirectUrl = () => {
  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${baseRedirectUri}&response_type=code&scope=profile%20email`;
  return redirectUrl
}

/**
 * 
 * @param code 
 */
const fetchUserProfileViaCode = async (code: any) => {
  try {
    // Exchange authorization code for access token
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: baseRedirectUri,
      grant_type: 'authorization_code',
    });

    const { access_token, id_token } = data;
    // Use access_token or id_token to fetch user profile
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    // Fetch profile data.
    return Promise.resolve(profile);
  } catch (error) {
    // console.log(error); // @todo: add to logger
    return Promise.reject(error.response.data);
  }
}


export default {
  getOauthRedirectUrl,
  fetchUserProfileViaCode
}