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
  showWordmark?: boolean;
  className?: string;
}) {
  const img = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo.png"
        alt="Nonlinear"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showWordmark && (
        <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
          Nonlinear
        </span>
      )}
    </span>
  );

  if (href != null && href !== "") {
    return (
      <Link href={href} className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
        {img}
      </Link>
    );
  }

  return img;
}
