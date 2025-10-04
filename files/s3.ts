import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";

import { pipeline } from 'stream';
import { promisify } from 'util'
import fs from 'fs'

export const publicUrls = {
  'ebg-phase2-assets': 'https://asset.eyeballpool.com/',
  'ebg-www-store': 'https://lounge-cdn.eyeballpool.com/'
}

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
const copyFromBucketToAnotherBucket = async (sourceBucket: string, sourcePath: string, destinationBucket: string, destinationPath?: string) => {
  // Fetch source path
  const sourceTrailSlash = sourceBucket[sourceBucket.length - 1] === '/' ? '' : '/';
  const CopySource = `${sourceBucket}${sourceTrailSlash}${sourcePath}`;

  // Fetch destination Path
  const Key = (destinationPath === undefined) ? sourcePath : destinationPath

  // parse input
  const input = {
    CopySource,
    Bucket: destinationBucket,
    Key,
    // CacheControl: ''
  }

  // send command to aws
  const command = new CopyObjectCommand(input);
  const response = await client.send(command);
  return response;
}

/**
 * 
 * @param Bucket 
 * @param Key 
 * @param Body 
 */
const uploadToS3 = async (Bucket: string, Key: string, Body: any, params = {}) => {
  const input = {
    Bucket,
    Key,
    Body,
    ...params
  }

  // send command to aws
  const command = new PutObjectCommand(input);
  const response = await client.send(command);
  return response;
}

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
}

/**
 * 
 * @param Bucket 
 * @param Key 
 * @returns 
 */
const getFileFromBucket = async (Bucket: string, Key: string) => {
  try {
    const s3File = await client.send(new GetObjectCommand({ Bucket, Key }));
    const str = await s3File.Body.transformToString()
    return str;
  } catch (err) {
    console.log('error from getFileFromBucket: ', err)
    return null;
  }
}

/**
 * 
 * @param Bucket 
 * @param Key 
 * @param targetDownloadPath 
 * @returns 
 */
const downloadFileFromBucket = async (Bucket: string, Key: string, targetDownloadPath: string) => {
  try {
    const s3File = await client.send(new GetObjectCommand({ Bucket, Key }));
    await fs.promises.writeFile(targetDownloadPath, s3File.Body);
    return true;
  } catch (err) {
    console.log('error from getFileFromBucket: ', err)
    return null;
  }
}

/**
 * 
 * @param Bucket 
 * @param Key 
 */
const getChildFilesFromPath = async (Bucket: string, Prefix: string, NextToken?: string, CollectedChildFiles?: Array<string>) => {
  try {
    const data = await client.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken: NextToken }));
    const { Contents, NextContinuationToken } = data;
    const items = (Contents && Contents.length > 0) ? Contents.map(content => content.Key) : [];

    // Then probably filter out the "/" one.
    const cleaned = items.filter(item => item.split("/").at(-1).length > 0)

    if (NextContinuationToken) {
      const merged = (typeof CollectedChildFiles === 'undefined') ? cleaned : CollectedChildFiles.concat(cleaned);
      return await getChildFilesFromPath(Bucket, Prefix, NextContinuationToken, merged)
    }

    return (typeof CollectedChildFiles === 'undefined') ? cleaned : CollectedChildFiles.concat(cleaned);
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
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
    const doesItExists = await checkIfPathExists(Bucket, file)

    // If it is, delete it!
    if (doesItExists) {
      const deleteParams = {
        Bucket,
        Key: file,
      };

      await client.send(new DeleteObjectCommand(deleteParams));
    }

  }

}


export default {
  copyFromBucketToAnotherBucket,
  uploadToS3,
  checkIfPathExists,
  getFileFromBucket,
  getChildFilesFromPath,
  downloadFileFromBucket,
  batchDelete
}