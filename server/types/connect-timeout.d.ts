declare module "connect-timeout" {
  import type { RequestHandler } from "express";

  interface TimeoutOptions {
    respond?: boolean;
    [key: string]: unknown;
  }

  function timeout(time: string, options?: TimeoutOptions): RequestHandler;
  export default timeout;
}
