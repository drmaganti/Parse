import type { CSSProperties } from "react";

type ParseBrandProps = {
  href?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export default function ParseBrand({ href = "/", size = 26, className, style }: ParseBrandProps) {
  return <a href={href} className={["parse-brand", className].filter(Boolean).join(" ")} style={style} aria-label="Parse home">
    <svg className="parse-brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <rect x="8" y="16" width="3.6" height="8" rx="1.5" fill="#fff" />
      <rect x="14.2" y="10" width="3.6" height="14" rx="1.5" fill="#fff" />
      <rect x="20.4" y="19" width="3.6" height="5" rx="1.5" fill="#fff" fillOpacity=".6" />
    </svg>
    <span>Parse</span>
  </a>;
}
