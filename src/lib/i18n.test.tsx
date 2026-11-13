// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { setLang } from './i18n';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('whole-interface translation', () => {
  it('translates text, placeholders and new content, and restores English', async () => {
    document.body.innerHTML = '<main><h2>Customer requests</h2><input placeholder="Search fleet, loads or locations"><p>Vadodara</p></main>';
    setLang('hi');
    await tick();
    expect(document.querySelector('h2')!.textContent).toBe('ग्राहक रिक्वेस्ट');
    expect(document.querySelector('input')!.getAttribute('placeholder')).toBe('वाहन, लोड या स्थान खोजें');
    expect(document.querySelector('p')!.textContent).toBe('Vadodara'); // user data untouched

    const added = document.createElement('button');
    added.textContent = ' Accept request ';
    document.querySelector('main')!.appendChild(added);
    await tick();
    expect(added.textContent).toBe(' रिक्वेस्ट स्वीकार करें ');

    setLang('gu');
    await tick();
    expect(document.querySelector('h2')!.textContent).toBe('ગ્રાહક વિનંતીઓ');

    setLang('en');
    await tick();
    expect(document.querySelector('h2')!.textContent).toBe('Customer requests');
    expect(added.textContent).toBe(' Accept request ');
  });
});
