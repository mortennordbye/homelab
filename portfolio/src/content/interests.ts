export type Interest = {
  title: string;
  icon: "fitness" | "homelab";
  body: string;
  /** Named separately from the body so they can be set as chips rather than
   *  read as a list inside a sentence. Only fitness has them. */
  activities?: string[];
};

export const interests: Interest[] = [
  {
    title: "Fitness",
    icon: "fitness",
    body: "I like to stay fit. It keeps me sharp at work and makes the long days easier to handle, and a lot of good conversations happen in the gym.",
    activities: ["Swimming", "Running", "Cycling", "Weight lifting"],
  },
  {
    title: "Homelabbing",
    icon: "homelab",
    body: "The homelab is where I try things out before they reach customers. New tools, new architectures, things I am not sure I understand yet. It is also where I keep services I rely on day to day.",
  },
];
