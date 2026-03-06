/**
 * Timer utility functions for Interview Coach
 * Validates: Requirements 6.2
 */

/**
 * Formats elapsed time in seconds to MM:SS format with zero-padding
 * @param seconds - Elapsed time in seconds (0 to 3599)
 * @returns Formatted time string in MM:SS format (e.g., "00:00", "01:23", "10:45")
 * 
 * @example
 * formatTimer(0)    // "00:00"
 * formatTimer(83)   // "01:23"
 * formatTimer(645)  // "10:45"
 * formatTimer(3599) // "59:59"
 */
export function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(remainingSeconds).padStart(2, '0');
  
  return `${paddedMinutes}:${paddedSeconds}`;
}
