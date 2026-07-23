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
  Laptop,
  Desktop: Monitor,
  Tablet,
  Smartphone,
  Smartwatch: Watch,
  TV: Tv,
  Camera: Aperture,
  Other: Box,
};

export function DeviceIcon({ type, className, size = 20 }: { type: string; className?: string; size?: number }) {
  const Icon = iconMap[type] ?? Box;
  return <Icon size={size} className={cn(className)} aria-hidden="true" />;
}
