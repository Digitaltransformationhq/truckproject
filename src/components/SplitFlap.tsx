import { useEffect, useState } from 'react';

/**
 * Airport-style split-flap board that rolls between an action word and FARES24X7.
 * Used for the loading screen and as a full-screen overlay while logging in / out.
 */
const CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BRAND = 'FARES24X7';

function Flap({ char, delay, hot }: { char: string; delay: number; hot: boolean }) {
  const [shown, setShown] = useState(char);
  const [flipping, setFlipping] = useState(false);
  useEffect(() => {
    let steps = 4 + Math.floor(Math.random() * 4);
    let timer = 0;
    const tick = () => {
      setFlipping(false);
      requestAnimationFrame(() => setFlipping(true));
      if (steps-- > 0) { setShown(CHARS[Math.floor(Math.random() * CHARS.length)]!); timer = window.setTimeout(tick, 60); }
      else setShown(char);
    };
    timer = window.setTimeout(tick, delay);
    return () => window.clearTimeout(timer);
  }, [char, delay]);
  return <span className={`sf-flap ${flipping ? 'flip' : ''} ${hot && shown === char ? 'hot' : ''}`}>{shown}</span>;
}

export function SplitFlapBoard({ word }: { word: string }) {
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const width = Math.max(word.length, BRAND.length);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setIndex((value) => value + 1), 1900);
    return () => window.clearInterval(id);
  }, [reduced]);
  const raw = index % 2 === 0 ? word : BRAND;
  // Centre shorter words on a board sized for the longest one, so it never changes width.
  const text = (' '.repeat(Math.floor((width - raw.length) / 2)) + raw).padEnd(width, ' ');
  const isBrand = index % 2 === 1;
  return <div className="sf-board" role="status" aria-label={word.toLowerCase()}>
    {text.split('').map((char, i) => <Flap key={`${index}-${i}`} char={char} delay={i * 40} hot={isBrand && /[0-9X]/.test(char)}/>)}
  </div>;
}

/** Full-screen loading page with the board. */
export function SplitFlapScreen({ word = 'LOADING' }: { word?: string }) {
  return <div className="sf-screen"><SplitFlapBoard word={word}/></div>;
}

// --- Global overlay: showBoard('LOGGING IN') from anywhere, hideBoard() when done ---------------
type Listener = (word: string | null) => void;
const listeners = new Set<Listener>();
let current: string | null = null;
let shownAt = 0;
let hideTimer = 0;
const MIN_VISIBLE = 1700;

export function showBoard(word: string) {
  window.clearTimeout(hideTimer);
  if (!current) shownAt = Date.now();
  current = word;
  listeners.forEach((listener) => listener(current));
}

/** Hides the overlay, keeping it on screen long enough for one full roll. */
export function hideBoard() {
  const wait = Math.max(0, MIN_VISIBLE - (Date.now() - shownAt));
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => { current = null; listeners.forEach((listener) => listener(null)); }, wait);
}

export function SplitFlapOverlay() {
  const [word, setWord] = useState<string | null>(current);
  useEffect(() => { listeners.add(setWord); return () => { listeners.delete(setWord); }; }, []);
  if (!word) return null;
  return <div className="sf-screen sf-overlay"><SplitFlapBoard word={word}/></div>;
}
