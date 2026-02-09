type SecurityHeader = {
  key: string;
  value: string;
};

type SecurityHeaderConfig = {
  source: string;
  headers: SecurityHeader[];
};

type SecurityHeaderOptions = {
  isDev?: boolean;
};

const DEFAULT_SOURCE = "/(.*)";

const buildCsp = (isDev: boolean) => {
  const allowEval = isDev ? " 'unsafe-eval'" : "";
  const upgradeInsecureRequests = isDev ? "" : " upgrade-insecure-requests;";

  return (
    "default-src 'self';" +
    " script-src 'self' 'unsafe-inline'" +
    allowEval +
    ";" +
    " style-src 'self' 'unsafe-inline';" +
    " img-src 'self' blob: data:;" +
    " font-src 'self';" +
    " object-src 'none';" +
    " base-uri 'self';" +
    " form-action 'self';" +
    " frame-ancestors 'none';" +
    upgradeInsecureRequests
  );
};

export const getSecurityHeaders = (options: SecurityHeaderOptions = {}): SecurityHeaderConfig[] => {
  const resolvedIsDev = options.isDev ?? process.env.NODE_ENV === "development";
  const headers: SecurityHeader[] = [
    {
      key: "Content-Security-Policy",
      value: buildCsp(resolvedIsDev),
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];

  if (!resolvedIsDev) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return [
    {
      source: DEFAULT_SOURCE,
      headers,
    },
  ];
};
