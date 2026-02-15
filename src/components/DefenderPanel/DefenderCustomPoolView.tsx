import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import {
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
} from '../../engine/types';

export default function DefenderCustomPoolView() {
  const store = useDefenseConfigStore();
  const {
    disableDefenseDice,
    dieColor,
    surgeChart,
    minisInLOS,
    coverType,
    coverX,
    smokeTokens,
    suppressed,
    dodgeTokens,
    surgeTokens,
    suppressionTokens,
    armorX,
    weakPointX,
    immunePierce,
    immuneMeleePierce,
    immuneBlast,
    impervious,
    dangerSenseX,
    uncannyLuckX,
    block,
    deflect,
    shienMastery,
    outmaneuver,
    lowProfile,
    shieldedX,
    djemSoMastery,
    soresuMastery,
    duelistDefender,
    backup,
    holdTheLine,
    guardianX,
    guardianDieColor,
    guardianSurgeChart,
    guardianDeflect,
    guardianSoresuMastery,
    guardianDodgeTokens,
    setField,
  } = store;

  return (
    <div className="space-y-6">
      {/* Defense Section */}
      <section>
        <h3 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">Defense</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={disableDefenseDice}
              onChange={(e) => setField('disableDefenseDice', e.target.checked)}
              className="rounded"
            />
            <span>Disable defense dice</span>
          </label>

          {!disableDefenseDice && (
            <>
              <div>
                <label className="block text-sm mb-1">Defense Die Color</label>
                <select
                  value={dieColor}
                  onChange={(e) => setField('dieColor', e.target.value as DefenseDieColor)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
                >
                  <option value={DefenseDieColor.White}>White</option>
                  <option value={DefenseDieColor.Red}>Red</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Surge Chart</label>
                <select
                  value={surgeChart}
                  onChange={(e) => setField('surgeChart', e.target.value as DefenseSurgeChart)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
                >
                  <option value={DefenseSurgeChart.None}>None</option>
                  <option value={DefenseSurgeChart.ToBlock}>To Block</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm mb-1">Minis in LOS</label>
            <input
              type="number"
              value={minisInLOS}
              onChange={(e) => setField('minisInLOS', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={1}
              max={20}
            />
          </div>
        </div>
      </section>

      {/* Cover Section */}
      <section>
        <h3 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">Cover</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-sm mb-1">Cover Type</label>
            <select
              value={coverType}
              onChange={(e) => setField('coverType', e.target.value as CoverType)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
            >
              <option value={CoverType.None}>None</option>
              <option value={CoverType.Light}>Light</option>
              <option value={CoverType.Heavy}>Heavy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Cover X</label>
            <input
              type="number"
              value={coverX}
              onChange={(e) => setField('coverX', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={2}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Smoke Tokens</label>
            <input
              type="number"
              value={smokeTokens}
              onChange={(e) => setField('smokeTokens', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={3}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={suppressed}
              onChange={(e) => setField('suppressed', e.target.checked)}
              className="rounded"
            />
            <span>Suppressed</span>
          </label>
        </div>
      </section>

      {/* Tokens Section */}
      <section>
        <h3 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">Tokens</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-sm mb-1">Dodge Tokens</label>
            <input
              type="number"
              value={dodgeTokens}
              onChange={(e) => setField('dodgeTokens', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={5}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Surge Tokens</label>
            <input
              type="number"
              value={surgeTokens}
              onChange={(e) => setField('surgeTokens', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={5}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Suppression Tokens</label>
            <input
              type="number"
              value={suppressionTokens}
              onChange={(e) => setField('suppressionTokens', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={10}
            />
          </div>
        </div>
      </section>

      {/* Keywords Section */}
      <section>
        <h3 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">Keywords</h3>
        <div className="space-y-2">
          {/* Numeric Keywords */}
          <div>
            <label className="block text-sm mb-1">Armor X</label>
            <input
              type="number"
              value={armorX}
              onChange={(e) => setField('armorX', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={10}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Danger Sense X</label>
            <input
              type="number"
              value={dangerSenseX}
              onChange={(e) => setField('dangerSenseX', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={5}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Uncanny Luck X</label>
            <input
              type="number"
              value={uncannyLuckX}
              onChange={(e) => setField('uncannyLuckX', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={5}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Shielded X</label>
            <input
              type="number"
              value={shieldedX}
              onChange={(e) => setField('shieldedX', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={6}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Weak Point X</label>
            <input
              type="number"
              value={weakPointX}
              onChange={(e) => setField('weakPointX', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={2}
            />
          </div>

          {/* Boolean Keywords */}
          <div className="pt-2 space-y-1">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={deflect}
                onChange={(e) => setField('deflect', e.target.checked)}
                className="rounded"
              />
              <span>Deflect</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={block}
                onChange={(e) => setField('block', e.target.checked)}
                className="rounded"
              />
              <span>Block</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shienMastery}
                onChange={(e) => setField('shienMastery', e.target.checked)}
                className="rounded"
              />
              <span>Shien Mastery</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={soresuMastery}
                onChange={(e) => setField('soresuMastery', e.target.checked)}
                className="rounded"
              />
              <span>Soresu Mastery</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={djemSoMastery}
                onChange={(e) => setField('djemSoMastery', e.target.checked)}
                className="rounded"
              />
              <span>Djem So Mastery</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={outmaneuver}
                onChange={(e) => setField('outmaneuver', e.target.checked)}
                className="rounded"
              />
              <span>Outmaneuver</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={lowProfile}
                onChange={(e) => setField('lowProfile', e.target.checked)}
                className="rounded"
              />
              <span>Low Profile</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={impervious}
                onChange={(e) => setField('impervious', e.target.checked)}
                className="rounded"
              />
              <span>Impervious</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={immunePierce}
                onChange={(e) => setField('immunePierce', e.target.checked)}
                className="rounded"
              />
              <span>Immune: Pierce</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={immuneMeleePierce}
                onChange={(e) => setField('immuneMeleePierce', e.target.checked)}
                className="rounded"
              />
              <span>Immune: Melee Pierce</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={immuneBlast}
                onChange={(e) => setField('immuneBlast', e.target.checked)}
                className="rounded"
              />
              <span>Immune: Blast</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={duelistDefender}
                onChange={(e) => setField('duelistDefender', e.target.checked)}
                className="rounded"
              />
              <span>Duelist</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={backup}
                onChange={(e) => setField('backup', e.target.checked)}
                className="rounded"
              />
              <span>Backup</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={holdTheLine}
                onChange={(e) => setField('holdTheLine', e.target.checked)}
                className="rounded"
              />
              <span>Hold the Line</span>
            </label>
          </div>
        </div>
      </section>

      {/* Guardian Section */}
      <section>
        <h3 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">Guardian</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-sm mb-1">Guardian X</label>
            <input
              type="number"
              value={guardianX}
              onChange={(e) => setField('guardianX', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
              min={0}
              max={3}
            />
          </div>

          {guardianX > 0 && (
            <>
              <div>
                <label className="block text-sm mb-1">Guardian Die Color</label>
                <select
                  value={guardianDieColor}
                  onChange={(e) => setField('guardianDieColor', e.target.value as DefenseDieColor)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
                >
                  <option value={DefenseDieColor.White}>White</option>
                  <option value={DefenseDieColor.Red}>Red</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Guardian Surge</label>
                <select
                  value={guardianSurgeChart}
                  onChange={(e) => setField('guardianSurgeChart', e.target.value as DefenseSurgeChart)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
                >
                  <option value={DefenseSurgeChart.None}>None</option>
                  <option value={DefenseSurgeChart.ToBlock}>To Block</option>
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={guardianDeflect}
                  onChange={(e) => setField('guardianDeflect', e.target.checked)}
                  className="rounded"
                />
                <span>Guardian Deflect</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={guardianSoresuMastery}
                  onChange={(e) => setField('guardianSoresuMastery', e.target.checked)}
                  className="rounded"
                />
                <span>Guardian Soresu Mastery</span>
              </label>

              <div>
                <label className="block text-sm mb-1">Guardian Dodge Tokens</label>
                <input
                  type="number"
                  value={guardianDodgeTokens}
                  onChange={(e) => setField('guardianDodgeTokens', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
                  min={0}
                  max={5}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
