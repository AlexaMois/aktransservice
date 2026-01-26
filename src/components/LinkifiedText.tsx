import { ExternalLink } from 'lucide-react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

/**
 * Component that automatically converts URLs in text to clickable links
 */
export function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  if (!text) return null;

  // Regex to match URLs (http, https, www)
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  
  const parts = text.split(urlRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part is a URL
        if (urlRegex.test(part)) {
          // Reset regex lastIndex after test
          urlRegex.lastIndex = 0;
          
          const href = part.startsWith('www.') ? `https://${part}` : part;
          
          // Truncate display URL if too long
          const displayUrl = part.length > 50 
            ? part.substring(0, 47) + '...' 
            : part;
          
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5 break-all"
              style={{ wordBreak: 'break-all' }}
              onClick={(e) => e.stopPropagation()}
            >
              {displayUrl}
              <ExternalLink className="h-3 w-3 shrink-0 inline-block" />
            </a>
          );
        }
        
        // Reset regex lastIndex
        urlRegex.lastIndex = 0;
        
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
