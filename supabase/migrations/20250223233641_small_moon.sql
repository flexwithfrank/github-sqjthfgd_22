/*
  # Add admin column to profiles table

  1. Changes
    - Add admin boolean column to profiles table
    - Create index for admin column
    - Add check constraint to ensure admin users are verified
  
  2. Security
    - Only allow admin users to modify admin status
*/

-- Add admin column with default false
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS admin boolean DEFAULT false;

-- Create index for admin column
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(admin);

-- Add check constraint to ensure admin users are verified
ALTER TABLE profiles
ADD CONSTRAINT admin_must_be_verified 
CHECK (
  (admin = false) OR 
  (admin = true AND role_verified = true)
);

-- Create policy to allow only admins to modify admin status
CREATE POLICY "Only admins can modify admin status"
ON profiles
FOR UPDATE
TO authenticated
USING (
  (admin = true AND auth.uid() IN (
    SELECT id FROM profiles WHERE admin = true
  ))
)
WITH CHECK (
  (admin = true AND auth.uid() IN (
    SELECT id FROM profiles WHERE admin = true
  ))
);