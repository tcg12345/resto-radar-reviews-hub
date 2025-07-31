-- Create a sample user review for Minetta Tavern for testing
INSERT INTO public.user_reviews (
  user_id, 
  restaurant_place_id, 
  restaurant_name, 
  restaurant_address, 
  overall_rating, 
  review_text, 
  photos, 
  photo_captions, 
  photo_dish_names
) VALUES (
  'c6a29e3d-eb29-4576-bf53-296b2983bff9',
  'ChIJeQcZlpFZwokRjoemq-_w9QA',
  'Minetta Tavern',
  '113 MacDougal St, New York, NY 10012, United States',
  9.5,
  'Absolutely incredible steakhouse experience! The Black Label Burger is legendary and the bone marrow was perfectly prepared. Service was attentive and the historic atmosphere really adds to the charm.',
  ARRAY['https://example.com/minetta-burger.jpg', 'https://example.com/minetta-interior.jpg'],
  ARRAY['The famous Black Label Burger - worth every penny', 'Beautiful historic dining room atmosphere'],
  ARRAY['Black Label Burger', 'Dining Room']
) ON CONFLICT DO NOTHING;