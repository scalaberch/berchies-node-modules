import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import fs from "fs";
import { getEnvVariable } from "@modules/env";
import { EBGRequest, EBGResponse } from "@modules/http/interfaces";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fetch from "node-fetch";

export const publicUrls = {};
export const BucketName: string = getEnvVariable("AWS_S3_BUCKET_NAME", false, "");

/**
 * s3 client
 */
export const client: any = new S3Client({ region: process.env.AWS_DEFAULT_REGION });

/**
 *
 * @param sourceBucket
 * @param sourcePath
 * @param destinationBucket
 * @param destinationPath
 */
const copyFromBucketToAnotherBucket = async (
  sourceBucket: string,
  sourcePath: string,
  destinationBucket: string,
  destinationPath?: string
) => {
  // Fetch source path
  const sourceTrailSlash = sourceBucket[sourceBucket.length - 1] === "/" ? "" : "/";
  const CopySource = `${sourceBucket}${sourceTrailSlash}${sourcePath}`;

  // Fetch destination Path
  const Key = destinationPath === undefined ? sourcePath : destinationPath;

  // parse input
  const input = {
    CopySource,
    Bucket: destinationBucket,
    Key,
    // CacheControl: ''
  };

  // send command to aws
  const command = new CopyObjectCommand(input);
  const response = await client.send(command);
  return response;
};

/**
 *
 * @param Bucket
 * @param Key
 * @param Body
 */
const uploadToS3 = async (Bucket: string, Key: string, Body: any, params = {}) => {
  if (Bucket.length === 0) {
    Bucket = BucketName;
  }

  const input = {
    Bucket,
    Key,
    Body,
    ...params,
  };

  // send command to aws
  const command = new PutObjectCommand(input);
  const response = await client.send(command);
  return response;
};

/**
 *
 * @param Bucket
 * @param Path
 * @param TopLevelFolder
 * @returns
 */
const checkIfPathExists = async (Bucket: string, Key: string) => {
  try {
    await client.send(new HeadObjectCommand({ Bucket, Key }));
    return true;
  } catch (err) {
    return false;
  }
};

/**
 *
 * @param Bucket
 * @param Key
 * @returns
 */
const getFileFromBucket = async (Bucket: string, Key: string) => {
  try {
    const s3File = await client.send(new GetObjectCommand({ Bucket, Key }));
    const str = await s3File.Body.transformToString();
    return str;
  } catch (err) {
    console.log("error from getFileFromBucket: ", err);
    return null;
  }
};

/**
 *
 * @param Bucket
 * @param Key
 * @param targetDownloadPath
 * @returns
 */
const downloadFileFromBucket = async (
  Bucket: string,
  Key: string,
  targetDownloadPath: string
) => {
  try {
    const s3File = await client.send(new GetObjectCommand({ Bucket, Key }));
    await fs.promises.writeFile(targetDownloadPath, s3File.Body);
    return true;
  } catch (err) {
    console.log("error from getFileFromBucket: ", err);
    return null;
  }
};

/**
 *
 * @param Bucket
 * @param Key
 */
const getChildFilesFromPath = async (
  Bucket: string,
  Prefix: string,
  NextToken?: string,
  CollectedChildFiles?: Array<string>
) => {
  try {
    const data = await client.send(
      new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken: NextToken })
    );
    const { Contents, NextContinuationToken } = data;
    const items =
      Contents && Contents.length > 0 ? Contents.map((content) => content.Key) : [];

    // Then probably filter out the "/" one.
    const cleaned = items.filter((item) => item.split("/").at(-1).length > 0);

    if (NextContinuationToken) {
      const merged =
        typeof CollectedChildFiles === "undefined"
          ? cleaned
          : CollectedChildFiles.concat(cleaned);
      return await getChildFilesFromPath(Bucket, Prefix, NextContinuationToken, merged);
    }

    return typeof CollectedChildFiles === "undefined"
      ? cleaned
      : CollectedChildFiles.concat(cleaned);
  } catch (error) {
    console.error(error);
    return [];
  }
};

/**
 * delete batch from bucket
 *
 * @param Bucket
 * @param files
 */
const batchDelete = async (Bucket: string, files: Array<string>) => {
  if (files.length === 0) {
    return false;
  }

  for (const file of files) {
    // Check if file exists.
    const doesItExists = await checkIfPathExists(Bucket, file);

    // If it is, delete it!
    if (doesItExists) {
      const deleteParams = {
        Bucket,
        Key: file,
      };

      await client.send(new DeleteObjectCommand(deleteParams));
    }
  }
};

/**
 *
 * @param Key
 * @param Bucket
 * @param signedUrlLifeSecs
 * @returns
 */
const getFileSignedUrl = async (
  Key: string,
  Bucket = BucketName,
  signedUrlLifeSecs = 60
) => {
  try {
    const command = new GetObjectCommand({
      Bucket,
      Key,
    });

    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: signedUrlLifeSecs,
    }); // 60 seconds
    return signedUrl;
  } catch (error) {
    console.error(error);
    return "";
  }
};

export const hostFileFromS3 = async (
  Response: EBGResponse,
  Key: string,
  forceDownload = false,
  SourceBucket = BucketName
) => {
  try {
    const signedUrl = await getFileSignedUrl(Key, SourceBucket);
    const response = await fetch(signedUrl);
    if (!response.ok) {
      return Response.status(response.status).send("File not found or expired.");
    }

    Response.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/octet-stream"
    );
    Response.setHeader("Content-Length", response.headers.get("content-length") || "");

    if (forceDownload) {
      Response.setHeader("Content-Disposition", `attachment; filename="${Key}"`);
    }

    response.body.pipe(Response);
  } catch (error) {
    console.error(error);
    Response.status(500).json({ message: "Error fetching file" });
  }
};

export default {
  copyFromBucketToAnotherBucket,
  uploadToS3,
  checkIfPathExists,
  getFileFromBucket,
  getChildFilesFromPath,
  downloadFileFromBucket,
  batchDelete,
  hostFileFromS3
};
