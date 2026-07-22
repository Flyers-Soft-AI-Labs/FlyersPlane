import { useState } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  src: string;
  alt: string;
  Icon: LucideIcon;
};

/**
 * Renders a real screenshot when present under apps/web/public/onboarding/.
 * Falls back to a branded placeholder so the tour never looks broken while
 * screenshots are still being captured/dropped in.
 */
export function TourScreenshot({ src, alt, Icon }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flyers-tour-screenshot-fallback flex h-full w-full items-center justify-center">
        <Icon className="h-12 w-12 text-[#8b5cf6] opacity-70" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover object-top"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
