export function smartExtract(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  return raw
    // Usuń typowe elementy UI
    .replace(/Copy|Share|Save|Edit|Delete|Regenerate|Continue|Try again/gi, '')
    .replace(/\d+\/\d+|Show more|Show less|Read more|Collapse/gi, '')
    
    // Usuń emoji na początku linii
    .replace(/^[^\w\s]+/gm, '')
    
    // Usuń nadmiarowe białe znaki
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    
    // Usuń puste linie na początku i końcu
    .trim();
}

export function extractMainContent(html: string): string {
  // Spróbuj wyciągnąć główną treść z HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Usuń elementy nawigacyjne i kontrolne
  const elementsToRemove = tempDiv.querySelectorAll(
    'button, nav, .sidebar, .menu, .toolbar, .controls, .copy-button, .share-button'
  );
  elementsToRemove.forEach(el => el.remove());
  
  return smartExtract(tempDiv.textContent || '');
}

export function limitWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }
  
  return words.slice(0, maxWords).join(' ') + '...';
}

export function cleanResponse(response: string, maxWords?: number): string {
  let clean = smartExtract(response);
  
  if (maxWords) {
    clean = limitWords(clean, maxWords);
  }
  
  return clean;
}
