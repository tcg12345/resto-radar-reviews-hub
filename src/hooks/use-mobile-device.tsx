
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
      
      // Device is mobile if it has small screen (for mobile preview compatibility)
      const isMobile = isSmallScreen
      
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
