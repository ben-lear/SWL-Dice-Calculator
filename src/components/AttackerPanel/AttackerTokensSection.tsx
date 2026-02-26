import { useEffect } from 'react';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';

export default function AttackerTokensSection() {
  const store = useAttackConfigStore();

  const hasDefeatedMinisKeyword = store.weapons.some(
    (w) => w.enabled !== false && (w.keywords.blackOps || w.keywords.krakenBlaster),
  );

  useEffect(() => {
    if (!hasDefeatedMinisKeyword && store.defeatedMinis > 0) {
      store.setField('defeatedMinis', 0);
    }
  }, [hasDefeatedMinisKeyword, store.defeatedMinis, store]);

  return (
    <SectionHeader title="Tokens">
      <div className="keyword-grid">
        <NumberSpinner
          label="Aim"
          value={store.aimTokens}
          onChange={(value) => store.setField('aimTokens', value)}
          min={0}
          max={99}
          compact
          tooltip="Spend aim tokens to reroll attack dice. Each token lets you reroll up to 2 dice."
        />
        <NumberSpinner
          label="Surge"
          value={store.surgeTokens}
          onChange={(value) => store.setField('surgeTokens', value)}
          min={0}
          max={99}
          compact
          tooltip="Spend surge tokens to convert attack surge results to hits."
        />
        <NumberSpinner
          label="Observation"
          value={store.observationTokens}
          onChange={(value) => store.setField('observationTokens', value)}
          min={0}
          max={99}
          compact
          tooltip="Spend observation tokens on the defending unit to reroll 1 attack die per token spent."
        />
        {store.jarKaiMastery && (
          <NumberSpinner
            label="Dodge"
            value={store.dodgeTokensAttacker}
            onChange={(value) => store.setField('dodgeTokensAttacker', value)}
            min={0}
            max={99}
            compact
            tooltip="Spend dodge tokens to upgrade results in melee: blank to hit (1 token), hit to crit (1 token), or blank to crit (2 tokens)."
          />
        )}
        <NumberSpinner
          label="Defeated Minis"
          value={store.defeatedMinis}
          onChange={(value) => store.setField('defeatedMinis', value)}
          min={0}
          max={99}
          compact
          disabled={!hasDefeatedMinisKeyword}
          tooltip={
            hasDefeatedMinisKeyword
              ? "Number of defeated miniatures in this unit. Affects Black Ops (+1 white die per defeated mini) and Kraken's Blaster (upgrade 1 die per defeated mini)."
              : "Requires Black Ops (Cassian Andor) or Kraken's Blaster heavy weapon upgrade."
          }
        />
      </div>
    </SectionHeader>
  );
}
