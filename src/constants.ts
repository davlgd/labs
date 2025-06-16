import type { Props } from "astro";
import IconMail from "@/assets/icons/IconMail.svg";
import IconGitLab from "@/assets/icons/IconGitLab.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconBrandX from "@/assets/icons/IconBrandX.svg";
import IconBlueSky from "@/assets/icons/IconBlueSky.svg";
import IconLinkedin from "@/assets/icons/IconLinkedin.svg";
import IconWhatsapp from "@/assets/icons/IconWhatsapp.svg";
import { SITE } from "@/config";

interface Social {
  name: string;
  href: string;
  linkTitle: string;
  icon: (_props: Props) => Element;
}

export const SOCIALS: Social[] = [
  {
    name: "Github",
    href: "https://github.com/davlgd/labs",
    linkTitle: ` ${SITE.title} on Github`,
    icon: IconGitHub,
  },
  {
    name: "GitLab",
    href: "https://framagit.org/davlgd",
    linkTitle: ` ${SITE.title} on GitLab`,
    icon: IconGitLab,
  },
  {
    name: "BlueSky",
    href: "https://bsky.app/profile/davlgd.fr",
    linkTitle: `${SITE.title} on BlueSky`,
    icon: IconBlueSky,
  },
  {
    name: "X",
    href: "https://x.com/davlgd",
    linkTitle: `${SITE.title} on X`,
    icon: IconBrandX,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/davlgd/",
    linkTitle: `${SITE.title} on LinkedIn`,
    icon: IconLinkedin,
  },
] as const;

export const SHARE_LINKS: Social[] = [
  {
    name: "BlueSky",
    href: "https://bsky.app/intent/compose?text=",
    linkTitle: `Share this post on BlueSky`,
    icon: IconBlueSky,
  },
  {
    name: "X",
    href: "https://x.com/intent/post?url=",
    linkTitle: `Share this post on X`,
    icon: IconBrandX,
  },
  {
    name: "WhatsApp",
    href: "https://wa.me/?text=",
    linkTitle: `Share this post via WhatsApp`,
    icon: IconWhatsapp,
  },
  {
    name: "Mail",
    href: "mailto:?subject=See%20this%20post&body=",
    linkTitle: `Share this post via email`,
    icon: IconMail,
  },
] as const;
