export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateProjectKey = (name: string): string => {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return (words[0].slice(0, 3) + words[1].slice(0, 3)).slice(0, 6);
  }
  return words[0]?.slice(0, 4) ?? 'PROJ';
};
