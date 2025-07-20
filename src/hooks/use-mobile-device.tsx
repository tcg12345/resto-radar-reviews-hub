
import * as React from "react"

export function useIsMobileDevice() {
  const [isMobileDevice, setIsMobileDevice] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobileDevice = () => {
      // Check screen width
      const isSmallScreen = window.innerWidth < 1024
      
      // Check for touch capability
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Check user agent for mobile indicators
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      
      // Device is mobile if:
      // 1. Small screen AND has touch capability (real mobile device)
      // 2. Small screen AND mobile user agent (mobile browser)
      // 3. Very small screen (likely mobile preview, < 768px)
      const isMobile = isSmallScreen && (hasTouchScreen || isMobileUA || window.innerWidth < 768)
      
      console.log('Mobile device detection:', {
        screenWidth: window.innerWidth,
        isSmallScreen,
        hasTouchScreen,
        isMobileUA,
        isMobile
      })
      
      setIsMobileDevice(isMobile)
    }

    // Check immediately
    checkMobileDevice()
    
    // Also check on resize
    const handleResize = () => checkMobileDevice()
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return !!isMobileDevice
}
