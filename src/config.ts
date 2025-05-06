export const SITE = {
  website: "https://labs.davlgd.fr/", // replace this with your deployed domain
  author: "davlgd",
  profile: "https://x.com/davlgd",
  desc: "Welcome to davlgd's tech lab, a blog where I share my thoughts, software/hardware experiments and discoveries",
  title: "davlgd tech blog",
  ogImage: "davlgd-lab.webp",
  lightAndDarkMode: true,
  postPerIndex: 8,
  postPerPage: 10,
  scheduledPostMargin: 135 * 60 * 1000, // 2h time difference + 15 minutes, ok for winter time
  showArchives: false,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Suggest Changes",
    url: "https://github.com/davlgd/labs/tree/main/src/data/blog",
  },
  dynamicOgImage: true,
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Etc/UTC", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
