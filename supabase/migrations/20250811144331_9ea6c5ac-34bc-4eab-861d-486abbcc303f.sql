-- Update rating functions to support Google Place ID lookups
DROP FUNCTION IF EXISTS get_friend_rating_stats(text, uuid);
DROP FUNCTION IF EXISTS get_expert_rating_stats(text);

-- Friend rating stats with Google Place ID support
CREATE OR REPLACE FUNCTION get_friend_rating_stats(place_id_param text, requesting_user_id uuid DEFAULT NULL)
RETURNS TABLE(avg_rating numeric, total_reviews bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(r.rating), 2) as avg_rating,
        COUNT(*)::bigint as total_reviews
    FROM restaurants r
    JOIN friends f ON (
        (f.user_id = requesting_user_id AND f.friend_id = r.user_id) OR
        (f.friend_id = requesting_user_id AND f.user_id = r.user_id)
    )
    WHERE f.status = 'accepted'
    AND r.rating IS NOT NULL
    AND (r.place_id = place_id_param OR r.google_place_id = place_id_param);
END;
$$ LANGUAGE plpgsql;

-- Expert rating stats with Google Place ID support  
CREATE OR REPLACE FUNCTION get_expert_rating_stats(place_id_param text)
RETURNS TABLE(avg_rating numeric, total_reviews bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(r.rating), 2) as avg_rating,
        COUNT(*)::bigint as total_reviews
    FROM restaurants r
    JOIN profiles p ON r.user_id = p.user_id
    WHERE p.is_expert = true
    AND r.rating IS NOT NULL
    AND (r.place_id = place_id_param OR r.google_place_id = place_id_param);
END;
$$ LANGUAGE plpgsql;