import Image from "next/image";
import Link from "next/link";

export function BrandLogo({
  href = "/",
  size = 36,
  showWordmark = false,
  className = "",
}: {
  /** Omit or pass `null` for a non-clickable logo. */
  href?: string | null;
  size?: number;
  /**
   * Kept for call-site compatibility. The current mark already includes the
   * wordmark, so no extra text is rendered beside the image.
   */
  showWordmark?: boolean;
  className?: string;
}) {
  // Full lockup reads better a bit larger when wordmark was previously separate text.
  const displaySize = showWordmark ? Math.max(size, 48) : size;

  const img = (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Nonlinear Minds"
        width={displaySize}
        height={displaySize}
        className="rounded-md object-contain"
        priority
      />
    </span>
  );

  if (href != null && href !== "") {
    return (
      <Link
        href={href}
        className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {img}
      </Link>
    );
  }

  return img;
}
