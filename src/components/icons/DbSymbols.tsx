interface IconProps {
  className?: string;
}

export const RotationIcon = ({ className = "" }: IconProps) => {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Vertical line (stem) */}
      <line
        x1="24"
        y1="6"
        x2="24"
        y2="30"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Circle at bottom */}
      <circle
        cx="24"
        cy="38"
        r="8"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
    </svg>
  );
};

export const JumpIcon = ({ className = "" }: IconProps) => {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wide upward arrow - thick lines */}
      <path
        d="M 2 22 L 16 2 L 30 22"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export const BalanceIcon = ({ className = "" }: IconProps) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* T-shape for balance */}
      <line
        x1="4"
        y1="6"
        x2="28"
        y2="6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="6"
        x2="16"
        y2="26"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};
