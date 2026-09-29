import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { getSavedItems, removeSavedItem, saveItem } from '../services/savedItemApi';
import { trackProductEvent } from '../services/productAnalyticsApi';

export default function SaveButton({ entityType, entityId, title, route, subjectCode = '', toast, className = '' }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getSavedItems().then((items) => {
      if (active) setSaved(items.some((item) => item.entityType === entityType && item.entityKey === String(entityId)));
    }).catch(() => {});
    return () => { active = false; };
  }, [entityType, entityId]);

  async function toggle() {
    if (!localStorage.getItem('token')) {
      toast?.('Sign in to save this item.', 'info');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (saved) await removeSavedItem(entityType, entityId);
      else await saveItem({ entityType, entityId, title, route, subjectCode });
      setSaved(!saved);
      trackProductEvent(saved ? 'unsave_item' : 'save_item', { routeKey: 'saved_items', type: entityType }).catch(() => {});
      toast?.(saved ? 'Removed from saved items.' : 'Saved for later.', 'success');
    } catch (error) {
      toast?.(error.response?.data?.error || 'Could not update saved items.', 'error');
    } finally { setBusy(false); }
  }

  return (
    <button type="button" className={`ps-save-button ${saved ? 'is-saved' : ''} ${className}`.trim()} onClick={toggle} disabled={busy} aria-pressed={saved} title={saved ? 'Remove from saved items' : 'Save for later'}>
      <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
