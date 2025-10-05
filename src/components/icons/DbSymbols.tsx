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

export const JumpIcon = ({ className = "" }: IconProps) => {
  return (
    <svg
      width="32"
      height="24"
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wide upward arrow - thick lines */}
      <path
        d="M 2 22 L 16 2 L 30 22"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
