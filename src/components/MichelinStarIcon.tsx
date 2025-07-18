interface MichelinStarIconProps {
  className?: string;
  fill?: string;
  stroke?: string;
}

export function MichelinStarIcon({ 
  className = "h-5 w-5", 
  fill = "currentColor", 
  stroke = "currentColor" 
}: MichelinStarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={fill}
      stroke={stroke}
      strokeWidth="0"
    >
      <path d="M12 2C12 2 9.5 4.5 7 4.5C4.5 4.5 2 2 2 2C2 2 4.5 4.5 4.5 7C4.5 9.5 2 12 2 12C2 12 4.5 14.5 4.5 17C4.5 19.5 2 22 2 22C2 22 4.5 19.5 7 19.5C9.5 19.5 12 22 12 22C12 22 14.5 19.5 17 19.5C19.5 19.5 22 22 22 22C22 22 19.5 19.5 19.5 17C19.5 14.5 22 12 22 12C22 12 19.5 9.5 19.5 7C19.5 4.5 22 2 22 2C22 2 19.5 4.5 17 4.5C14.5 4.5 12 2 12 2Z" />
    </svg>
  );
}