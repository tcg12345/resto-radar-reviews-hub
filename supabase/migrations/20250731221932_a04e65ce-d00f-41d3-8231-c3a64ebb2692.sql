-- Fix the get_restaurant_community_stats function with correct column names
CREATE OR REPLACE FUNCTION get_restaurant_community_stats(
    place_id_param TEXT,
    restaurant_name_param TEXT DEFAULT NULL,
    requesting_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    average_rating NUMERIC,
    total_reviews BIGINT,
    rating_distribution JSONB,
    recent_photos JSONB
) AS $$
BEGIN
    -- Get rating statistics from both restaurants and user_reviews tables
    WITH combined_ratings AS (
        -- From restaurants table
        SELECT rating
        FROM restaurants r
        WHERE r.google_place_id = place_id_param 
          AND r.rating IS NOT NULL
          AND (
            requesting_user_id IS NULL 
            OR r.user_id = requesting_user_id 
            OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = r.user_id AND p.is_public = true
            )
            OR EXISTS (
                SELECT 1 FROM friends f 
                WHERE (f.user1_id = requesting_user_id AND f.user2_id = r.user_id)
                   OR (f.user2_id = requesting_user_id AND f.user1_id = r.user_id)
            )
          )
        
        UNION ALL
        
        -- From user_reviews table
        SELECT ur.overall_rating as rating
        FROM user_reviews ur
        WHERE ur.restaurant_place_id = place_id_param 
          AND ur.overall_rating IS NOT NULL
          AND (
            requesting_user_id IS NULL 
            OR ur.user_id = requesting_user_id 
            OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = ur.user_id AND p.is_public = true
            )
            OR EXISTS (
                SELECT 1 FROM friends f 
                WHERE (f.user1_id = requesting_user_id AND f.user2_id = ur.user_id)
                   OR (f.user2_id = requesting_user_id AND f.user1_id = ur.user_id)
            )
          )
    ),
    rating_stats AS (
        SELECT 
            AVG(rating) as avg_rating,
            COUNT(*) as total_count
        FROM combined_ratings
    ),
    distribution AS (
        SELECT 
            COUNT(CASE WHEN rating >= 1 AND rating <= 2 THEN 1 END) as range_1_2,
            COUNT(CASE WHEN rating >= 3 AND rating <= 4 THEN 1 END) as range_3_4,
            COUNT(CASE WHEN rating >= 5 AND rating <= 6 THEN 1 END) as range_5_6,
            COUNT(CASE WHEN rating >= 7 AND rating <= 8 THEN 1 END) as range_7_8,
            COUNT(CASE WHEN rating >= 9 AND rating <= 10 THEN 1 END) as range_9_10
        FROM combined_ratings
    ),
    photo_data AS (
        -- From restaurants table - get photos with notes and dish names
        SELECT 
            r.user_id,
            p.username,
            r.photos,
            r.photo_notes as captions,
            r.photo_dish_names as dish_names,
            r.created_at,
            0 as helpful_count,
            r.id::text as review_id
        FROM restaurants r
        JOIN profiles p ON r.user_id = p.id
        WHERE r.google_place_id = place_id_param 
          AND r.photos IS NOT NULL 
          AND array_length(r.photos, 1) > 0
          AND (
            requesting_user_id IS NULL 
            OR r.user_id = requesting_user_id 
            OR p.is_public = true
            OR EXISTS (
                SELECT 1 FROM friends f 
                WHERE (f.user1_id = requesting_user_id AND f.user2_id = r.user_id)
                   OR (f.user2_id = requesting_user_id AND f.user1_id = r.user_id)
            )
          )
        
        UNION ALL
        
        -- From user_reviews table - get photos with captions
        SELECT 
            ur.user_id,
            p.username,
            ur.photos,
            ur.photo_captions as captions,
            ur.photo_dish_names as dish_names,
            ur.created_at,
            ur.helpful_count,
            ur.id::text as review_id
        FROM user_reviews ur
        JOIN profiles p ON ur.user_id = p.id
        WHERE ur.restaurant_place_id = place_id_param 
          AND ur.photos IS NOT NULL 
          AND array_length(ur.photos, 1) > 0
          AND (
            requesting_user_id IS NULL 
            OR ur.user_id = requesting_user_id 
            OR p.is_public = true
            OR EXISTS (
                SELECT 1 FROM friends f 
                WHERE (f.user1_id = requesting_user_id AND f.user2_id = ur.user_id)
                   OR (f.user2_id = requesting_user_id AND f.user1_id = ur.user_id)
            )
          )
        ORDER BY created_at DESC
        LIMIT 50
    )
    
    SELECT 
        COALESCE(rs.avg_rating, 0)::NUMERIC as average_rating,
        COALESCE(rs.total_count, 0) as total_reviews,
        jsonb_build_object(
            '1-2', d.range_1_2,
            '3-4', d.range_3_4,
            '5-6', d.range_5_6,
            '7-8', d.range_7_8,
            '9-10', d.range_9_10
        ) as rating_distribution,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'review_id', pd.review_id,
                    'user_id', pd.user_id,
                    'username', pd.username,
                    'photos', pd.photos,
                    'captions', pd.captions,
                    'dish_names', pd.dish_names,
                    'created_at', pd.created_at,
                    'helpful_count', pd.helpful_count
                ) ORDER BY pd.created_at DESC
            ) FILTER (WHERE pd.user_id IS NOT NULL),
            '[]'::jsonb
        ) as recent_photos
    FROM rating_stats rs
    CROSS JOIN distribution d
    LEFT JOIN photo_data pd ON true
    GROUP BY rs.avg_rating, rs.total_count, d.range_1_2, d.range_3_4, d.range_5_6, d.range_7_8, d.range_9_10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;