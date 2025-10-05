interface IconProps {
  className?: string;
}

export const RotationIcon = ({ className = "" }: IconProps) => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Vertical line (stem) */}
      <line
        x1="16"
        y1="4"
        x2="16"
        y2="20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Circle at bottom */}
      <circle
        cx="16"
        cy="25"
        r="5.5"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
};
