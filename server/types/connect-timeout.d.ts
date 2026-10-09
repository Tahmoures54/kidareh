declare module "connect-timeout" {
  import type { RequestHandler } from "express";

  interface TimeoutOptions {
    respond?: boolean;
  }

  function timeout(time: string, options?: TimeoutOptions): RequestHandler;
  export default timeout;
}
