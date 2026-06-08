import { type PlatformProxy } from "wrangler";
import { RouterContextProvider } from "react-router";

type Cloudflare = Omit<PlatformProxy<Env>, "dispose">;

declare module "react-router" {
  interface RouterContextProvider {
    cloudflare: Cloudflare;
  }
}

export function getLoadContext({
  context,
}: {
  request: Request;
  context: { cloudflare: Cloudflare };
}) {
  const provider = new RouterContextProvider();
  Object.assign(provider, context);
  return provider;
}