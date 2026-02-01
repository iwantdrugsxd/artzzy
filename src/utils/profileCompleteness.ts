import { Profile } from "../types/profile";

/**
 * Checks if a user profile is complete enough to use the People feed.
 * 
 * Requirements:
 * - name non-empty
 * - at least 1 photo (profilePhotoUrls or profile_photo_url)
 * - bio non-empty
 * - interests length >= 3
 * - prompts length >= 2 with non-empty answers
 * - onboarding_complete == true
 */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  
  // Check onboarding_complete
  if (!profile.onboarding_complete) return false;
  
  // Check name
  if (!profile.name || profile.name.trim().length === 0) return false;
  
  // Check at least 1 photo
  const hasPhoto = 
    (profile.profilePhotoUrls && profile.profilePhotoUrls.length > 0) ||
    (profile.profile_photo_url && profile.profile_photo_url.trim().length > 0);
  if (!hasPhoto) return false;
  
  // Check bio
  if (!profile.bio || profile.bio.trim().length === 0) return false;
  
  // Check interests (min 3)
  if (!profile.interests || profile.interests.length < 3) return false;
  
  // Check prompts (min 2 with non-empty answers)
  if (!profile.prompts || profile.prompts.length < 2) return false;
  const validPrompts = profile.prompts.filter(
    (p) => p && p.answer && p.answer.trim().length > 0
  );
  if (validPrompts.length < 2) return false;
  
  return true;
}



