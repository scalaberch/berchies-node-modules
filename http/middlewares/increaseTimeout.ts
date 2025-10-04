import { EBGRequest, EBGResponse, EBGNext } from "../interfaces";

const defaultTimeout = 120000; // Default timeout is 2 minutes.

/**
 * 
 * @param timeInMs max timeout in milliseconds
 */
export default (timeInMs: number) => {
  const delay = timeInMs || defaultTimeout;
  return function (req: EBGRequest, res: EBGResponse, next: EBGNext) {
    req.setTimeout(delay);
    next();
  }
}
