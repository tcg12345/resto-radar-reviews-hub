
import React from 'react';

interface MichelinStarIconProps {
  className?: string;
  fill?: string;
  stroke?: string;
}

export const MichelinStarIcon = React.memo(({ 
  className = "h-5 w-5", 
  fill = "currentColor", 
  stroke = "none" 
}: MichelinStarIconProps) => {
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={className}
      fill="none"
      stroke={fill}
      strokeWidth="2"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M 521,905 L 525,905 Z M 507,905 L 509,905 Z M 499,905 L 504,905 Z M 532,904 L 534,904 Z M 488,904 L 491,904 Z M 539,903 L 542,903 Z M 482,903 L 483,903 Z M 550,901 L 551,901 Z M 472,901 L 473,901 Z M 554,900 Z M 469,900 Z M 557,899 L 558,899 Z M 560,898 Z M 563,897 L 564,897 Z M 458,897 L 459,897 Z M 566,896 Z M 456,896 Z M 569,895 Z M 453,895 Z M 571,894 Z M 573,893 Z M 576,892 Z M 578,891 Z M 444,891 Z M 580,890 Z M 440,889 Z M 583,888 Z M 438,888 Z M 585,887 Z M 436,887 Z M 587,886 Z M 433,885 Z M 590,884 Z M 431,884 Z M 593,882 Z M 427,881 L 428,882 Z M 596,880 L 595,881 Z M 424,879 L 425,880 Z M 601,876 L 600,877 Z M 419,875 L 421,877 Z M 607,871 L 603,875 Z M 412,869 L 416,873 Z M 610,868 L 609,869 Z M 406,863 Z M 521,859 L 526,859 Z M 497,859 L 503,859 Z M 529,858 L 531,858 Z M 491,858 L 494,858 Z M 621,857 L 617,861 Z M 486,857 L 489,857 Z M 400,857 L 404,861 Z M 537,856 L 536,857 L 534,857 L 536,857 L 537,856 L 539,856 Z M 483,856 L 484,856 Z M 542,855 Z M 480,855 Z M 477,854 L 478,854 Z M 474,853 Z M 625,852 L 623,854 Z M 550,852 L 549,853 L 547,853 L 546,854 L 545,854 L 546,854 L 547,853 L 549,853 L 550,852 L 551,852 Z M 471,852 Z M 396,852 L 397,853 Z M 553,851 Z M 555,850 Z M 628,848 L 627,849 Z M 559,848 L 558,849 L 557,849 L 558,849 Z M 393,848 L 394,849 Z M 561,847 Z M 461,847 L 462,848 L 463,848 L 464,849 L 465,849 L 466,850 L 467,850 L 468,851 L 469,851 L 470,852 Z" 
        fill="none" 
        stroke={fill} 
        strokeWidth="2" />
    </svg>
  );
});

MichelinStarIcon.displayName = 'MichelinStarIcon';
