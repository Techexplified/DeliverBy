// app/routes/app.api.check-embed.jsx
import { data } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    let isEmbedded = false;

    try {
        const themeResponse = await admin.graphql(`
            query getActiveThemeSettings {
                themes(first: 5, roles: [MAIN]) {
                    nodes {
                        files(filenames: ["templates/product.json"]) {
                            nodes {
                                body {
                                    ... on OnlineStoreThemeFileBodyText {
                                        content
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `);

        const themeData = await themeResponse.json();
        const mainTheme = themeData?.data?.themes?.nodes?.[0];
        const rawContent = mainTheme?.files?.nodes?.[0]?.body?.content ?? "";

        if (rawContent) {
            // Convert to lowercase to ignore your ALL CAPS name change
            const contentLower = rawContent.toLowerCase();
            
            // Checks for the app handle OR your specific extension UUID
            isEmbedded = contentLower.includes("deliverby") || contentLower.includes("582a2a74-1a3a-064a-a89b-fa8b625092b29906cdbc");
        }
    } catch (e) {
        console.error("[DeliverBy Embed Check] Verification failed:", e);
    }

    return data({ isEmbedded });
};