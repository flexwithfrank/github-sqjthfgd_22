-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_challenge_progress_trigger ON activities;
DROP FUNCTION IF EXISTS update_challenge_progress();

-- Create improved function to update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Handle different operations
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  -- Update progress for all active challenges for the affected user
  UPDATE challenge_progress cp
  SET current_value = calculate_challenge_progress(cp.user_id, cp.challenge_id)
  FROM challenges c
  WHERE c.id = cp.challenge_id
  AND c.status = 'active'
  AND cp.user_id = v_user_id;

  -- Return appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger that properly handles all operations
CREATE TRIGGER update_challenge_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_progress();

-- Recalculate all challenge progress
DO $$
BEGIN
  UPDATE challenge_progress cp
  SET current_value = calculate_challenge_progress(cp.user_id, cp.challenge_id)
  FROM challenges c
  WHERE c.id = cp.challenge_id
  AND c.status = 'active';
END $$;