import { embedRedirect } from "../utils/shopify-embed-nav.server.js";

export const loader = async ({ request }) => {
  return embedRedirect("/app/overview", request);
};

export default function AppIndexRedirect() {
  return null;
}