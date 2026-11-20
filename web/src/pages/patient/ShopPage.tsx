import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { ShopCard, isShop } from '@/components/patient/Backpack';
import { inGameFrame } from '@/components/patient/GamePage';

/** A shop of the town (/p/winkel/:shop): the smithy, tool shop, stables, workshop, armourer or mage tower. */
export function ShopPage() {
  const { shop } = useParams();
  const { t } = useI18n();
  if (!isShop(shop)) return <p className="text-[15px]">{t('Deze winkel bestaat niet.', 'This shop does not exist.')} <Link className="underline" to="/p/held/inventaris">{t('Naar je rugzak', 'To your backpack')}</Link></p>;
  return (
    <div className="space-y-4">
      {/* Opened from the village, the way back is the bar above ("back to the game"). */}
      {!inGameFrame() && <Link to="/p/held/inventaris" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Rugzak', 'Backpack')}</Link>}
      <ShopCard shop={shop} />
    </div>
  );
}
