declare module "connect-timeout" {
  import type { RequestHandler } from "express";

  /** Express middleware that times out requests after the supplied duration. */
  function timeout(duration: string): RequestHandler;
  export = timeout;
}
