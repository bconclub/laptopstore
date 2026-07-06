import {
  Laptop,
  Monitor,
  Printer,
  Wrench,
  RefreshCw,
  Gamepad2,
  Headphones,
  BatteryCharging,
  Keyboard,
  Plug,
  Cpu,
  Fan,
  HardDrive,
  BadgeCheck,
  Server,
  Computer,
  ShieldCheck,
  Briefcase,
  Sparkles,
  Tablet,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  laptop: Laptop,
  monitor: Monitor,
  printer: Printer,
  wrench: Wrench,
  "refresh-cw": RefreshCw,
  "gamepad-2": Gamepad2,
  headphones: Headphones,
  "battery-charging": BatteryCharging,
  keyboard: Keyboard,
  plug: Plug,
  cpu: Cpu,
  fan: Fan,
  "hard-drive": HardDrive,
  "badge-check": BadgeCheck,
  server: Server,
  computer: Computer,
  "shield-check": ShieldCheck,
  briefcase: Briefcase,
  sparkles: Sparkles,
  tablet: Tablet,
};

export default function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = icons[name] ?? Laptop;
  return <Icon className={className} aria-hidden="true" />;
}
