import { useId } from "react";

export const BrandLogo = ({ className = "", color = "#2a4599", mortar = "#ffffff" }) => {
  const id = useId().replace(/[:]/g, "");
  const courses = [16, 27, 38, 49, 60, 71, 82, 93, 104];
  const lines = [];
  courses.forEach((y, i) => lines.push(<line key={`h${i}`} x1="30" y1={y} x2="92" y2={y} />));
  for (let i = 0; i < courses.length - 1; i++) {
    const y1 = courses[i];
    const y2 = courses[i + 1];
    const offset = i % 2 ? 0 : 8;
    for (let x = 38 + offset; x < 92; x += 16) {
      lines.push(<line key={`v${i}-${x}`} x1={x} y1={y1} x2={x} y2={y2} />);
    }
  }
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="BitsNdBricks logo" xmlns="http://www.w3.org/2000/svg">
      <g fill={color}>
        <rect x="22" y="16" width="18" height="88" rx="2" />
        <rect x="32" y="16" width="46" height="46" rx="23" />
        <rect x="32" y="58" width="52" height="46" rx="23" />
      </g>
      <clipPath id={`bumps-${id}`}>
        <rect x="32" y="16" width="46" height="46" rx="23" />
        <rect x="32" y="58" width="52" height="46" rx="23" />
      </clipPath>
      <g clipPath={`url(#bumps-${id})`} stroke={mortar} strokeOpacity="0.85" strokeWidth="2">
        {lines}
      </g>
    </svg>
  );
};

export default BrandLogo;
