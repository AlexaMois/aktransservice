/**
 * Auto-formats announcement text to be more readable
 * - Adds proper spacing between paragraphs
 * - Converts numbered lists to proper format
 * - Cleans up excessive whitespace
 */
export function formatAnnouncementText(text: string): string {
  if (!text) return '';
  
  let formatted = text.trim();
  
  // Normalize line breaks (convert multiple to double)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // Clean up spaces around line breaks
  formatted = formatted.replace(/[ \t]+\n/g, '\n');
  formatted = formatted.replace(/\n[ \t]+/g, '\n');
  
  // Format numbered lists: "1)" or "1." at start of line
  formatted = formatted.replace(/^(\d+)[)\.]\s*/gm, '$1. ');
  
  // Format bullet points: "- " or "• " consistency
  formatted = formatted.replace(/^[•●○]\s*/gm, '• ');
  formatted = formatted.replace(/^[-–—]\s+/gm, '• ');
  
  // Add spacing before headers (lines ending with :)
  formatted = formatted.replace(/([^\n])\n([^\n•\d][^:\n]*:)\n/g, '$1\n\n$2\n');
  
  // Ensure headers have proper spacing
  formatted = formatted.replace(/^(\*\*[^*]+\*\*)\n(?!\n)/gm, '$1\n\n');
  
  // Trim each line
  formatted = formatted.split('\n').map(line => line.trim()).join('\n');
  
  // Final cleanup of excessive blank lines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted.trim();
}

/**
 * Formats announcement for display with proper structure
 */
export function formatAnnouncementForDisplay(summary: string, description?: string | null): {
  formattedSummary: string;
  formattedDescription: string | null;
} {
  return {
    formattedSummary: formatAnnouncementText(summary),
    formattedDescription: description ? formatAnnouncementText(description) : null,
  };
}
