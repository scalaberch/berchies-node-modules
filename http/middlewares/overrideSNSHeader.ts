import { EBGRequest, EBGResponse, EBGNext } from "../interfaces";
export default function (req: EBGRequest, res: EBGResponse, next: EBGNext) {
  if (req.headers["x-amz-sns-message-type"]) {
    req.headers["content-type"] = "application/json;charset=UTF-8";
  }

  //if path is telegram/score decode body
  if (req.path === "/telegram/score" || req.path === "/telegram/score/") {
    //change content type
    req.headers["content-type"] =
      "multipart/form-data; boundary=<calculated when request is sent>";
  }

  next();
}
