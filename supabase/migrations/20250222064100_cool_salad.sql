-- Create function to calculate total activities for a user within a challenge date range
CREATE OR REPLACE FUNCTION calculate_challenge_progress(
  p_user_id uuid,
  p_challenge_id uuid
) RETURNS integer AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_total integer;
BEGIN
  -- Get challenge date range
  SELECT 
    start_date::date,
    end_date::date
  INTO v_start_date, v_end_date
  FROM challenges
  WHERE id = p_challenge_id;

  -- Calculate total activities within date range
  SELECT COUNT(*)
  INTO v_total
  FROM activities
  WHERE user_id = p_user_id
  AND activity_date >= v_start_date
  AND activity_date <= v_end_date;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Create function to update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update progress for all active challenges
  UPDATE challenge_progress cp
  SET current_value = calculate_challenge_progress(cp.user_id, cp.challenge_id)
  FROM challenges c
  WHERE c.id = cp.challenge_id
  AND c.status = 'active'
  AND cp.user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update progress when activities are added/modified
DROP TRIGGER IF EXISTS update_challenge_progress_trigger ON activities;
CREATE TRIGGER update_challenge_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_progress();

-- Update all existing challenge progress records
DO $$
BEGIN
  UPDATE challenge_progress cp
  SET current_value = calculate_challenge_progress(cp.user_id, cp.challenge_id)
  FROM challenges c
  WHERE c.id = cp.challenge_id
  AND c.status = 'active';
END $$;