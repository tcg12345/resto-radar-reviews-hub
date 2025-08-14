-- Create storage policies for restaurant photos
-- Allow authenticated users to upload their own restaurant photos
CREATE POLICY "Users can upload their own restaurant photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.foldername(name))[2] = 'restaurant-photos'
);

-- Allow users to view their own restaurant photos
CREATE POLICY "Users can view their own restaurant photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.foldername(name))[2] = 'restaurant-photos'
);

-- Allow users to delete their own restaurant photos
CREATE POLICY "Users can delete their own restaurant photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.foldername(name))[2] = 'restaurant-photos'
);

-- Allow users to update their own restaurant photos
CREATE POLICY "Users can update their own restaurant photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.foldername(name))[2] = 'restaurant-photos'
);