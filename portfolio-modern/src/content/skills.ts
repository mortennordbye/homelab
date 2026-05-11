import { skillSchema, type Skill } from "./schemas";

// Values match the old portfolio's published skill bars.
const raw: Skill[] = [
  { label: "Linux", level: 90, group: "platform" },
  { label: "Kubernetes", level: 80, group: "platform" },
  { label: "Containerization", level: 80, group: "platform" },
  { label: "Network administration", level: 80, group: "platform" },
  { label: "Azure", level: 85, group: "platform" },
  { label: "AWS", level: 35, group: "platform" },
  { label: "CI/CD", level: 80, group: "delivery" },
  { label: "Terraform", level: 80, group: "delivery" },
  { label: "Ansible", level: 85, group: "delivery" },
  { label: "Windows Server", level: 70, group: "ops" },
  { label: "Database management", level: 70, group: "ops" },
  { label: "Team leadership", level: 60, group: "soft" },
];

export const skills: Skill[] = raw.map((s) => skillSchema.parse(s));
