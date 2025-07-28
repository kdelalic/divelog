-- Initialize database schema for dive log application

-- Create users table for user management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table to store user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unit preferences
    unit_preference VARCHAR(10) NOT NULL DEFAULT 'metric' CHECK (unit_preference IN ('imperial', 'metric', 'customize')),
    depth_unit VARCHAR(10) NOT NULL DEFAULT 'meters' CHECK (depth_unit IN ('meters', 'feet')),
    temperature_unit VARCHAR(10) NOT NULL DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit')),
    distance_unit VARCHAR(15) NOT NULL DEFAULT 'kilometers' CHECK (distance_unit IN ('kilometers', 'miles')),
    weight_unit VARCHAR(15) NOT NULL DEFAULT 'kilograms' CHECK (weight_unit IN ('kilograms', 'pounds')),
    pressure_unit VARCHAR(10) NOT NULL DEFAULT 'bar' CHECK (pressure_unit IN ('bar', 'psi')),
    volume_unit VARCHAR(15) NOT NULL DEFAULT 'liters' CHECK (volume_unit IN ('liters', 'cubic_feet')),
    
    -- Display preferences
    date_format VARCHAR(10) NOT NULL DEFAULT 'ISO' CHECK (date_format IN ('ISO', 'US', 'EU')),
    time_format VARCHAR(5) NOT NULL DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
    default_visibility VARCHAR(10) NOT NULL DEFAULT 'private' CHECK (default_visibility IN ('private', 'public')),
    
    -- Diving preferences
    show_buddy_reminders BOOLEAN NOT NULL DEFAULT true,
    auto_calculate_nitrox BOOLEAN NOT NULL DEFAULT false,
    default_gas_mix VARCHAR(50) NOT NULL DEFAULT 'Air (21% O2)',
    max_depth_warning INTEGER NOT NULL DEFAULT 40,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create dive sites table
CREATE TABLE IF NOT EXISTS dive_sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dives table
CREATE TABLE IF NOT EXISTS dives (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    dive_site_id INTEGER REFERENCES dive_sites(id) ON DELETE SET NULL,
    
    dive_datetime TIMESTAMP NOT NULL,
    max_depth DECIMAL(5, 2) NOT NULL, -- stored in meters
    duration INTEGER NOT NULL, -- stored in minutes
    buddy VARCHAR(255),
    
    -- Location data (for dives without specific dive sites)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location VARCHAR(255),
    
    -- Additional dive data
    water_temperature DECIMAL(5, 2), -- stored in celsius
    visibility INTEGER, -- stored in meters
    notes TEXT,
    samples JSONB, -- dive profile samples (time, depth, temperature, pressure)
    
    -- Equipment and conditions (stored as JSONB for flexibility)
    equipment JSONB, -- tanks, BCD, regulator, wetsuit, weights, etc.
    conditions JSONB, -- water temp, air temp, visibility, current, weather, sea state
    dive_type VARCHAR(20) CHECK (dive_type IN ('recreational', 'training', 'technical', 'work', 'research')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
    safety_stops JSONB, -- array of safety stops with depth and duration
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dives_user_id ON dives(user_id);
CREATE INDEX IF NOT EXISTS idx_dives_datetime ON dives(dive_datetime);
CREATE INDEX IF NOT EXISTS idx_dives_samples ON dives USING GIN (samples); -- for JSONB queries
CREATE INDEX IF NOT EXISTS idx_dives_equipment ON dives USING GIN (equipment); -- for JSONB queries
CREATE INDEX IF NOT EXISTS idx_dives_conditions ON dives USING GIN (conditions); -- for JSONB queries
CREATE INDEX IF NOT EXISTS idx_dives_dive_type ON dives(dive_type);
CREATE INDEX IF NOT EXISTS idx_dives_rating ON dives(rating);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Insert a default user for development
INSERT INTO users (email, username) VALUES ('dev@example.com', 'developer') 
ON CONFLICT (email) DO NOTHING;

-- Insert default settings for the development user
INSERT INTO user_settings (user_id) 
SELECT id FROM users WHERE email = 'dev@example.com'
ON CONFLICT (user_id) DO NOTHING;