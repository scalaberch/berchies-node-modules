import { Request, Response } from "express"

const parseFiles = (req: Request) => {
  const { files } = req;
  return files;
}

export default {
  parseFiles
}