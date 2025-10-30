import { Request, Response } from "express";
import { EBGNext, EBGRequest, EBGResponse } from "@modules/http/interfaces";
import multer from "multer";
import S3Files, { BucketName } from "./s3";
import { generateRandomString, generateUUID } from "@modules/strings";
import path from "path";

export const MaxUploadLimitMB = 25;

const parseFiles = (req: Request) => {
  const { files } = req;
  return files;
};

export const uploadToS3 = async (
  file: Express.Multer.File,
  destinationFolder = "",
  targetBucket = ""
) => {
  if (targetBucket.length === 0) {
    targetBucket = BucketName;
  }

  const ext = path.extname(file.originalname);
  const newFileName = `${generateRandomString(24)}${ext}`;
  const folder = destinationFolder.endsWith("/")
    ? destinationFolder.slice(0, -1)
    : destinationFolder;

  const key = `${folder}/${newFileName}`;
  await S3Files.uploadToS3(targetBucket, key, file.buffer, { ContentType: file.mimetype });

  // compile the endpoint:
  const s3Path = `https://${BucketName}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;
  return { s3Path, path: key };
};

export const singleFileUploadMiddleware = (
  fileKey: string = "file",
  allowedTypes: string[]
) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MaxUploadLimitMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        const err = new Error(`Only ${allowedTypes.join(", ")} files are allowed`);
        (err as any).code = "INVALID_TYPE";
        return cb(err);
      }
      cb(null, true);
    },
  });

  return (req: EBGRequest, res: EBGResponse, next: EBGNext) => {
    upload.single(fileKey)(req, res, (err) => {
      if (err) {
        let msg = err.message + ".";
        if (err.code === "LIMIT_FILE_SIZE") {
          msg += ` Maximum file size is ${MaxUploadLimitMB} MB.`;
        }
        return res.outputError(msg, { errorCode: err.code }, 400);
      }
      next();
    });
  };
};

const getFiles = (req: EBGRequest) => {
  const files = req.files || [];
  if (files.length === 0) {
    // return res.outputError('No files specified.');
  }
};

export default {
  parseFiles,
};
