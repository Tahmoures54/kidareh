import type { RequestHandler } from "express";

declare module "connect-timeout" {
  /** Express middleware that times out requests after the supplied duration. */
  function timeout(duration: string): RequestHandler;
  export default timeout;
}
