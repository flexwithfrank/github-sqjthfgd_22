-- Add trainer selection functionality
ALTER TABLE activities
ADD COLUMN trainer_id uuid REFERENCES profiles(id),
ADD COLUMN trainer_name text;

-- Create index for trainer lookups
CREATE INDEX idx_activities_trainer ON activities(trainer_id);

-- Update existing activities to maintain data consistency
UPDATE activities
SET trainer_name = trainer
WHERE trainer IS NOT NULL;