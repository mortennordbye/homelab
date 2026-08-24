/**
 * The homelab's physical inventory, as recorded in the repo's own README.
 * Keep this in step with the Hardware tables there; it is the same estate
 * described twice and the render is the copy that can go stale unnoticed.
 */

export type NodeState = {
  name: string;
  ready: boolean;
  role?: string;
  schedulable?: boolean;
};

export type Host = {
  host: string;
  model: string;
  cpu: string;
  ram: string;
  /** The two Talos VMs this box runs, control plane first. */
  nodes: [string, string];
};

export const HOSTS: Host[] = [
  {
    host: "hyper1",
    model: "M70q Gen 2",
    cpu: "i5-11400T · 6C/12T @ 1.30 GHz",
    ram: "32 GB",
    nodes: ["genesis-ctrl-01", "genesis-worker-01"],
  },
  {
    host: "hyper2",
    model: "M920q",
    cpu: "i5-8500T · 6C/6T @ 2.10 GHz",
    ram: "32 GB",
    nodes: ["genesis-ctrl-02", "genesis-worker-02"],
  },
  {
    host: "hyper3",
    model: "M920 Tiny",
    cpu: "i7-8700T · 6C/12T @ 2.40 GHz",
    ram: "32 GB",
    nodes: ["genesis-ctrl-03", "genesis-worker-03"],
  },
];

/** Which host runs a given node, for turning a node name back into a machine. */
export function hostOf(node: string): Host | undefined {
  return HOSTS.find((h) => h.nodes.includes(node));
}

export type Device = {
  id: string;
  label: string;
  model: string;
  role: string;
  /** Fact lines shown when the device is selected. */
  facts: [string, string][];
  /**
   * True when the live feed can actually vouch for this device. Everything
   * outside the Kubernetes cluster is drawn lit and never changes, and saying
   * so is the difference between a status object and a decoration.
   */
  live: boolean;
};

export const DEVICES: Device[] = [
  {
    id: "modem",
    label: "Modem",
    model: "Telia cable modem",
    role: "The line in. Everything below it depends on this and nothing monitors it.",
    facts: [["type", "Cable modem"], ["monitored", "No"]],
    live: false,
  },
  {
    id: "gateway",
    label: "Gateway",
    model: "UniFi Cloud Gateway",
    role: "Routing, firewalling and DHCP for the whole house, including the cluster's VLAN.",
    facts: [["type", "Gateway / router"], ["monitored", "No"]],
    live: false,
  },
  {
    id: "ha",
    label: "Home Assistant",
    model: "Topton N100 fanless mini PC",
    role: "Home automation, deliberately kept off the cluster so the house survives a Kubernetes outage.",
    facts: [
      ["cpu", "Intel N100"],
      ["storage", "512 GB SSD"],
      ["network", "4 × 2.5G i226-V"],
      ["os", "Home Assistant OS"],
    ],
    live: false,
  },
  {
    id: "nas",
    label: "NAS",
    model: "Synology DS1522+",
    role: "Every persistent volume in the cluster, over NFS. Also hosts a Proxmox Backup Server VM.",
    facts: [
      ["cpu", "AMD Ryzen R1600 · 2C @ 2.6 GHz"],
      ["ram", "8 GB"],
      ["capacity", "3 × 20 TB · 60 TB SHR, Btrfs"],
      ["cache", "2 × 1 TB NVMe"],
      ["dsm", "7.3.2"],
    ],
    live: false,
  },
  {
    id: "switch",
    label: "Switch",
    model: "UniFi Lite 8 PoE",
    role: "Every machine in the cabinet lands here. Two of the eight ports are spare.",
    facts: [["type", "Managed switch"], ["ports", "8, PoE"], ["monitored", "No"]],
    live: false,
  },
  {
    id: "hue",
    label: "Hue bridge",
    model: "Philips Hue Bridge Pro",
    role: "Lighting hub, paired to Home Assistant rather than to the cluster.",
    facts: [["type", "Smart lighting hub"], ["monitored", "No"]],
    live: false,
  },
];

/** The three compute hosts as selectable devices, built from HOSTS. */
export function hostDevice(host: Host): Device {
  return {
    id: host.host,
    label: host.host,
    model: `Lenovo ThinkCentre ${host.model}`,
    role: "Proxmox VE. Runs one Talos control-plane VM and one worker, upright in a printed stand.",
    facts: [
      ["cpu", host.cpu],
      ["ram", host.ram],
      ["storage", "1 TB"],
      ["control plane", host.nodes[0]],
      ["worker", host.nodes[1]],
    ],
    live: true,
  };
}

export const ALL_DEVICES: Device[] = [...HOSTS.map(hostDevice), ...DEVICES];

export function deviceById(id: string | null): Device | undefined {
  if (!id) return undefined;
  return ALL_DEVICES.find((d) => d.id === id);
}
