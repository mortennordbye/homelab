import {
  Atom,
  Award,
  BookOpen,
  Box,
  Briefcase,
  BadgeCheck,
  Calendar,
  CircleDot,
  Eye,
  HardDrive,
  MemoryStick,
  Mountain,
  Speaker,
  Tag,
  CirclePlay,
  CodeXml,
  Container,
  Database,
  GitMerge,
  Network,
  Terminal,
  Users,
  Cpu,
  FileCode,
  Gauge,
  Globe2,
  Hammer,
  KeyRound,
  Layers3,
  Link,
  MapPin,
  Mail,
  Monitor,
  Music,
  Phone,
  Server,
  Shapes,
  ShieldCheck,
  Sparkles,
  Triangle,
  User,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { brandOf, type Brand } from "@/components/work/brand-icons";

/**
 * Icons for the room's info cards. Brands come from the site's own registry,
 * so a card and a work page agree on what Azure looks like; the web stack the
 * room itself is built from is added here rather than there, because adding it
 * to the registry would change which brand the work covers pick first.
 */
const EXTRA: [RegExp, Brand][] = [
  [/three|drei/i, { Icon: Box, color: "#1b1b1b", label: "three.js" }],
  [/next\.?js/i, { Icon: Triangle, color: "#1b1b1b", label: "Next.js" }],
  [/react/i, { Icon: Atom, color: "#149eca", label: "React" }],
  [/typescript/i, { Icon: FileCode, color: "#3178c6", label: "TypeScript" }],
  [/tailwind/i, { Icon: Wind, color: "#0891b2", label: "Tailwind" }],
  [/github actions/i, { Icon: CirclePlay, color: "#2088ff", label: "GitHub Actions" }],
  [/docker|container/i, { Icon: Container, color: "#2496ed", label: "Docker" }],
  [/microsoft|entra|m365|\bacr\b|landing zone|waf/i, { Icon: ShieldCheck, color: "#0078d4", label: "Microsoft" }],
  [/dns/i, { Icon: Globe2, color: "#0078d4", label: "DNS" }],
  [/linux/i, { Icon: Terminal, color: "#3a3832", label: "Linux" }],
  [/network/i, { Icon: Network, color: "#2f7d6d", label: "Networking" }],
  [/ci\/cd|pipeline/i, { Icon: GitMerge, color: "#5d6c8a", label: "CI/CD" }],
  [/database|sql/i, { Icon: Database, color: "#336791", label: "Databases" }],
  [/leadership|team/i, { Icon: Users, color: "#7f5a2f", label: "Leadership" }],
];

export function techIcon(label: string): Brand | null {
  return brandOf(label) ?? EXTRA.find(([re]) => re.test(label))?.[1] ?? null;
}

const KICKERS: [RegExp, LucideIcon][] = [
  [/how this room/i, Hammer],
  [/certification/i, Award],
  [/skills/i, Gauge],
  [/hardware/i, Cpu],
  [/professional|personal|career/i, Briefcase],
  [/blog/i, BookOpen],
  [/contact|social/i, User],
  [/now playing/i, Music],
  [/services/i, Sparkles],
  [/outside work/i, Mountain],
];

/** Every card gets one; an unmatched kicker falls back to a plain tag. */
export function kickerIcon(kicker: string): LucideIcon {
  return KICKERS.find(([re]) => re.test(kicker))?.[1] ?? Tag;
}

const ROWS: [RegExp, LucideIcon][] = [
  [/^\d{4}|\d{4}$/, Calendar],
  [/^cpu$/i, Cpu],
  [/^ram$|memory/i, MemoryStick],
  [/storage|capacity|cache|dsm/i, HardDrive],
  [/^os$/i, Monitor],
  [/ports|network/i, Network],
  [/control|worker/i, Server],
  [/monitored/i, Eye],
  [/^type$/i, Tag],
  [/proof/i, BadgeCheck],
  [/speaker/i, Speaker],
  [/framework/i, CodeXml],
  [/^3d$/i, Box],
  [/helpers/i, Wrench],
  [/models/i, Shapes],
  [/screens/i, Monitor],
  [/hosting|host|node|server/i, Server],
  [/issued|date|year|period|since/i, Calendar],
  [/credential|key|id$/i, KeyRound],
  [/email/i, Mail],
  [/phone/i, Phone],
  [/site|source|link|url/i, Link],
  [/stack|layer/i, Layers3],
  [/location/i, MapPin],
];

/** Every row gets one; an unmatched key falls back to a small dot. */
export function rowIcon(key: string): LucideIcon {
  return ROWS.find(([re]) => re.test(key))?.[1] ?? CircleDot;
}
