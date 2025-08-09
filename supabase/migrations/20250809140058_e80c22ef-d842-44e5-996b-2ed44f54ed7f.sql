-- Update the RLS policy to restrict public itinerary viewing to friends only
DROP POLICY IF EXISTS "Anyone can view shareable itineraries" ON itineraries;

-- Create a new policy that allows friends to view shareable itineraries
CREATE POLICY "Friends can view shareable itineraries" 
ON itineraries 
FOR SELECT 
USING (
  is_shareable = true 
  AND EXISTS (
    SELECT 1 
    FROM friends f 
    WHERE (
      (f.user1_id = auth.uid() AND f.user2_id = itineraries.user_id) 
      OR 
      (f.user2_id = auth.uid() AND f.user1_id = itineraries.user_id)
    )
  )
);