import serverless from "serverless-http";
import app from "./http/app.js";

let wrapped: any;
export const handler = async (event: any, context: any) => {
  if (!wrapped) wrapped = serverless(app);
  return wrapped(event, context);
};
