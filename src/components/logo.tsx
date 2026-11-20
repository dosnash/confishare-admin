import Image from "next/image";

export default function Logo({ compact = false }: { compact?: boolean }) {
  return <span className="brand">
    <Image
      className="brand-logo"
      src={compact ? "/icon.png" : "/logo-light.svg"}
      alt="ConfiShare"
      width={compact ? 32 : 177}
      height={compact ? 32 : 20}
      priority
    />
  </span>;
}
