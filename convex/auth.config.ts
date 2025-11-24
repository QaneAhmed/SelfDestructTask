import type { AuthConfig } from "convex/server";

const authConfig: AuthConfig = {
  providers: [
    {
      domain: "https://one-perch-9.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
