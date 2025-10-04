import axios from "axios";
import { writeFileSync } from "fs";

export const defaultKeyName = "ebg-main";

const downloadJWK = async (keyName: string = "", remotePath: string) => {
  const key = keyName === "" ? defaultKeyName : keyName;

  try {
    const response = await axios.get(remotePath);
    const data = response.data; // response.data.keys
    writeFileSync(`./resources/databags/${keyName}.jwk`, JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
};

const getJWK = async (keyName: string) => {};
