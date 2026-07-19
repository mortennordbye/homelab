/**
 * The actual homelab inventory, transcribed from the hardware tables in the
 * repository README (Proxmox nodes, NAS, network, Home Assistant, smart home).
 *
 * The README is the source of truth. If a device is replaced there, change it
 * here too — the room should never claim hardware the README does not.
 *
 * One device in the room has no README row: the UniFi Flex Mini. It is modelled
 * because it exists on the shelf in the reference photos, and it carries no
 * spec line rather than an invented one. Everything else quotes the README.
 */

export type Spec = { k: string; v: string };

export type Hardware = {
  /** Product name, shown as the look-at label. */
  name: string;
  /** One-line summary under the name. */
  role: string;
  specs: Spec[];
  /** Set when the README has no row for this device. */
  unlisted?: boolean;
};

export const HARDWARE = {
  hyper1: {
    name: "Lenovo ThinkCentre M70q Gen 2",
    role: "Proxmox node · hyper1",
    specs: [
      { k: "CPU", v: "Intel Core i5-11400T · 6C/12T @ 1.30 GHz" },
      { k: "Memory", v: "32 GB" },
      { k: "Storage", v: "1 TB" },
      { k: "Role", v: "Talos control plane / worker VMs" },
    ],
  },
  hyper2: {
    name: "Lenovo ThinkCentre M920q",
    role: "Proxmox node · hyper2",
    specs: [
      { k: "CPU", v: "Intel Core i5-8500T · 6C/6T @ 2.10 GHz" },
      { k: "Memory", v: "32 GB" },
      { k: "Storage", v: "1 TB" },
      { k: "Role", v: "Talos control plane / worker VMs" },
    ],
  },
  hyper3: {
    name: "Lenovo ThinkCentre M920 Tiny",
    role: "Proxmox node · hyper3",
    specs: [
      { k: "CPU", v: "Intel Core i7-8700T · 6C/12T @ 2.40 GHz" },
      { k: "Memory", v: "32 GB" },
      { k: "Storage", v: "1 TB" },
      { k: "Role", v: "Talos control plane / worker VMs" },
    ],
  },
  nas: {
    name: "Synology DS1522+",
    role: "NAS · shared storage and backup",
    specs: [
      { k: "CPU", v: "AMD Ryzen R1600 · 2C @ 2.6 GHz" },
      { k: "Memory", v: "8 GB" },
      { k: "Capacity", v: "3 × 20 TB (60 TB) · SHR, Btrfs" },
      { k: "Cache", v: "2 × 1 TB NVMe" },
      { k: "Software", v: "DSM 7.3.2 · hosts a Proxmox Backup Server VM" },
    ],
  },
  gateway: {
    name: "UniFi Cloud Gateway",
    role: "Gateway / router",
    specs: [{ k: "Type", v: "Gateway/Router" }],
  },
  switch8: {
    name: "UniFi Lite 8 PoE",
    role: "Managed switch",
    specs: [{ k: "Type", v: "Managed Switch" }],
  },
  flexMini: {
    name: "UniFi Flex Mini",
    role: "Desktop switch",
    specs: [],
    unlisted: true,
  },
  accessPoint: {
    name: "UniFi U6+",
    role: "WiFi 6 access point",
    specs: [{ k: "Type", v: "WiFi 6 AP" }],
  },
  modem: {
    name: "Telia cable modem",
    role: "ISP modem",
    specs: [{ k: "Type", v: "Cable Modem" }],
  },
  homeAssistant: {
    name: "Topton N100 Fanless Mini PC",
    role: "Home Assistant host",
    specs: [
      { k: "CPU", v: "Intel N100" },
      { k: "Storage", v: "512 GB SSD" },
      { k: "OS", v: "Home Assistant OS" },
      { k: "Network", v: "4 × 2.5G i226-V" },
    ],
  },
  hueBridge: {
    name: "Philips Hue Bridge Pro",
    role: "Smart lighting hub",
    specs: [{ k: "Purpose", v: "Lighting control" }],
  },
} as const satisfies Record<string, Hardware>;

export type HardwareKey = keyof typeof HARDWARE;
