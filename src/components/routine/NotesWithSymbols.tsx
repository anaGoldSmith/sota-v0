import { useMemo } from "react";

interface SymbolMap {
  [code: string]: string | null;
}

interface NotesWithSymbolsProps {
  notes: string;
  symbolMap: SymbolMap;
}

/**
 * Parses notes text and replaces {code} patterns with inline symbols
 */
export const NotesWithSymbols = ({ notes, symbolMap }: NotesWithSymbolsProps) => {
  const parsedContent = useMemo(() => {
    // Match patterns like {Catch3}, {Cr2H}, etc.
    const pattern = /\{([^}]+)\}/g;
    const parts: (string | { type: 'symbol'; code: string; url: string | null })[] = [];
    
    let lastIndex = 0;
    let match;
    
    while ((match = pattern.exec(notes)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(notes.substring(lastIndex, match.index));
      }
      
      const code = match[1];
      const symbolUrl = symbolMap[code] || null;
      
      parts.push({
        type: 'symbol',
        code,
        url: symbolUrl
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last match
    if (lastIndex < notes.length) {
      parts.push(notes.substring(lastIndex));
    }
    
    return parts;
  }, [notes, symbolMap]);

  return (
    <span className="inline">
      {parsedContent.map((part, index) => {
        if (typeof part === 'string') {
          // Handle newlines in text parts
          const lines = part.split('\n');
          return (
            <span key={index}>
              {lines.map((line, lineIndex) => (
                <span key={lineIndex}>
                  {line}
                  {lineIndex < lines.length - 1 && <br />}
                </span>
              ))}
            </span>
          );
        }
        
        // It's a symbol reference
        if (part.url) {
          return (
            <img
              key={index}
              src={part.url}
              alt={part.code}
              className="inline-block h-5 w-5 object-contain mx-0.5 align-middle"
              onError={(e) => {
                // Fallback to showing the code if image fails
                const span = document.createElement('span');
                span.textContent = `[${part.code}]`;
                span.className = 'text-muted-foreground font-mono text-xs';
                e.currentTarget.replaceWith(span);
              }}
            />
          );
        }
        
        // No symbol URL found, show code as fallback
        return (
          <span key={index} className="text-muted-foreground font-mono text-xs">
            [{part.code}]
          </span>
        );
      })}
    </span>
  );
};
