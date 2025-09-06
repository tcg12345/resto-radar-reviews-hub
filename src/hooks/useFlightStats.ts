import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FlightStats {
  flightRoute: string;
  carrierCode: string;
  flightNumber: string;
  onTimePerformance: {
    onTimePercentage: number;
    averageDelayMinutes: number;
    reliability: string;
    cancellationRate: number;
    lastMonth: {
      onTimePercentage: number;
      averageDelayMinutes: number;
    };
    yearToDate: {
      onTimePercentage: number;
      averageDelayMinutes: number;
    };
  };
  delayPrediction: any;
  lastUpdated: string;
}

interface UseFlightStatsParams {
  carrierCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  enabled?: boolean;
}

export function useFlightStats({
  carrierCode,
  flightNumber,
  departureAirport,
  arrivalAirport,
  enabled = true
}: UseFlightStatsParams) {
  const [flightStats, setFlightStats] = useState<FlightStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !carrierCode || !flightNumber || !departureAirport || !arrivalAirport) {
      return;
    }

    const fetchFlightStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
          body: {
            endpoint: 'flight-stats',
            carrierCode,
            flightNumber,
            departureAirport,
            arrivalAirport
          }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Failed to fetch flight stats');
        }

        if (data?.data) {
          setFlightStats(data.data);
        } else {
          throw new Error('No flight stats data received');
        }
      } catch (err) {
        console.error('Error fetching flight stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch flight stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlightStats();
  }, [carrierCode, flightNumber, departureAirport, arrivalAirport, enabled]);

  return {
    flightStats,
    isLoading,
    error,
    refetch: () => {
      if (enabled && carrierCode && flightNumber && departureAirport && arrivalAirport) {
        setFlightStats(null);
        setError(null);
      }
    }
  };
}