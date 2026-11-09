import {
  Aperture,
  Box,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Watch,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  laptop: Laptop,
  desktop: Monitor,
  monitor: Monitor,
  tablet: Tablet,
  smartphone: Smartphone,
  phone: Smartphone,
  smartwatch: Watch,
  tv: Tv,
  camera: Aperture,
};

export function DeviceIcon({ type, className, size = 20 }: { type: string; className?: string; size?: number }) {
  const Icon = iconMap[type.trim().toLowerCase()] ?? Box;
  return <Icon size={size} className={cn(className)} aria-hidden="true" />;
}
