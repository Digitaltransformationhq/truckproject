import type { ReturnMatch } from '../types';
import { formatDate } from '../lib/matching';
import { Icon } from './Icon';

interface MatchRowProps { match: ReturnMatch; onOpen: () => void; }

export function MatchRow({ match, onOpen }: MatchRowProps) {
  const { truck, load, score, reasons } = match;
  return (
    <article className="match-row">
      <div className="route">
        <div className="truck-badge"><Icon name="truck" /></div>
        <div>
          <div className="route-line"><strong>{truck.location}</strong><i/><strong>{truck.destination}</strong></div>
          <span>{truck.registration} · {truck.type}</span>
          <div className="match-tags">{reasons.slice(0, 2).map((reason) => <span key={reason} className={`tag ${reason === 'Return route' ? 'orange' : ''}`}>{reason}</span>)}</div>
        </div>
      </div>
      <div className="load-cell"><strong>{load.material} · {load.quantity}T</strong><span>{load.type} · Pickup {formatDate(load.date)}</span></div>
      <div className="score"><span>Match score</span><strong>{score}%</strong><div className="scorebar"><i style={{ width: `${score}%` }}/></div></div>
      <button className="match-action" title="View match" onClick={onOpen}><Icon name="arrow" /></button>
    </article>
  );
}
