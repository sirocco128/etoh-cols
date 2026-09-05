export default ({ env }) => {
  const minio = String(env("MINIO_ENDPOINT", "http://127.0.0.1:9000")).replace(
    /\/+$/,
    "",
  );

  return [
    "strapi::logger",
    "strapi::errors",
    {
      name: "strapi::security",
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            "connect-src": ["'self'", "https:", "http:"],
            "img-src": [
              "'self'",
              "data:",
              "blob:",
              "market-assets.strapi.io",
              minio,
              "http://127.0.0.1:9000",
              "http://localhost:9000",
            ],
            "media-src": [
              "'self'",
              "data:",
              "blob:",
              "market-assets.strapi.io",
              minio,
              "http://127.0.0.1:9000",
              "http://localhost:9000",
            ],
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    "strapi::cors",
    "strapi::poweredBy",
    "strapi::query",
    "strapi::body",
    "strapi::session",
    "strapi::favicon",
    "strapi::public",
  ];
};
