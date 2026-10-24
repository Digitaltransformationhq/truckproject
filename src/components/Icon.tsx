import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'overview' | 'truck' | 'package' | 'route' | 'building' | 'inbox'
  | 'search' | 'bell' | 'logout' | 'arrow' | 'trend' | 'menu' | 'close'
  | 'pin' | 'wallet' | 'headset' | 'chevron';

const paths: Record<IconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  package: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4.5 7.7 12 12l7.5-4.3M12 12v9M8 5.2l8 4.5"/></>,
  route: <><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3M8 5 6 3 4 5"/></>,
  building: <><path d="M4 21V5l8-2v18M12 8h8v13M8 8v1M8 12v1M8 16v1M16 12v1M16 16v1M2 21h20"/></>,
  inbox: <><path d="M4 4h16v16H4zM4 14h4l2 3h4l2-3h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  trend: <><path d="m4 16 5-5 4 4 7-8M15 7h5v5"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  wallet: <><path d="M3 6h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6Z"/><path d="M3 7V5a2 2 0 0 1 2-2h12M15 11h5v4h-5a2 2 0 1 1 0-4Z"/></>,
  headset: <><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5ZM17 20c0 1-2 1-3 1"/></>,
  chevron: <><path d="m9 18 6-6-6-6"/></>,
};

interface IconProps extends SVGProps<SVGSVGElement> { name: IconName; }

export function Icon({ name, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
