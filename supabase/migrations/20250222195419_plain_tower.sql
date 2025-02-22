-- Create workout_options table
CREATE TABLE workout_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workout_options ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Workout options are viewable by everyone"
  ON workout_options FOR SELECT
  USING (true);

CREATE POLICY "Only staff can modify workout options"
  ON workout_options FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  ));

-- Insert initial workout options
INSERT INTO workout_options (name, category, description, icon) VALUES
('Running', 'Cardio', 'Outdoor or treadmill running', 'run'),
('Cycling', 'Cardio', 'Indoor or outdoor cycling', 'bike'),
('Swimming', 'Cardio', 'Pool or open water swimming', 'swim'),
('HIIT', 'Cardio', 'High-intensity interval training', 'lightning-bolt'),
('Strength Training', 'Strength', 'Weight training with equipment', 'dumbbell'),
('Bodyweight Training', 'Strength', 'Exercises using body weight', 'account'),
('Yoga', 'Flexibility', 'Mind-body practice combining poses and breathing', 'yoga'),
('Pilates', 'Flexibility', 'Core-strengthening and flexibility exercises', 'pilates'),
('Boxing', 'Combat', 'Boxing training and workouts', 'boxing-glove'),
('Kickboxing', 'Combat', 'Kickboxing training and workouts', 'karate'),
('CrossFit', 'Cross-Training', 'High-intensity functional training', 'weight-lifter'),
('Rowing', 'Cardio', 'Indoor or outdoor rowing', 'rowing'),
('Stretching', 'Recovery', 'Flexibility and mobility work', 'human-handsup'),
('Walking', 'Low-Impact', 'Casual or power walking', 'walk'),
('Meditation', 'Mind-Body', 'Mental wellness and mindfulness practice', 'meditation');

-- Create index for faster searches
CREATE INDEX workout_options_category_idx ON workout_options(category);