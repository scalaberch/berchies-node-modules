import fs from "fs";
import axios from 'axios'
export { default as S3Files } from "./s3";

const isFileExtension = (
  path: string,
  extension: string | Array<string>,
  checkActualFileStats?: boolean
) => {
  if (path.length === 0) {
    return false;
  }
  const dotIndex = path.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === 0) {
    return false;
  }
  const fetchedExtension = path.slice(dotIndex + 1).toLowerCase();
  if (typeof extension === "string") {
    return extension.toLowerCase() === fetchedExtension;
  }
  const filtered = extension
    .map((ext) => ext.toLowerCase())
    .filter((ext) => ext === fetchedExtension);
  return filtered.length > 0;
};

const readCSVFile = (path: string, fileOptions?: any) => {
  const content = fs.readFileSync(path, { encoding: "utf-8", ...fileOptions });
  const items   = content.toString().split("\n").map(item => item.split(","));
  return items;
};

const downloadFile = async (remotePath: string, downloadPath: string) => {
  if (fs.existsSync(downloadPath)) {
    fs.unlinkSync(downloadPath);
  }

  const response = await axios({
    url: remotePath,
    method: 'GET',
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(downloadPath);
  response.data.pipe(writer);

  return new Promise((resolve: any, reject: any) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

export default {
  isFileExtension,
  readCSVFile,
  downloadFile
};
