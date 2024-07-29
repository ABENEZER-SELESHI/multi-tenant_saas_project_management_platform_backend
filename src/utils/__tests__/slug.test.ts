import { slugify, generateProjectKey } from '../slug';

describe('slugify', () => {
  it('converts text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('My Org! @2024')).toBe('my-org-2024');
  });
});

describe('generateProjectKey', () => {
  it('generates key from multiple words', () => {
    expect(generateProjectKey('Customer Portal')).toBe('CUSPOR');
  });

  it('generates key from single word', () => {
    expect(generateProjectKey('Backend')).toBe('BACK');
  });
});
