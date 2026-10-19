import type { Warband, Fighter } from '@/types/warband';
import type { Equipment, SpecialRule, Spell } from '@/types/ruleset';
import {
  calculateFighterStats,
  formatSpecialRuleName,
  cleanEquipmentName,
  calculateFighterGoldCost,
} from '@/domain/rulesEngine';

export interface ExportOptions {
  listType: 'regular' | 'compact' | 'minimal';
  format: 'discord' | 'plain';
  showStats: boolean;
  showRules: boolean;
  secretMode: boolean;
  includeInactive: boolean;
}

export function generateTextExport(
  warband: Warband,
  rulesetStore: any,
  options: ExportOptions,
): string {
  const faction = rulesetStore.getFaction(warband.factionId);
  const allegiance = warband.allegianceId ? rulesetStore.getAllegiance(warband.allegianceId) : null;
  const origins = (warband.selectedOriginIds || [])
    .map((oid: string) => faction?.origins?.find((o: any) => o.id === oid)?.name || oid)
    .filter(Boolean);

  const activeFighters = warband.fighters.filter((f) => f.status === 'Active');
  const reserveFighters = warband.fighters.filter((f) => f.status === 'Reserve');
  const graveyardFighters = warband.fighters.filter((f) => f.status === 'Graveyard');

  const totalPo = activeFighters.reduce((sum, f) => sum + calculateFighterGoldCost(f, rulesetStore), 0);
  const totalFighters = activeFighters.length;

  const lines: string[] = [];
  const isDiscord = options.format === 'discord';

  // 1. Header
  const titleGold = options.secretMode ? '' : ` [${totalPo} / ${warband.startingGoldPo} PO]`;
  if (isDiscord) {
    lines.push(`## ${warband.name}${titleGold}`);
    const metaParts = [
      `**Faction :** ${faction?.name || warband.factionId}`,
      allegiance ? `**Allégeance :** ${allegiance.name}` : null,
      origins.length > 0 ? `**Origine(s) :** ${origins.join(', ')}` : null,
      `**Effectif sur table :** ${totalFighters}/10`,
    ].filter(Boolean);
    lines.push(`*${metaParts.join(' • ')}*`);
  } else {
    lines.push(`=== ${warband.name.toUpperCase()}${titleGold} ===`);
    lines.push(`Faction : ${faction?.name || warband.factionId}`);
    if (allegiance) lines.push(`Allégeance : ${allegiance.name}`);
    if (origins.length > 0) lines.push(`Origine(s) : ${origins.join(', ')}`);
    lines.push(`Effectif sur table : ${totalFighters}/10`);
  }
  lines.push('');

  // Helper to format a single fighter
  function formatFighter(f: Fighter): string[] {
    const fLines: string[] = [];
    const stats = calculateFighterStats(f, warband, rulesetStore);

    // Items list
    const weapons: string[] = [];
    let armorName = '';
    const shields: string[] = [];
    const magicItems: string[] = [];

    for (const eq of f.equippedItems) {
      if (eq.isMagicItem) {
        if (!options.secretMode) {
          const mi = rulesetStore.getMagicItem(eq.equipmentId);
          magicItems.push(mi?.name || eq.equipmentId);
        }
      } else {
        const item = rulesetStore.getEquipment(eq.equipmentId);
        if (!item) continue;
        const cleanedName = cleanEquipmentName(item.name || eq.equipmentId, item.level);

        if (item.category === 'Armor') {
          armorName = cleanedName;
        } else if (item.category === 'Shield') {
          shields.push(cleanedName);
        } else {
          weapons.push(cleanedName);
        }
      }
    }

    // Deduplicate weapons with count
    const weaponCounts = new Map<string, number>();
    for (const w of weapons) {
      weaponCounts.set(w, (weaponCounts.get(w) || 0) + 1);
    }
    const formattedWeapons = Array.from(weaponCounts.entries()).map(([name, count]) =>
      count > 1 ? `${name} x${count}` : name,
    );

    // Specializations & Talents
    const talentNames: string[] = [];
    for (const sp of f.specializations) {
      const specDef = rulesetStore.getSpecialization(sp.specializationId);
      for (const tid of sp.acquiredTalentIds) {
        const tDef = specDef?.talents?.find((t: any) => t.id === tid);
        if (tDef) talentNames.push(tDef.name);
      }
    }

    // Spells
    const spells = (f.knownSpellIds || [])
      .map((sid: string) => rulesetStore.getSpell(sid)?.name || sid)
      .filter(Boolean);

    // Stats formatted string
    const statsStr = `M:${stats.mouvement}" C:${stats.combat} E:${stats.esquive} V:${stats.volonte} PV:${stats.pv}`;

    // Role / Rank label
    const fCost = calculateFighterGoldCost(f, rulesetStore);
    let roleLabel = '';
    if (f.officerRole === 'Leader') roleLabel = ' [Leader - 12 XP]';
    else if (f.officerRole === 'BrasDroit') roleLabel = ' [Bras droit - 6 XP]';
    else if (f.type === 'Monstre') roleLabel = ` [Monstre - ${fCost} PO]`;
    else if (f.type === 'Animal') roleLabel = ` [Animal - ${fCost} PO]`;
    else roleLabel = ` [R${f.rank}]`;

    if (options.listType === 'minimal') {
      const gearSummary = [
        ...formattedWeapons,
        armorName || null,
        ...shields,
        ...magicItems,
      ].filter(Boolean).join(', ');

      const line = isDiscord
        ? `- **${f.name}**${roleLabel}${gearSummary ? ` : *${gearSummary}*` : ''}`
        : `- ${f.name}${roleLabel}${gearSummary ? ` : ${gearSummary}` : ''}`;
      fLines.push(line);
      return fLines;
    }

    if (options.listType === 'compact') {
      const detailsList: string[] = [];
      if (options.showStats) detailsList.push(statsStr);
      if (formattedWeapons.length > 0) detailsList.push(formattedWeapons.join(', '));
      if (armorName) detailsList.push(`Armure : ${armorName}`);
      if (shields.length > 0) detailsList.push(`Bouclier : ${shields.join(', ')}`);
      if (talentNames.length > 0) detailsList.push(`Talents : ${talentNames.join(', ')}`);
      if (spells.length > 0) detailsList.push(`Sorts : ${spells.join(', ')}`);
      if (magicItems.length > 0) detailsList.push(`Objets : ${magicItems.join(', ')}`);

      if (isDiscord) {
        fLines.push(`- **${f.name}**${roleLabel}`);
        if (detailsList.length > 0) {
          fLines.push(` -# (${detailsList.join(' | ')})`);
        }
      } else {
        fLines.push(`- ${f.name}${roleLabel}`);
        if (detailsList.length > 0) {
          fLines.push(`   (${detailsList.join(' | ')})`);
        }
      }
      return fLines;
    }

    // Regular / Detailed mode
    if (isDiscord) {
      fLines.push(`- **${f.name}**${roleLabel}`);
      if (options.showStats) {
        fLines.push(` -# Profil : \`${statsStr}\``);
      }
      const equipParts = [
        formattedWeapons.length > 0 ? `**Armes :** ${formattedWeapons.join(', ')}` : null,
        armorName ? `**Armure :** ${armorName}` : null,
        shields.length > 0 ? `**Bouclier :** ${shields.join(', ')}` : null,
        magicItems.length > 0 ? `**Objets Magiques :** ${magicItems.join(', ')}` : null,
      ].filter(Boolean);

      if (equipParts.length > 0) {
        fLines.push(` -# Équipement : ${equipParts.join(' • ')}`);
      }

      if (options.showRules && talentNames.length > 0) {
        fLines.push(` -# Talents : ${talentNames.join(', ')}`);
      }
      if (spells.length > 0) {
        fLines.push(` -# Sorts : ${spells.join(', ')}`);
      }
    } else {
      fLines.push(`* ${f.name}${roleLabel}`);
      if (options.showStats) {
        fLines.push(`    Profil : ${statsStr}`);
      }
      if (formattedWeapons.length > 0) fLines.push(`    Armes : ${formattedWeapons.join(', ')}`);
      if (armorName) fLines.push(`    Armure : ${armorName}`);
      if (shields.length > 0) fLines.push(`    Bouclier : ${shields.join(', ')}`);
      if (options.showRules && talentNames.length > 0) fLines.push(`    Talents : ${talentNames.join(', ')}`);
      if (spells.length > 0) fLines.push(`    Sorts : ${spells.join(', ')}`);
      if (magicItems.length > 0) fLines.push(`    Objets : ${magicItems.join(', ')}`);
    }

    return fLines;
  }

  // 2. Officiers (Commandement)
  const officers = activeFighters.filter((f) => f.officerRole !== 'None');
  if (officers.length > 0) {
    lines.push(isDiscord ? `### Officiers de Commandement [${officers.length}/2]` : `--- OFFICIERS [${officers.length}/2] ---`);
    for (const off of officers) {
      lines.push(...formatFighter(off));
    }
    lines.push('');
  }

  // 3. Troupe sur table (Guerriers, Monstres, Animaux)
  const troops = activeFighters.filter((f) => f.officerRole === 'None');
  if (troops.length > 0) {
    lines.push(isDiscord ? `### Combattants de Troupe [${troops.length}]` : `--- TROUPE [${troops.length}] ---`);
    for (const tr of troops) {
      lines.push(...formatFighter(tr));
    }
    lines.push('');
  }

  // 4. Réserve (si activée)
  if (options.includeInactive && reserveFighters.length > 0) {
    lines.push(isDiscord ? `### Réserve [${reserveFighters.length}]` : `--- RÉSERVE [${reserveFighters.length}] ---`);
    for (const res of reserveFighters) {
      lines.push(...formatFighter(res));
    }
    lines.push('');
  }

  // 5. Cimetière (si activé)
  if (options.includeInactive && graveyardFighters.length > 0) {
    lines.push(isDiscord ? `### Cimetière & Pertes [${graveyardFighters.length}]` : `--- CIMETIÈRE & PERTES [${graveyardFighters.length}] ---`);
    for (const gy of graveyardFighters) {
      lines.push(...formatFighter(gy));
    }
    lines.push('');
  }

  // 6. Footer
  lines.push(isDiscord ? '*Créé avec "CTR Wargame Builder"*' : '-- Créé avec "CTR Wargame Builder" --');

  return lines.join('\n');
}
