import type { Site, SocialObjects } from "./types";
export const SITE: Site = {
  website: "https://labs.davlgd.fr", // replace this with your deployed domain
  author: "davlgd",
  authorURL: "https://x.com/davlgd",
  desc: "Welcome to davlgd's tech lab, a blog where I share my thoughts, software/hardware experiments and discoveries",
  title: "davlgd tech blog",
  ogImage: "davlgd-lab.webp",
  lightAndDarkMode: true,
  postPerIndex: 8,
  postPerPage: 10,
  scheduledPostMargin: 135 * 60 * 1000, // 2h time difference + 15 minutes, ok for winter time
};

export const LOCALE = {
  lang: "en", // html lang code. Set this empty and default will be "en"
  langTag: ["fr"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "X",
    href: "https://x.com/davlgd",
    linkTitle: `${SITE.author} on X`,
    active: true,
  },
  {
    name: "Twitter",
    href: "https://x.com/davlgd",
    linkTitle: `${SITE.author} on X`,
    active: false,
  },
  {
    name: "Github",
    href: "https://github.com/davlgd",
    linkTitle: ` ${SITE.author} on Github`,
    active: true,
  },
  {
    name: "GitLab",
    href: "https://framagit.org/davlgd",
    linkTitle: `${SITE.author} on GitLab`,
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/in/davlgd",
    linkTitle: `${SITE.author} on LinkedIn`,
    active: true,
  },
  {
    name: "Mail",
    href: "mailto:yourmail@gmail.com",
    linkTitle: `Send an email to ${SITE.author}`,
    active: false,
  },
  {
    name: "Facebook",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Facebook`,
    active: false,
  },
  {
    name: "Instagram",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Instagram`,
    active: false,
  },
  {
    name: "Twitch",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Twitch`,
    active: false,
  },
  {
    name: "YouTube",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on YouTube`,
    active: false,
  },
  {
    name: "WhatsApp",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on WhatsApp`,
    active: false,
  },
  {
    name: "Snapchat",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Snapchat`,
    active: false,
  },
  {
    name: "Pinterest",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Pinterest`,
    active: false,
  },
  {
    name: "TikTok",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on TikTok`,
    active: false,
  },
  {
    name: "CodePen",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on CodePen`,
    active: false,
  },
  {
    name: "Discord",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Discord`,
    active: false,
  },
  {
    name: "Reddit",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Reddit`,
    active: false,
  },
  {
    name: "Skype",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Skype`,
    active: false,
  },
  {
    name: "Steam",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Steam`,
    active: false,
  },
  {
    name: "Telegram",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Telegram`,
    active: false,
  },
  {
    name: "Mastodon",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.author} on Mastodon`,
    active: false,
  },
];
