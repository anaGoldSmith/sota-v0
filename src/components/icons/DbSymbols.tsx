interface IconProps {
  className?: string;
}

export const RotationIcon = ({ className = "" }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Vertical line (stem) */}
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="15"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Circle at bottom */}
      <circle
        cx="12"
        cy="19"
        r="4"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
    </svg>
  );
};
