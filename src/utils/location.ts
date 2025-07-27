export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  address?: string;
}

export interface LocationError {
  code: number;
  message: string;
}

export class LocationService {
  private static instance: LocationService;
  private currentLocation: LocationData | null = null;
  private locationCache: Map<string, { location: LocationData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      // Check if we have cached location
      if (this.currentLocation) {
        resolve(this.currentLocation);
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          // Try to get address information
          try {
            const addressInfo = await this.reverseGeocode(location.latitude, location.longitude);
            location.city = addressInfo.city;
            location.country = addressInfo.country;
            location.address = addressInfo.address;
          } catch (error) {
            console.warn('Failed to get address information:', error);
          }

          this.currentLocation = location;
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }

          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<{
    city?: string;
    country?: string;
    address?: string;
  }> {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = this.locationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return {
        city: cached.location.city,
        country: cached.location.country,
        address: cached.location.address
      };
    }

    try {
      // Use a free geocoding service (OpenStreetMap Nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'GrubbyApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      const result = {
        city: data.address?.city || data.address?.town || data.address?.village || data.address?.suburb,
        country: data.address?.country,
        address: data.display_name
      };

      // Cache the result
      this.locationCache.set(cacheKey, {
        location: { latitude, longitude, ...result },
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return {};
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    if (!navigator.geolocation) {
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        return true;
      } else if (permission.state === 'prompt') {
        // Try to get location which will trigger permission prompt
        try {
          await this.getCurrentLocation();
          return true;
        } catch {
          return false;
        }
      }
      
      return false;
    } catch (error) {
      // Fallback for browsers that don't support permissions API
      try {
        await this.getCurrentLocation();
        return true;
      } catch {
        return false;
      }
    }
  }

  clearLocationCache() {
    this.currentLocation = null;
    this.locationCache.clear();
  }

  formatLocationForDisplay(location: LocationData): string {
    if (location.city && location.country) {
      return `${location.city}, ${location.country}`;
    } else if (location.city) {
      return location.city;
    } else if (location.address) {
      // Extract city from address if available
      const parts = location.address.split(',');
      return parts.length > 1 ? parts[0].trim() : location.address;
    } else {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
  }
}

export const locationService = LocationService.getInstance();