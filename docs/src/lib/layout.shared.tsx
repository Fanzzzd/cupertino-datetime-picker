import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const GITHUB_URL = "https://github.com/Fanzzzd/cupertino-datetime-picker";
export const NPM_URL = "https://www.npmjs.com/package/cupertino-datetime-picker";
export const SITE_URL = "https://cupertino-datetime-picker-docs.vercel.app";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="font-mono font-semibold tracking-tight">cupertino-datetime-picker</span>
      ),
    },
    githubUrl: GITHUB_URL,
    links: [
      {
        text: "Docs",
        url: "/docs",
        active: "nested-url",
      },
      {
        text: "npm",
        url: NPM_URL,
        external: true,
      },
    ],
  };
}
