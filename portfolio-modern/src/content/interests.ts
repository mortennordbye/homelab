export type Interest = { title: string; icon: "fitness" | "homelab"; body: string };

export const interests: Interest[] = [
  {
    title: "Fitness",
    icon: "fitness",
    body: "I train five times a week. Running, lifting and climbing, mostly. It keeps me sharp at work and makes the long days easier to handle. A lot of good conversations happen in the gym too.",
  },
  {
    title: "Homelabbing",
    icon: "homelab",
    body: "The homelab is where I try things out before they reach customers. New tools, new architectures, things I am not sure I understand yet. It is also where I keep services I rely on day to day. The community around it is generous with advice, which is half the fun.",
  },
];
