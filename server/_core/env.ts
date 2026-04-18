export const ENV = {
  appId: process.env.APP_ID ?? process.env.VITE_APP_ID ?? "pulse-growth-engine",
  cookieSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  doubaoApiKey: process.env.DOUBAO_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
};
