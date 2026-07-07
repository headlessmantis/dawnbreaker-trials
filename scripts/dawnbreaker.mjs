// ═══════════════════════════════════════════════════════════
//  DAWNBREAKER TRIALS — Foundry VTT System
// ═══════════════════════════════════════════════════════════

// ── STAT CALCULATION HELPERS ─────────────────────────────────
function statMod(base) {
  return Math.floor(base / 3) - 3;
}

// Resolve the canvas token for an actor. Token-synthetic actors (unlinked
// duplicates) resolve to their exact token; world actors fall back to the
// first canvas match. Always prefer this over find-by-actor-id.
function _actorToken(actor) {
  if (!actor) return null;
  if (actor.isToken && actor.token) {
    const t = canvas.tokens?.placeables?.find(t => t.document.id === actor.token.id);
    if (t) return t;
  }
  return canvas.tokens?.placeables?.find(t => t.actor?.id === actor.id) ?? null;
}

function kennelMult(value, kennel) {
  if (kennel <= 0) return 0;
  return Math.floor(value * (kennel / 100));
}

// ── DATA MODEL ───────────────────────────────────────────────
class DawnbreakerCharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const req = { required: true, nullable: false };

    const statField = () => new fields.SchemaField({
      base:  new fields.NumberField({ ...req, initial: 10, integer: true }),
      bonus: new fields.NumberField({ ...req, initial: 0, integer: true }),
    });

    const manualStatField = () => new fields.SchemaField({
      base:  new fields.NumberField({ ...req, initial: 0, integer: true }),
      bonus: new fields.NumberField({ ...req, initial: 0, integer: true }),
      mod:   new fields.NumberField({ ...req, initial: 0, integer: true }),
    });

    const resourceField = () => new fields.SchemaField({
      current: new fields.NumberField({ ...req, initial: 0, integer: true }),
      bonus:   new fields.NumberField({ ...req, initial: 0, integer: true }),
      mod:     new fields.NumberField({ ...req, initial: 0, integer: true }),
      max:     new fields.NumberField({ ...req, initial: 0, integer: true }),
    });

    const abilityRow = () => new fields.SchemaField({
      name:        new fields.StringField({ initial: "" }),
      cost:        new fields.StringField({ initial: "" }),
      speed:       new fields.StringField({ initial: "" }),
      desc:        new fields.StringField({ initial: "" }),
      macroName:   new fields.StringField({ initial: "" }),
      rollFormula: new fields.StringField({ initial: "" }),
    });

    return {
      // Kennel
      kennel: new fields.NumberField({ ...req, initial: 100, integer: true, min: 0, max: 200 }),

      // Theme
      theme: new fields.StringField({ initial: "default" }),

      // Resources
      hp: resourceField(),
      ar: resourceField(),
      ki: resourceField(),

      // Core stats (base + bonus only; mod is calculated)
      stats: new fields.SchemaField({
        STR: statField(), CON: statField(), AGI: statField(),
        DEX: statField(), INT: statField(), SPR: statField(),
        // Compound stats still have base + bonus manually entered
        FOR: new fields.SchemaField({
          base:  new fields.NumberField({ ...req, initial: 10, integer: true }),
          bonus: new fields.NumberField({ ...req, initial: 0, integer: true }),
        }),
        WIL: new fields.SchemaField({
          base:  new fields.NumberField({ ...req, initial: 10, integer: true }),
          bonus: new fields.NumberField({ ...req, initial: 0, integer: true }),
        }),
        CHA: new fields.SchemaField({
          base:  new fields.NumberField({ ...req, initial: 10, integer: true }),
          bonus: new fields.NumberField({ ...req, initial: 0, integer: true }),
        }),
        MV: new fields.SchemaField({
          base:  new fields.NumberField({ ...req, initial: 0, integer: true }),
          bonus: new fields.NumberField({ ...req, initial: 0, integer: true }),
        }),
        AP: new fields.SchemaField({
          base:    new fields.NumberField({ ...req, initial: 0, integer: true }),
          bonus:   new fields.NumberField({ ...req, initial: 0, integer: true }),
          current: new fields.NumberField({ ...req, initial: 0, integer: true, min: -100, max: 100 }),
        }),
        // Manual mod stats
        ASS: manualStatField(),
        PR:  statField(),
        BRK: manualStatField(),
        MR:  statField(),
      }),

      // Affinities
      affinities: new fields.SchemaField({
        fire:   new fields.NumberField({ ...req, initial: 0, integer: true }),
        water:  new fields.NumberField({ ...req, initial: 0, integer: true }),
        spirit: new fields.NumberField({ ...req, initial: 0, integer: true }),
        air:    new fields.NumberField({ ...req, initial: 0, integer: true }),
        earth:  new fields.NumberField({ ...req, initial: 0, integer: true }),
      }),

      // Ability arrays
      abilities: new fields.SchemaField({
        mainActives:          new fields.ArrayField(abilityRow()),
        secondaryActives:     new fields.ArrayField(abilityRow()),
        secondaryActivesMax:  new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        reactions:            new fields.ArrayField(abilityRow()),
        reactionsMax:         new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        passives:             new fields.ArrayField(abilityRow()),
        passivesMax:          new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        movement:             new fields.ArrayField(abilityRow()),
        movementMax:          new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        tracker: new fields.ArrayField(new fields.SchemaField({
          class:      new fields.StringField({ initial: "" }),
          name:       new fields.StringField({ initial: "" }),
          cost:       new fields.StringField({ initial: "" }),
          speed:      new fields.StringField({ initial: "" }),
          skillLevel: new fields.StringField({ initial: "" }),
          effect:     new fields.StringField({ initial: "" }),
        })),
      }),

      // Bag
      bagType: new fields.SchemaField({
        name:     new fields.StringField({ initial: "" }),
        capacity: new fields.StringField({ initial: "" }),
      }),

      // Equipped weapon label (for HP Attack macro)
      equippedWeaponName: new fields.StringField({ initial: "" }),

      // Equipment
      equipment: new fields.ArrayField(new fields.SchemaField({
        equipped: new fields.BooleanField({ initial: false }),
        name:     new fields.StringField({ initial: "" }),
        qty:      new fields.NumberField({ ...req, initial: 1, integer: true, min: 0 }),
        note:     new fields.StringField({ initial: "" }),
      })),

      // Crafting
      crafting: new fields.SchemaField({
        ore: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        leather: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        fabric: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        wood: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        ores: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        rations: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        scrap: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        runes: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        ephi: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        amynti: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        carmine: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        essenceFire: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        essenceWater: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        essenceEarth: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        essenceAir: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        essenceSpirit: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
      }),

      // Classes & Studies
      classes: new fields.ArrayField(new fields.SchemaField({
        level: new fields.NumberField({ ...req, initial: 1, integer: true }),
        class: new fields.StringField({ initial: "" }),
        next:  new fields.StringField({ initial: "" }),
      })),
      studies: new fields.ArrayField(new fields.SchemaField({
        book:      new fields.BooleanField({ initial: false }),
        knowledge: new fields.StringField({ initial: "" }),
        bonus:     new fields.StringField({ initial: "" }),
      })),

      // Conditions
      conditions: new fields.ArrayField(new fields.SchemaField({
        name:     new fields.StringField({ initial: "" }),
        label:    new fields.StringField({ initial: "" }),
        duration: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
        instance: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
        effect:   new fields.StringField({ initial: "" }),
      })),

      // Combat modifiers
      precision: new fields.SchemaField({
        base:  new fields.NumberField({ ...req, initial: 0, integer: true }),
        bonus: new fields.NumberField({ ...req, initial: 0, integer: true }),
      }),
      accuracy: new fields.SchemaField({
        base:  new fields.NumberField({ ...req, initial: 0, integer: true }),
        bonus: new fields.NumberField({ ...req, initial: 0, integer: true }),
      }),

      // Weapon Proficiencies (each level = ATK/DMG +1, lowers glancing blow chance)
      weaponProf: new fields.SchemaField({
        sword:      new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        dagger:     new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        longspear:  new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        greatsword: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        mace:       new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        warhammer:  new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        axe:        new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        staff:      new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        tome:       new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        shield:     new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        bow:        new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        gun:        new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        gauntlet:   new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        whip:       new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        wand:       new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        dualwield:  new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        unarmed:    new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        other:      new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
      }),

      // Bio
      bio: new fields.SchemaField({
        class:      new fields.StringField({ initial: "" }),
        level:      new fields.NumberField({ ...req, initial: 1, integer: true, min: 1 }),
        rank:       new fields.StringField({ initial: "" }),
        clearance:  new fields.NumberField({ ...req, initial: 0, integer: true }),
        credits:    new fields.NumberField({ ...req, initial: 0, integer: true }),
        xp:         new fields.NumberField({ ...req, initial: 0, integer: true }),
        jp:         new fields.NumberField({ ...req, initial: 0, integer: true }),
        fame:       new fields.NumberField({ ...req, initial: 0, integer: true }),
        charName:   new fields.StringField({ initial: "" }),
        age:        new fields.StringField({ initial: "" }),
        race:       new fields.StringField({ initial: "" }),
        gender:     new fields.StringField({ initial: "" }),
        hair:       new fields.StringField({ initial: "" }),
        eyes:       new fields.StringField({ initial: "" }),
        height:     new fields.StringField({ initial: "" }),
        weight:     new fields.StringField({ initial: "" }),
        history:    new fields.StringField({ initial: "" }),
        firstIntro: new fields.StringField({ initial: "" }),
        notes:      new fields.StringField({ initial: "" }),
        custom: new fields.ArrayField(new fields.SchemaField({
          label: new fields.StringField({ initial: "" }),
          value: new fields.StringField({ initial: "" }),
        })),
      }),

      // CTB fields
      ctbAP:     new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      turnPhase: new fields.SchemaField({
        active: new fields.BooleanField({ initial: false }),
        moved:  new fields.BooleanField({ initial: false }),
        acted:  new fields.BooleanField({ initial: false }),
        startX: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        startY: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      }),
    };
  }

  // ── DERIVED DATA ────────────────────────────────────────────
  prepareDerivedData() {
    const s = this;
    const kennel = s.kennel ?? 100;
    const dead = kennel <= 0;
    s.deceased = dead;

    const fame = s.bio?.fame ?? 0;
    const level = s.bio?.level ?? 1;

    // ── Equipped item bonuses ─────────────────────────────
    const eb = s._equippedBonuses ?? {};

    // ── Core 6 stats ──────────────────────────────
    for (const key of ["STR","CON","AGI","DEX","INT","SPR"]) {
      const st = s.stats[key];
      const ebk = key.toLowerCase();
      st.equippedBonus = eb[ebk] ?? 0;
      st.mod = statMod(st.base);
      st.total = st.base + st.bonus + st.equippedBonus;
      st.totalRaw = st.total;
      st.totalKennel = dead ? 0 : Math.floor(st.total * (kennel / 100));
    }

    const { STR, CON, AGI, DEX, INT, SPR } = s.stats;

    // ── FOR ────────────────────────────────────────
    const forSt = s.stats.FOR;
    forSt.mod = STR.mod + CON.mod + AGI.mod;
    forSt.total = forSt.base + forSt.bonus + forSt.mod;
    forSt.totalKennel = dead ? 0 : Math.floor(forSt.total * (kennel / 100));

    // ── WIL ────────────────────────────────────────
    const wilSt = s.stats.WIL;
    wilSt.mod = DEX.mod + INT.mod + SPR.mod;
    wilSt.total = wilSt.base + wilSt.bonus + wilSt.mod;
    wilSt.totalKennel = dead ? 0 : Math.floor(wilSt.total * (kennel / 100));

    // ── CHA (uses pre-kennel WIL total) ───────────
    const chaSt = s.stats.CHA;
    chaSt.mod = INT.mod + wilSt.total + fame;
    chaSt.total = chaSt.base + chaSt.bonus + chaSt.mod;
    chaSt.totalKennel = chaSt.total; // CHA not kennel affected

    // ── MV ────────────────────────────────────────
    const mvSt = s.stats.MV;
    mvSt.mod = Math.ceil(AGI.mod / 3);
    mvSt.total = mvSt.base + mvSt.bonus + mvSt.mod;
    mvSt.totalKennel = mvSt.total; // MV not kennel affected

    // ── AP ────────────────────────────────────────
    const apSt = s.stats.AP;
    apSt.mod = Math.ceil(AGI.mod / 2);
    apSt.total = apSt.base + apSt.bonus + apSt.mod;
    apSt.totalKennel = apSt.total; // AP not kennel affected
    apSt.pct = Math.max(0, Math.min(100, apSt.current ?? 0));

    // ── Manual mod stats ──────────────────────────
    for (const key of ["ASS","BRK"]) {
      const st  = s.stats[key];
      const ebk = key.toLowerCase();
      st.hasMod = true;
      st.total = st.base + st.bonus + st.mod + (eb[ebk] ?? 0);
      st.totalKennel = st.total;
    }

    // ── PR = Base + Bonus + FOR Total + equipped bonus ────
    const prSt = s.stats.PR;
    prSt.hasMod = false;
    prSt.mod = forSt.total;
    prSt.total = prSt.base + prSt.bonus + forSt.total + (eb.pr ?? 0);
    prSt.totalKennel = dead ? 0 : Math.floor(prSt.total * (kennel / 100));

    // ── MR = Base + Bonus + WIL Total + equipped bonus ───
    const mrSt = s.stats.MR;
    mrSt.hasMod = false;
    mrSt.mod = wilSt.total;
    mrSt.total = mrSt.base + mrSt.bonus + wilSt.total + (eb.mr ?? 0);
    mrSt.totalKennel = dead ? 0 : Math.floor(mrSt.total * (kennel / 100));

    // ── HP ────────────────────────────────────────
    const conTotal = CON.total;
    const hpBase = Math.floor((9 + level) + (conTotal / 2)) * 2;
    s.hp.base = hpBase;
    s.hp.max = Math.max(0, dead ? 0 : Math.floor((hpBase + s.hp.bonus + (eb.hp ?? 0)) * (kennel / 100))) + s.hp.mod;

    // ── AR ────────────────────────────────────────
    s.ar.base = 10;
    s.ar.max = Math.max(0, 10 + s.ar.bonus + (eb.ar ?? 0)) + s.ar.mod;

    // ── KI ────────────────────────────────────────
    const intTotal = INT.total;
    const sprTotal = SPR.total;
    const kiBase = 10 + (intTotal - 10) + (sprTotal - 10);
    s.ki.base = kiBase;
    s.ki.max = Math.max(0, dead ? 0 : Math.floor((kiBase + s.ki.bonus + (eb.ki ?? 0)) * (kennel / 100))) + s.ki.mod;
  }
}

// ── ACTOR CLASS ──────────────────────────────────────────────
class DawnbreakerActor extends Actor {

  prepareData() {
    super.prepareData();

    // Unlinked duplicate tokens share the base actor's name — surface the
    // TOKEN's name (e.g. "Crystal Burrower 3") everywhere actor.name is
    // displayed: chat cards, dialogs, target lists, CTB panel, damage logs.
    if (this.isToken && this.token?.name && this.name !== this.token.name) {
      this.name = this.token.name;
    }

    // Apply equipped item bonuses to already-derived character stats
    if (this.type === 'character' && this.system) {
      const eb = { dam:0, str:0, con:0, agi:0, dex:0, int:0, spr:0,
                   for:0, wil:0, cha:0, mv:0,  ap:0,  ass:0, pr:0,
                   brk:0, mr:0,  ar:0,  hp:0,  ki:0 };
      for (const item of this.items) {
        const s = item.system;
        if (!s?.equipped) continue;
        if (s.bonuses) { for (const key of Object.keys(eb)) eb[key] += (s.bonuses[key] ?? 0); }
        const upgradeLevel = s.upgradeLevel ?? 0;
        const docType = item.type ?? '';
        const subType = s.itemType ?? docType;
        const isWeaponDoc = docType === 'weapon' || subType === 'weapon';
        const isOffhandDoc = docType === 'offhand' || subType === 'offhand';
        const isArmorDoc   = docType === 'armor'   || subType === 'armor';
        if (isWeaponDoc || isOffhandDoc) {
          const wPathId = item.getFlag?.('dawnbreaker-trials', 'growthPath') ?? null;
          eb.dam += wPathId ? 0 : (2 + upgradeLevel);
          if (wPathId) {
            const wb = _getPathLevelGrowth(wPathId, upgradeLevel);
            for (const [k, v] of Object.entries(wb)) eb[k] = (eb[k] ?? 0) + v;
          }
        }
        else if (isArmorDoc) {
          const slot = s.slot ?? '';
          const fp = s.forgePath ?? '';
          const pathId = item.getFlag?.('dawnbreaker-trials', 'growthPath') ?? null;
          const ab = _getArmorUpgradeBonuses(fp, slot, upgradeLevel, pathId);
          for (const [k, v] of Object.entries(ab)) eb[k] = (eb[k] ?? 0) + v;
        }
        const enhancements = item.getFlag('dawnbreaker-trials', 'enhancements') ?? [];
        for (const enh of enhancements) { if (enh?.stat && eb[enh.stat] !== undefined) eb[enh.stat] += enh.value; }
        const slot0 = item.getFlag('dawnbreaker-trials', 'slot0') ?? {};
        if (slot0.stat && eb[slot0.stat] !== undefined) eb[slot0.stat] += slot0.value ?? 0;
      }
      this.system._equippedBonuses = eb;
      const ss = this.system.stats;
      const kennel = this.system.kennel ?? 100;
      const dead   = this.system.deceased ?? false;
      for (const key of ['STR','CON','AGI','DEX','INT','SPR','FOR','WIL']) {
        const st = ss?.[key]; if (!st) continue;
        const ebk = key.toLowerCase();
        st.equippedBonus = (st.equippedBonus ?? 0) + (eb[ebk] ?? 0);
        st.total = (st.total ?? 0) + (eb[ebk] ?? 0);
        st.totalRaw = st.total;
        st.totalKennel = dead ? 0 : Math.floor(st.total * (kennel / 100));
      }
      for (const key of ['ASS','BRK','CHA']) {
        const st = ss?.[key]; if (!st) continue;
        st.total = (st.total ?? 0) + (eb[key.toLowerCase()] ?? 0);
        st.totalKennel = st.total;
      }
      if (ss?.PR) { ss.PR.total = (ss.PR.total ?? 0) + (eb.pr ?? 0); ss.PR.totalKennel = dead ? 0 : Math.floor(ss.PR.total * (kennel / 100)); }
      if (ss?.MR) { ss.MR.total = (ss.MR.total ?? 0) + (eb.mr ?? 0); ss.MR.totalKennel = dead ? 0 : Math.floor(ss.MR.total * (kennel / 100)); }
      if (ss?.MV) { ss.MV.total = (ss.MV.total ?? 0) + (eb.mv ?? 0); ss.MV.totalKennel = ss.MV.total; }
      if (ss?.AP) { ss.AP.total = (ss.AP.total ?? 0) + (eb.ap ?? 0); ss.AP.totalKennel = ss.AP.total; }
      this.system.hp.max = (this.system.hp.max ?? 0) + (eb.hp ?? 0);
      this.system.ar.max = (this.system.ar.max ?? 0) + (eb.ar ?? 0);
      this.system.ki.max = (this.system.ki.max ?? 0) + (eb.ki ?? 0);
      // Dual Wield bonus
      const dualWieldProf = this.system.weaponProf?.dualwield ?? 0;
      if (dualWieldProf > 0) {
        const mainW = this.items.find(i => i.type === 'weapon' && i.system?.equipped && i.system.slot !== 'offhand')
                   ?? this.items.find(i => i.type === 'weapon' && i.system?.equipped);
        const offW  = this.items.find(i => i.type === 'weapon' && i.system?.equipped && i.system.slot === 'offhand');
        if (mainW && offW) {
          const offType = offW.system.weaponType?.toLowerCase() ?? '';
          const offProficient = (this.system.weaponProf?.[offType] ?? 0) > 0;
          this.system._dualWieldDam = dualWieldProf;
          this.system._dualWieldPrecision = offProficient ? dualWieldProf : 0;
        } else { this.system._dualWieldDam = 0; this.system._dualWieldPrecision = 0; }
      }
      // Equipped weapon references (used by attack macros)
      const _itemDam = (it) => {
        const s = it.system; const lvl = s?.upgradeLevel ?? 0;
        const base = s?.bonuses?.dam ?? 0;
        const enhDam = (it.getFlag('dawnbreaker-trials','enhancements') ?? []).filter(e => e?.stat === 'dam').reduce((sum,e) => sum + e.value, 0);
        const pathId = it.getFlag?.('dawnbreaker-trials','growthPath') ?? null;
        const fixedDam = pathId ? 0 : (2 + lvl);
        const growthDam = pathId ? (_getPathLevelGrowth(pathId, lvl).dam ?? 0) : 0;
        return base + fixedDam + growthDam + enhDam;
      };
      const pw = this.items.find(i => i.type === 'weapon' && i.system?.equipped && i.system.slot !== 'offhand')
              ?? this.items.find(i => i.type === 'weapon' && i.system?.equipped)
              ?? this.items.find(i => i.type === 'offhand' && i.system?.equipped) ?? null;
      this.system._equippedWeapon = pw ? {
        id: pw.id, name: pw.name, weaponType: pw.system.weaponType ?? '',
        attackStat: pw.system.attackStat ?? 'STR', reach: pw.system.reach ?? 1,
        dam: _itemDam(pw), animationFile: pw.system.animationFile ?? '',
        animationScale: pw.system.animationScale ?? 1.0, animationSound: pw.system.animationSound ?? '',
      } : null;
      const ohw = this.items.find(i => i.type === 'weapon' && i.system?.equipped && i.system.slot === 'offhand')
               ?? this.items.find(i => i.type === 'offhand' && i.system?.equipped) ?? null;
      this.system._equippedOffHandWeapon = ohw ? {
        id: ohw.id, name: ohw.name, weaponType: ohw.system.weaponType ?? '',
        attackStat: ohw.system.attackStat ?? 'STR', reach: ohw.system.reach ?? 1,
        dam: _itemDam(ohw), animationFile: ohw.system.animationFile ?? '',
        animationScale: ohw.system.animationScale ?? 1.0, animationSound: ohw.system.animationSound ?? '',
      } : null;
    }

    // Shimmering Scales — apply +5 PR/MR to derived total when Shimmer condition is active
    if (this.system) {
      const hasShimmer = (this.system.conditions ?? []).some(c => c.label === "shimmer");
      if (hasShimmer) {
        if (this.type === "character") {
          const pr = this.system.stats?.PR;
          const mr = this.system.stats?.MR;
          const kennel = this.system.kennel ?? 100;
          const dead   = this.system.deceased ?? false;
          if (pr) {
            pr.total = (pr.total ?? 0) + 5;
            pr.totalKennel = dead ? 0 : Math.floor(pr.total * (kennel / 100));
          }
          if (mr) {
            mr.total = (mr.total ?? 0) + 5;
            mr.totalKennel = dead ? 0 : Math.floor(mr.total * (kennel / 100));
          }
        } else if (this.type === "npc") {
          if (this.system.stats) {
            this.system.stats._prTotal = (this.system.stats.PR ?? 0) + 5;
            this.system.stats._mrTotal = (this.system.stats.MR ?? 0) + 5;
          }
        }
      }
    }

    // AURA condition — allies given this condition by Light Aura get PR/MR bonus
    // effect field format: "pr_mr:X" where X is the bonus value
    if (this.system) {
      const auraCond = (this.system.conditions ?? []).find(c => c.label === "aura" || c.name?.toLowerCase() === "aura");
      if (auraCond) {
        const match = String(auraCond.effect ?? "").match(/pr_mr:(\d+)/);
        const bonus = match ? parseInt(match[1]) : 0;
        if (bonus > 0) {
          if (this.type === "character") {
            const pr = this.system.stats?.PR;
            const mr = this.system.stats?.MR;
            const kennel = this.system.kennel ?? 100;
            const dead   = this.system.deceased ?? false;
            if (pr) {
              pr.total = (pr.total ?? 0) + bonus;
              pr.totalKennel = dead ? 0 : Math.floor(pr.total * (kennel / 100));
            }
            if (mr) {
              mr.total = (mr.total ?? 0) + bonus;
              mr.totalKennel = dead ? 0 : Math.floor(mr.total * (kennel / 100));
            }
          } else if (this.type === "npc" && this.system.stats) {
            this.system.stats._prTotal = (this.system.stats._prTotal ?? this.system.stats.PR ?? 0) + bonus;
            this.system.stats._mrTotal = (this.system.stats._mrTotal ?? this.system.stats.MR ?? 0) + bonus;
          }
        }
      }
    }

    // Write derived max values back so external tools (HUD etc.) can read them
    if (this.type === "character" && this.system && this.id) {
      const s = this.system;
      const updates = {};
      if (s.hp?.max !== undefined && s.hp.max !== this._source?.system?.hp?.max) updates["system.hp.max"] = s.hp.max;
      if (s.ar?.max !== undefined && s.ar.max !== this._source?.system?.ar?.max) updates["system.ar.max"] = s.ar.max;
      if (s.ki?.max !== undefined && s.ki.max !== this._source?.system?.ki?.max) updates["system.ki.max"] = s.ki.max;
      if (Object.keys(updates).length > 0 && !this._preparingData) {
        this._preparingData = true;
        this.update(updates).finally(() => { this._preparingData = false; });
      }
    }
  }

  async _onUpdate(data, options, userId) {
    await super._onUpdate(data, options, userId);

    // Sync status effects whenever conditions change — for token-synthetic
    // actors resolve the exact token, not the first duplicate sharing our id
    const newConditions = foundry.utils.getProperty(data, "system.conditions");
    if (!newConditions) return;

    const token = (this.isToken && this.token
      ? canvas.tokens?.placeables?.find(t => t.document.id === this.token.id)
      : null) ?? canvas.tokens?.placeables?.find(t => t.actor?.id === this.id);
    if (!token) return;

    // Build set of labels that SHOULD be active
    const shouldHave = new Set(newConditions.filter(c => c.label).map(c => c.label));

    // Remove effects that are no longer in conditions
    for (const ae of this.effects ?? []) {
      for (const status of ae.statuses ?? []) {
        if (CONFIG.statusEffects?.some(e => e.id === status) && !shouldHave.has(status)) {
          try { await ae.delete(); } catch(e) {}
          break;
        }
      }
    }

    // Add effects that are in conditions but not yet active
    for (const label of shouldHave) {
      const already = this.effects?.some(e => e.statuses?.has(label));
      if (!already) {
        const effectDef = CONFIG.statusEffects?.find(e => e.id === label);
        if (effectDef) {
          try { await token.document.toggleActiveEffect(effectDef, { active: true }); } catch(e) {}
        }
      }
    }
  }

  // Makes hp/ar/ki available as token attribute bars
  static getDefaultArtwork(actorData) {
    return super.getDefaultArtwork(actorData);
  }

  // Expose tracked attributes for token bar picker
  static getTrackedAttributes(data, _path=[]) {
    return {
      bar: [
        ["hp"],
        ["ar"],
        ["ki"],
      ],
      value: [
        ["kennel"],
        ["bio", "level"],
        ["bio", "fame"],
      ]
    };
  }

  // Map bar attributes to current/max pairs
  getBarAttribute(barName, {alternative}={}) {
    const s = this.system;
    const bar = this.prototypeToken?.[barName]?.attribute;
    if (bar === "hp")  return { type: "bar", attribute: "hp",  value: s.hp?.current  ?? 0, max: s.hp?.max  ?? 0 };
    if (bar === "ar")  return { type: "bar", attribute: "ar",  value: s.ar?.current  ?? 0, max: s.ar?.max  ?? 0 };
    if (bar === "ki")  return { type: "bar", attribute: "ki",  value: s.ki?.current  ?? 0, max: s.ki?.max  ?? 0 };
    return super.getBarAttribute(barName, {alternative});
  }

  getRollData() {
    const data = super.getRollData();
    const s = this.system;

    if (this.type !== "character" && this.type !== "companion") return data;

    // ── Flat stat references: @str.mod, @str.total etc ──
    const statKeys = ["STR","CON","AGI","DEX","INT","SPR","FOR","WIL","CHA","MV","AP","ASS","PR","BRK","MR"];
    for (const key of statKeys) {
      const st = s.stats[key];
      const k = key.toLowerCase();
      data[k] = {
        base:       st.base       ?? 0,
        bonus:      st.bonus      ?? 0,
        mod:        st.mod        ?? 0,
        total:      st.total      ?? 0,
        totalKennel: st.totalKennel ?? 0,
      };
    }

    // ── Resources ──
    data.hp = {
      current: s.hp.current,
      bonus:   s.hp.bonus,
      mod:     s.hp.mod,
      base:    s.hp.base  ?? 0,
      max:     s.hp.max   ?? 0,
    };
    data.ar = {
      current: s.ar.current,
      bonus:   s.ar.bonus,
      mod:     s.ar.mod,
      base:    10,
      max:     s.ar.max ?? 0,
    };
    data.ki = {
      current: s.ki.current,
      bonus:   s.ki.bonus,
      mod:     s.ki.mod,
      base:    s.ki.base ?? 0,
      max:     s.ki.max  ?? 0,
    };

    // ── Affinities ──
    data.aff = { ...s.affinities };

    // ── Misc ──
    data.kennel = s.kennel;
    data.level  = s.bio?.level ?? 1;
    data.fame   = s.bio?.fame  ?? 0;

    // ── Weapon Proficiencies ──
    data.prof = { ...(s.weaponProf ?? {}) };
    const PROF_LABELS = { sword:"Sword", dagger:"Dagger", longspear:"Longspear", greatsword:"Greatsword", mace:"Mace", warhammer:"Warhammer", axe:"Axe", staff:"Staff", tome:"Tome", shield:"Shield", bow:"Bows", gun:"Gun", gauntlet:"Gauntlet", whip:"Whip", wand:"Wand", dualwield:"Dual Wield", unarmed:"Unarmed", other:"Other" };
    data.weaponProfDisplay = Object.entries(s.weaponProf ?? {}).map(([key, level]) => ({ key, label: PROF_LABELS[key] ?? key, level }));

    // ── Equipped weapon info ──
    const equippedWeapon = this.items.find(i => i.type === "weapon" && i.system?.equipped)
                        ?? this.items.find(i => i.type === "offhand" && i.system?.equipped);
    if (equippedWeapon) {
      const wt          = equippedWeapon.system.weaponType ?? "";
      const atk         = equippedWeapon.system.attackStat ?? "STR";
      const lvl         = equippedWeapon.system.upgradeLevel ?? 0;
      const wPathId     = equippedWeapon.getFlag?.("dawnbreaker-trials","growthPath") ?? null;
      const fixedDam    = wPathId ? 0 : (2 + lvl);
      const pathGrowthDam = wPathId ? (_getPathLevelGrowth(wPathId, lvl).dam ?? 0) : 0;
      const baseDam     = (equippedWeapon.system.bonuses?.dam ?? 0) + fixedDam + pathGrowthDam;
      const enhDam      = (equippedWeapon.getFlag("dawnbreaker-trials","enhancements") ?? [])
                            .filter(e => e?.stat === "dam").reduce((sum,e) => sum + e.value, 0);
      const dualWieldDam = s._dualWieldDam ?? 0;
      const dam         = baseDam + enhDam + dualWieldDam;
      const profLevel   = s.weaponProf?.[wt] ?? 0;
      data.weapon = {
        name:            equippedWeapon.name,
        type:            wt,
        attackStat:      atk,
        dam:             dam,
        profLevel:       profLevel,
        profBonus:       profLevel,
        atkBonus:        profLevel,
        dmgBonus:        dam + profLevel,
        hpDmgBonus:      profLevel + dualWieldDam,
        attackStatTotal: data[atk.toLowerCase()]?.totalKennel ?? 0,
      };
    } else {
      // No weapon item equipped (e.g. companions/pets) — auto-attack off whichever core stat is highest
      let bestStat = "STR", bestTotal = -Infinity;
      for (const k of ["STR","CON","AGI","DEX","INT","SPR"]) {
        const t = data[k.toLowerCase()]?.totalKennel ?? 0;
        if (t > bestTotal) { bestTotal = t; bestStat = k; }
      }
      data.weapon = { name:"", type:"", attackStat:bestStat, dam:0, profLevel:0, profBonus:0, atkBonus:0, dmgBonus:0, hpDmgBonus:0, attackStatTotal:bestTotal };
    }

    return data;
  }
}


class DawnbreakerActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dawnbreaker", "sheet", "actor"],
      template: "systems/dawnbreaker-trials/templates/actor-sheet.html",
      width: 1200,
      height: 1000,
      resizable: false,
      tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "core" }],
      scrollY: [".sheet-body.active"],
    });
  }
  get title() { return this.token?.name ?? this.actor.name; }

  getData() {
    const context = super.getData();
    const actor = this.actor;
    context.system = actor.system;
    context.theme  = actor.system.theme ?? "default";

    // Pass owned items sorted by type for the inventory tab
    const allItems = actor.items.contents.map((i, idx) => {
      const rarity = i.system?.rarity ?? "basic";
      const level  = i.system?.upgradeLevel ?? 0;
      const itype  = i.type ?? i.system?.itemType ?? "";
      // Build bonus string the same way the paperdoll does
      const bTotals = {};
      const b = i.system?.bonuses ?? {};
      const _isWeapon = itype === "weapon" || itype === "offhand" || i.system?.itemType === "weapon";
      for (const [k, v] of Object.entries(b)) if (v) bTotals[k] = (bTotals[k] ?? 0) + v;
      if (_isWeapon) {
        const wPathId = i.getFlag?.("dawnbreaker-trials", "growthPath") ?? null;
        if (!wPathId) bTotals.dam = (bTotals.dam ?? 0) + 2 + level;
        if (wPathId) {
          const wb = _getPathLevelGrowth(wPathId, level);
          for (const [k, v] of Object.entries(wb)) bTotals[k] = (bTotals[k] ?? 0) + v;
        }
      } else if (itype === "armor" || i.system?.itemType === "armor") {
        const slot   = i.system?.slot ?? "";
        const fp     = i.system?.forgePath ?? "";
        const pathId = i.getFlag?.("dawnbreaker-trials", "growthPath") ?? null;
        const ab = _getArmorUpgradeBonuses(fp, slot, level, pathId);
        for (const [k, v] of Object.entries(ab)) bTotals[k] = (bTotals[k] ?? 0) + v;
      }
      const slot0f = i.getFlag("dawnbreaker-trials", "slot0") ?? {};
      // slot0 for weapons represents the base DAM (already in bTotals as 2+level); skip to avoid double-count.
      // For non-weapon/armor items, slot0 can hold a GM-set bonus stat.
      if (slot0f.stat && !_isWeapon) bTotals[slot0f.stat] = (bTotals[slot0f.stat] ?? 0) + (slot0f.value ?? 0);
      for (const enh of (i.getFlag("dawnbreaker-trials", "enhancements") ?? [])) {
        if (enh?.stat) bTotals[enh.stat] = (bTotals[enh.stat] ?? 0) + enh.value;
      }
      const bonusStr = Object.entries(bTotals).filter(([,v]) => v).map(([k,v]) => `${k.toUpperCase()} +${v}`).join("  ");
      return {
        id:        i.id,
        name:      i.name,
        img:       i.img,
        type:      i.type,
        equipped:  i.system.equipped ?? false,
        qty:       i.system.qty ?? 1,
        weaponType: i.system.weaponType ?? "",
        attackStat: i.system.attackStat ?? "",
        effect:     i.system.effect ?? i.system.desc ?? "",
        armorSlot:  i.system.slot ?? i.system.armorSlot ?? "",
        isWeapon:   ["weapon","offhand"].includes(i.type),
        isArmor:    i.type === "armor",
        isAbility:  i.type === "ability",
        stored:     i.getFlag("dawnbreaker-trials", "stored") ?? false,
        globalIndex: idx + 1,
        rarity,
        rarityColor: _rarityColor(rarity),
        upgradeLevel: level,
        bonusStr,
      };
    });
    const carriedItems = allItems.filter(i => !i.stored && !i.isAbility);
    const storedItems  = allItems.filter(i => i.stored && !i.isAbility);
    context.weapons    = carriedItems.filter(i => i.isWeapon);
    context.armors     = carriedItems.filter(i => i.isArmor);
    context.abilities  = allItems.filter(i => i.isAbility);
    context.otherItems = carriedItems.filter(i => !i.isWeapon && !i.isArmor);
    context.storedItems = storedItems;
    // Renumber globalIndex in display order: weapons → armors → others
    let displayIdx = 1;
    for (const item of [...context.weapons, ...context.armors, ...context.otherItems]) item.globalIndex = displayIdx++;
    context.ownedItems = allItems;

    // Build paperdoll from equipped items
    const SLOT_MAP = {
      weapon: "mainHand", offhand: "offHand",
      head: "head", chest: "body", legs: "legs", accessory: "accessory",
    };
    const paperdoll = { mainHand: null, offHand: null, head: null, body: null, legs: null, accessory: null };
    for (const item of actor.items.contents) {
      if (!item.system.equipped) continue;
      // Determine slot — use system.slot first, fall back to item.type for weapons
      const rawSlot  = item.system.slot?.toLowerCase() || item.type?.toLowerCase();
      const key      = SLOT_MAP[rawSlot];
      if (!key) continue;
      const bonusLines = [];
      // Start with manually-set base bonuses
      const b = item.system.bonuses ?? {};
      const bTotals = {};
      for (const [k, v] of Object.entries(b)) bTotals[k] = (bTotals[k] ?? 0) + v;
      // Add slot-0 fixed bonus (weapon DAM scaling or armor slot scaling)
      const lvl = item.system.upgradeLevel ?? 0;
      const itype = item.type ?? item.system?.itemType ?? "";
      if (itype === "weapon" || itype === "offhand" || item.system?.itemType === "weapon" || item.system?.itemType === "offhand") {
        const wPathId = item.getFlag?.("dawnbreaker-trials", "growthPath") ?? null;
        if (!wPathId) bTotals.dam = (bTotals.dam ?? 0) + 2 + lvl;
        if (wPathId) {
          const wb = _getPathLevelGrowth(wPathId, lvl);
          for (const [k, v] of Object.entries(wb)) bTotals[k] = (bTotals[k] ?? 0) + v;
        }
      } else if (itype === "armor" || item.system?.itemType === "armor") {
        const slot   = item.system.slot ?? "";
        const fp     = item.system.forgePath ?? "";
        const pathId = item.getFlag?.("dawnbreaker-trials", "growthPath") ?? null;
        const ab = _getArmorUpgradeBonuses(fp, slot, lvl, pathId);
        for (const [k, v] of Object.entries(ab)) bTotals[k] = (bTotals[k] ?? 0) + v;
      }
      // Add enhancement flag bonuses
      const enhs = item.getFlag("dawnbreaker-trials", "enhancements") ?? [];
      for (const enh of enhs) { if (enh?.stat) bTotals[enh.stat] = (bTotals[enh.stat] ?? 0) + enh.value; }
      for (const [k, v] of Object.entries(bTotals)) { if (v && v !== 0) bonusLines.push(`${k.toUpperCase()} +${v}`); }
      if (!paperdoll[key]) {
        const pdRarity = item.system?.rarity ?? "basic";
        paperdoll[key] = { id: item.id, name: item.name, img: item.img, bonuses: bonusLines.join(" | "), rarityColor: _rarityColor(pdRarity), upgradeLevel: lvl };
      }
    }
    context.paperdoll = paperdoll;

    // Build weapon proficiency display array for the Classes tab
    const s = actor.system;
    const PROF_LABELS = { sword:"Sword", dagger:"Dagger", longspear:"Longspear", greatsword:"Greatsword", mace:"Mace", warhammer:"Warhammer", axe:"Axe", staff:"Staff", tome:"Tome", shield:"Shield", bow:"Bows", gun:"Gun", gauntlet:"Gauntlet", whip:"Whip", wand:"Wand", dualwield:"Dual Wield", unarmed:"Unarmed", other:"Other" };
    context.weaponProfDisplay = Object.entries(s.weaponProf ?? {}).map(([key, level]) => ({ key, label: PROF_LABELS[key] ?? key, level }));

    // Precision / Accuracy totals (base + bonus + dual wield bonuses)
    context.precisionTotal = (s.precision?.base ?? 0) + (s.precision?.bonus ?? 0) + (s._dualWieldPrecision ?? 0);
    context.accuracyTotal  = (s.accuracy?.base ?? 0) + (s.accuracy?.bonus ?? 0);
    // Derived roll thresholds shown on sheet
    context.critThreshold  = Math.max(1, 20 - context.precisionTotal);

    // Damage preview
    const w           = this.actor.getRollData().weapon ?? {};
    const profLevel   = w.profLevel ?? 0;

    // glanceBaseCap includes weapon proficiency since prof reduces glancing blow chance
    context.glanceBaseCap  = Math.max(0, 6 - context.accuracyTotal - profLevel);

    // HP Attack: attack stat + weapon dam + prof + Ironhide's Fury if active (AR < 50%)
    const hasIronhide = this.actor.items.some(i => i.type === "ability" && i.name.toLowerCase().includes("ironhide"))
      || Object.values(s.abilities ?? {}).some(arr => Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("ironhide")));
    const ironhideAR    = s.ar?.current ?? 0;
    const ironhideARMax = s.ar?.max ?? ironhideAR;
    const ironhideBonus = hasIronhide && ironhideARMax > 0 && ironhideAR / ironhideARMax < 0.5 ? 5 : 0;
    context.hpAttackPreview = (w.attackStatTotal ?? 0) + (w.dam ?? 0) + profLevel + ironhideBonus;

    // AR Attack: BRK total + prof + Battlecraze hits if active
    const bcData           = this.actor.getFlag("dawnbreaker-trials", "battlecrazeHits");
    const battlecrazeBonus = bcData?.active ? ((bcData.hits ?? 0) * 2) : 0;
    context.arAttackPreview = (s.stats?.BRK?.total ?? 0) + profLevel + battlecrazeBonus;

    context.hpPct = s.hp?.max > 0 ? Math.min(100, Math.round((s.hp.current / s.hp.max) * 100)) : 0;
    context.arPct = s.ar?.max > 0 ? Math.min(100, Math.round((s.ar.current / s.ar.max) * 100)) : 0;
    context.kiPct = s.ki?.max > 0 ? Math.min(100, Math.round((s.ki.current / s.ki.max) * 100)) : 0;

    // Portrait variants for the HUD
    const allPortraitVars = game.settings.get("dawnbreaker-trials", "portraitVariants") ?? {};
    context.portraitVariants = allPortraitVars[actor.id] ?? {};

    // Enrich ability arrays with macro icon images for the abilities tab
    const _macroImg = (name, macroName) => {
      const mn = macroName || name;
      return game.macros?.find(m => m.name === mn)?.img ?? "icons/svg/mystery-man.svg";
    };
    const _enrich = (arr) => (arr ?? []).map(e => ({ ...e, macroImg: _macroImg(e.name, e.macroName) }));
    context.abilitiesEnriched = {
      mainActives:      _enrich(s.abilities?.mainActives),
      secondaryActives: _enrich(s.abilities?.secondaryActives),
      reactions:        _enrich(s.abilities?.reactions),
      passives:         _enrich(s.abilities?.passives),
      movement:         _enrich(s.abilities?.movement),
      tracker:          _enrich(s.abilities?.tracker),
    };

    return context;
  }

  get template() {
    return "systems/dawnbreaker-trials/templates/actor-sheet.html";
  }

  async _render(force, options) {
    await super._render(force, options);
    _bumpZIndexAboveOthers(this);
    if (force) {
      const partyEl = document.getElementById("dbt-party-root");
      if (partyEl) {
        const rect = partyEl.getBoundingClientRect();
        this.setPosition({ left: rect.right + 6, top: rect.top });
      }
    }
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Apply theme class on open
    this._applyTheme(html, this.actor.system.theme ?? "default");

    if (!this.isEditable) return;

    // Theme change
    html.find(".theme-select").change(ev => {
      const theme = ev.currentTarget.value;
      this._applyTheme(html, theme);
      this.actor.update({ "system.theme": theme });
    });

    // ── Owned item listeners ──────────────────────────────
    // Open item sheet on name click
    html.find(".item-name-link").click(ev => {
      const id   = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      const item = this.actor.items.get(id);
      if (!item) return;
      const sheet = item.sheet;
      sheet.render(true);
      // Position to the right of the character sheet after it renders
      const sheetEl = this.element[0];
      if (sheetEl) {
        const rect = sheetEl.getBoundingClientRect();
        const left = rect.right + 10;
        const top  = rect.top;
        sheet._restoreScrollPositions?.();
        setTimeout(() => sheet.setPosition({ left, top }), 50);
      }
    });

    // Equip toggle
    html.find(".item-equip-toggle").change(async ev => {
      const id      = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      const equipped = ev.currentTarget.checked;
      const item    = this.actor.items.get(id);
      if (!item) return;

      // Dual Wield: if equipping a weapon while another is already in main hand, ask slot
      if (equipped && item.type === "weapon") {
        const dualWieldProf = this.actor.system.weaponProf?.dualwield ?? 0;
        const hasMainHand   = this.actor.items.some(i =>
          i.id !== id && i.type === "weapon" && i.system?.equipped && i.system.slot !== "offhand"
        );
        if (dualWieldProf > 0 && hasMainHand) {
          const choice = await new Promise(resolve => {
            const dlg = new (foundry.appv1?.applications?.Dialog ?? Dialog)({
              title: "Dual Wield — Equip Slot",
              content: `<p style="font-family:sans-serif;font-size:13px;padding:6px 0;">Where do you want to equip <b>${item.name}</b>?</p>`,
              buttons: {
                main:    { label: "Main Hand",  callback: () => resolve("main") },
                offhand: { label: "Off-Hand",   callback: () => resolve("offhand") },
                cancel:  { label: "Cancel",     callback: () => resolve(null) },
              },
              default: "main",
              close: () => resolve(null),
            });
            dlg.render(true);
            const sheetEl = this.element[0];
            if (sheetEl) {
              const rect = sheetEl.getBoundingClientRect();
              setTimeout(() => dlg.setPosition({ left: rect.right + 10, top: rect.top }), 50);
            }
          });
          if (!choice) { ev.currentTarget.checked = false; return; }
          if (choice === "offhand") {
            await item.update({ "system.equipped": true, "system.slot": "offhand" });
            return;
          }
          // Main hand chosen — clear slot override and equip normally
          await item.update({ "system.equipped": true, "system.slot": "" });
          return;
        }
      }

      // Unequipping a dual-wield off-hand weapon — clear the slot override too
      if (!equipped && item.type === "weapon" && item.system.slot === "offhand") {
        await item.update({ "system.equipped": false, "system.slot": "" });
        return;
      }

      item.update({ "system.equipped": equipped });
    });

    // Qty change
    html.find(".item-qty").change(ev => {
      const id  = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      const qty = parseInt(ev.currentTarget.value) || 0;
      this.actor.items.get(id)?.update({ "system.qty": qty });
    });

    // Delete owned item
    html.find(".item-delete").click(ev => {
      const id = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      this.actor.items.get(id)?.delete();
    });

    // Deposit carried item → storage
    html.find(".item-store-btn").click(async ev => {
      const id = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      const item = this.actor.items.get(id);
      if (!item) return;
      const updates = { "system.equipped": false };
      // Clear offhand slot override if applicable
      if (item.system.equipped && item.type === "weapon" && item.system.slot === "offhand")
        updates["system.slot"] = "";
      await item.update(updates);
      await item.setFlag("dawnbreaker-trials", "stored", true);
    });

    // Withdraw stored item → carried
    html.find(".item-carry-btn").click(async ev => {
      const id = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      const item = this.actor.items.get(id);
      if (item) await item.unsetFlag("dawnbreaker-trials", "stored");
    });

    // Send item to another player
    html.find(".item-transfer-btn").click(async ev => {
      const id = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      const item = this.actor.items.get(id);
      if (item) await _openItemTransferDialog(this.actor, item);
    });

    // Stat roll buttons
    html.find(".stat-roll-btn").click(ev => {
      const stat = ev.currentTarget.dataset.stat;
      const statData = this.actor.system.stats[stat];
      const mod = statData?.mod ?? 0;
      const label = `${stat} Check`;
      const formula = `1d20 + ${mod}`;
      const roll = new Roll(formula, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `<b>${label}</b> (1d20 + ${mod})`,
        rollMode: game.settings.get("core", "rollMode"),
      });
    });

    // Roll buttons (ability tables)
    html.find(".roll-btn, .ability-macro-icon").click(ev => {
      const type  = ev.currentTarget.dataset.type;
      const index = parseInt(ev.currentTarget.dataset.index);
      const path  = this._typePath(type);
      const list  = foundry.utils.getProperty(this.actor.system, path) ?? [];
      const entry = list[index];
      if (!entry) return;
      _executeMacroOrRoll(entry.macroName ?? entry.name, entry.rollFormula ?? "", this.actor, { name: entry.name });
    });

    // ── Portrait variant listeners ─────────────────────────
    const _readConditionRows = () => {
      const rows = [];
      html.find(".pv-cond-row").each((_, row) => {
        const trigger = row.querySelector(".pv-cond-trigger")?.value.trim().toLowerCase();
        const img     = row.querySelector(".pv-cond-img")?.value.trim();
        if (trigger || img) rows.push({ trigger: trigger ?? "", img: img ?? "" });
      });
      return rows;
    };

    const _savePortraitVariants = async () => {
      const all   = game.settings.get("dawnbreaker-trials", "portraitVariants") ?? {};
      const entry = all[this.actor.id] ?? {};
      html.find(".portrait-variant-input").each((_, el) => {
        const key = el.dataset.variant;
        const val = el.value.trim();
        if (val) entry[key] = val; else delete entry[key];
      });
      const conds = _readConditionRows().filter(r => r.trigger && r.img);
      if (conds.length) entry.conditions = conds; else delete entry.conditions;
      all[this.actor.id] = entry;
      await game.settings.set("dawnbreaker-trials", "portraitVariants", all);
      CTBDisplay.refresh();
    };

    const _openFP = (currentVal, onPick) => {
      const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
      new FP({ type: "image", current: currentVal ?? "", callback: onPick }).browse();
    };

    // HP-state inputs: save on change + update thumbnail
    html.find(".portrait-variant-input").on("change", async (ev) => {
      const row   = ev.currentTarget.closest(".pv-row");
      const val   = ev.currentTarget.value.trim();
      const thumb = row?.querySelector(".pv-thumb");
      if (thumb) thumb.innerHTML = val ? `<img src="${val}"/>` : "";
      await _savePortraitVariants();
    });

    // HP-state browse buttons
    html.find(".pv-browse:not(.pv-cond-browse)").click(ev => {
      const variant = ev.currentTarget.dataset.variant;
      const input   = html.find(`.portrait-variant-input[data-variant="${variant}"]`)[0];
      _openFP(input?.value, async (path) => {
        if (input) { input.value = path; input.dispatchEvent(new Event("change")); }
      });
    });

    // Condition browse buttons (delegated — rows added dynamically)
    html[0].addEventListener("click", (ev) => {
      const btn = ev.target.closest(".pv-cond-browse");
      if (!btn) return;
      const row   = btn.closest(".pv-cond-row");
      const input = row?.querySelector(".pv-cond-img");
      _openFP(input?.value, async (path) => {
        if (input) {
          input.value = path;
          const thumb = row.querySelector(".pv-thumb");
          if (thumb) thumb.innerHTML = `<img src="${path}"/>`;
          await _savePortraitVariants();
        }
      });
    });

    // Condition text inputs: save on change
    html[0].addEventListener("change", async (ev) => {
      if (ev.target.closest(".pv-cond-row")) await _savePortraitVariants();
    });

    // Add condition row
    html.find(".pv-add-condition").click(() => {
      const table = html.find("#pv-conditions-table")[0];
      const idx   = html.find(".pv-cond-row").length;
      const row   = document.createElement("div");
      row.className = "pv-row pv-cond-row";
      row.dataset.index = String(idx);
      row.innerHTML = `
        <span class="pv-label"><input type="text" class="pv-cond-trigger" placeholder="condition name"/></span>
        <span class="pv-path">
          <input type="text" class="pv-cond-img" placeholder="path/to/image"/>
          <button type="button" class="pv-browse pv-cond-browse" title="Browse">📁</button>
        </span>
        <span class="pv-thumb"></span>
        <span class="pv-del"><button type="button" class="pv-del-condition" title="Remove">✕</button></span>`;
      table.appendChild(row);
    });

    // Delete condition row
    html[0].addEventListener("click", async (ev) => {
      const btn = ev.target.closest(".pv-del-condition");
      if (!btn) return;
      btn.closest(".pv-cond-row")?.remove();
      await _savePortraitVariants();
    });

    // Add row buttons
    html.find(".add-row").click(ev => {
      const type = ev.currentTarget.dataset.type;
      this._addRow(type);
    });

    // Delete row buttons
    html.find(".del-row").click(ev => {
      const type = ev.currentTarget.dataset.type;
      const index = parseInt(ev.currentTarget.dataset.index);
      this._deleteRow(type, index);
    });

    // ── Paperdoll — click equipped item to open sheet ──────
    html.find(".paperdoll-slot.pd-filled").click(async (ev) => {
      const slot = ev.target.closest(".paperdoll-slot");
      const itemId = slot?.dataset?.itemId;
      if (!itemId) return;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      const sheet = item.sheet ?? new DawnbreakerItemSheet(item, {});
      sheet.render(true);
      const sheetEl = this.element[0];
      if (sheetEl) {
        const rect = sheetEl.getBoundingClientRect();
        setTimeout(() => sheet.setPosition({ left: rect.right + 10, top: rect.top }), 50);
      }
    });

    // ── Paperdoll — right-click to unequip ─────────────────
    html.find(".pd-unequip").click(async (ev) => {
      ev.stopPropagation();
      const slot = ev.currentTarget.closest(".paperdoll-slot")?.dataset?.slot;
      if (!slot) return;
      const SLOT_MAP = { mainHand: "weapon", offHand: "offhand", head: "head", body: "chest", legs: "legs", accessory: "accessory" };
      const targetSlot = SLOT_MAP[slot];
      for (const item of this.actor.items.contents) {
        const itemSlot = item.system.slot?.toLowerCase() || item.type?.toLowerCase();
        if (itemSlot === targetSlot && item.system.equipped) {
          await item.update({ "system.equipped": false });
          break;
        }
      }
    });
  }

  _applyTheme(html, theme) {
    const form = html.closest("form");
    const themes = ["default","red","blue","green","orange","pink","yellow","brown"];
    themes.forEach(t => form.removeClass(`theme-${t}`));
    form.addClass(`theme-${theme}`);
  }

  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if (data.type === "Macro") {
      if (!this.actor.isOwner) return;
      const macro = await fromUuid(data.uuid).catch(() => null)
                 ?? game.macros.get(data.id ?? "");
      if (!macro) return;

      const el         = event.target.closest("[data-ability-section]");
      const sectionKey = el?.dataset?.abilitySection ?? "mainActives";
      const valid      = ["mainActives","secondaryActives","reactions","passives","movement","tracker"];
      const section    = valid.includes(sectionKey) ? sectionKey : "mainActives";

      const cmd = macro.command ?? "";

      let cost = "";
      for (const p of [
        /(?:const|let|var)\s+apCost\s*=\s*(\d+)/,
        /apCost\s*[=:]\s*(\d+)/,
        /["']?ap[-_]?cost["']?\s*[=:,]\s*(\d+)/i,
        /ap_cost\s*[=:]\s*(\d+)/i,
      ]) {
        const m = cmd.match(p);
        if (m) { cost = m[1]; break; }
      }

      const speed = /CastQueue/.test(cmd) ? "Cast Speed" : "Instant";
      const path  = this._typePath(section);
      const cur   = foundry.utils.getProperty(this.actor.system, path) ?? [];
      await this.actor.update({ [`system.${path}`]: [...cur, { name: macro.name, cost, speed, desc: "", macroName: macro.name }] });
      ui.notifications.info(`Macro "${macro.name}" added to ${section} as ${speed}${cost ? " (" + cost + " AP)" : ""}.`);
      return;
    }
    return super._onDrop(event);
  }

  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.fromDropData(data);
    if (!item) return false;

    const itemData = item.toObject();

    // Ability items get added to the ability tables on the sheet
    if (item.type === "ability") {
      const typeMap = {
        mainActive:      "abilities.mainActives",
        secondaryActive: "abilities.secondaryActives",
        reaction:        "abilities.reactions",
        passive:         "abilities.passives",
        movement:        "abilities.movement",
      };
      const abilityType = item.system.abilityType ?? "mainActive";
      const path        = typeMap[abilityType] ?? "abilities.mainActives";
      const current     = foundry.utils.getProperty(this.actor.system, path) ?? [];
      const newEntry    = {
        name:        item.name,
        cost:        item.system.apCost ?? "",
        speed:       item.system.speed  ?? "",
        desc:        item.system.effect ?? "",
        macroName:   item.system.macroName   ?? "",
        rollFormula: item.system.rollFormula ?? "",
      };
      await this.actor.update({ [`system.${path}`]: [...current, newEntry] });
      ui.notifications.info(`${item.name} added to ${abilityType} abilities.`);
      return;
    }

    // All other items become owned items on the actor
    const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    if (created?.length) {
      ui.notifications.info(`${item.name} added to inventory.`);
    }
    return created;
  }

  async _addRow(type) {
    const actor = this.actor;
    const defaults = {
      equipment:        { equipped: false, name: "", qty: 1, note: "" },
      mainActives:      { name: "", cost: "", speed: "", desc: "" },
      secondaryActives: { name: "", cost: "", speed: "", desc: "" },
      reactions:        { name: "", cost: "", speed: "", desc: "" },
      passives:         { name: "", cost: "", speed: "", desc: "" },
      movement:         { name: "", cost: "", speed: "", desc: "" },
      tracker:          { class: "", name: "", cost: "", speed: "", skillLevel: "", effect: "" },
      bioCustom:        { label: "", value: "" },
      classes:          { level: 1, class: "", next: "" },
      studies:          { book: false, knowledge: "", bonus: "" },
      conditions:       { name: "", duration: "", effect: "" },
    };

    const path = this._typePath(type);
    const current = foundry.utils.getProperty(actor.system, path) ?? [];
    const updated = [...current, defaults[type]];
    await actor.update({ [`system.${path}`]: updated });
  }

  async _deleteRow(type, index) {
    const actor = this.actor;
    const path = this._typePath(type);
    const current = foundry.utils.getProperty(actor.system, path) ?? [];
    const updated = current.filter((_, i) => i !== index);
    await actor.update({ [`system.${path}`]: updated });
  }

  _typePath(type) {
    const paths = {
      equipment:        "equipment",
      mainActives:      "abilities.mainActives",
      secondaryActives: "abilities.secondaryActives",
      reactions:        "abilities.reactions",
      passives:         "abilities.passives",
      movement:         "abilities.movement",
      tracker:          "abilities.tracker",
      bioCustom:        "bio.custom",
      classes:          "classes",
      studies:          "studies",
      conditions:       "conditions",
    };
    return paths[type];
  }
}

// ── COMPANION SHEET (pets/summons — trimmed layout, primal theme) ──
class DawnbreakerCompanionSheet extends DawnbreakerActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dawnbreaker", "sheet", "actor", "companion-sheet"],
      template: "systems/dawnbreaker-trials/templates/companion-sheet.html",
    });
  }
  get template() {
    return "systems/dawnbreaker-trials/templates/companion-sheet.html";
  }
}

// ── NPC DATA MODEL ───────────────────────────────────────────
class DawnbreakerNPCData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const req = { required: true, nullable: false };

    const optNum = () => new fields.NumberField({ required: false, nullable: true, integer: true, initial: null });

    return {
      role:    new fields.StringField({ initial: "" }),
      rank:    new fields.StringField({ initial: "" }),
      faction: new fields.StringField({ initial: "" }),
      notes:   new fields.StringField({ initial: "" }),

      hp: new fields.SchemaField({
        current: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        max:     new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
      }),
      ar: new fields.SchemaField({
        current: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        max:     new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
      }),
      ki: new fields.SchemaField({
        current: new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
        max:     new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
      }),
      ap: new fields.SchemaField({
        current: new fields.NumberField({ ...req, initial: 0, integer: true, min: -100, max: 100 }),
      }),

      stats: new fields.SchemaField({
        STR: optNum(), CON: optNum(), AGI: optNum(),
        DEX: optNum(), INT: optNum(), SPR: optNum(),
        FOR: optNum(), WIL: optNum(), CHA: optNum(),
        MV:  optNum(), AP:  optNum(), ASS: optNum(),
        PR:  optNum(), BRK: optNum(), MR:  optNum(),
      }),

      attacks: new fields.ArrayField(new fields.SchemaField({
        name:      new fields.StringField({ initial: "" }),
        stat:      new fields.StringField({ initial: "" }),
        weaponDmg: new fields.NumberField({ ...req, initial: 0, integer: true }),
        cost:      new fields.StringField({ initial: "" }),
        speed:     new fields.StringField({ initial: "" }),
        effect:    new fields.StringField({ initial: "" }),
      })),

      conditions: new fields.ArrayField(new fields.SchemaField({
        name:     new fields.StringField({ initial: "" }),
        label:    new fields.StringField({ initial: "" }),
        duration: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
        instance: new fields.NumberField({ required: false, nullable: true, initial: 0 }),
        effect:   new fields.StringField({ initial: "" }),
      })),

      animationFile:  new fields.StringField({ initial: "" }),
      animationScale: new fields.NumberField({ required: false, nullable: true, initial: 1.0 }),
      animationSound: new fields.StringField({ initial: "" }),
      greetingSound:  new fields.StringField({ initial: "" }),
      forgeSound:     new fields.StringField({ initial: "" }),
      enhanceSound:   new fields.StringField({ initial: "" }),

      // Named animation slots — keyed by event name (e.g. "burrow", "surface", "shell-shatter")
      animationSlots: new fields.ArrayField(new fields.SchemaField({
        name:  new fields.StringField({ initial: "" }),
        file:  new fields.StringField({ initial: "" }),
        scale: new fields.NumberField({ required: false, nullable: true, initial: 1.0 }),
        sound: new fields.StringField({ initial: "" }),
      })),

      ctbAP:          new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      reach:          new fields.NumberField({ required: true, nullable: false, initial: 1, integer: true, min: 1 }),

      shopEnabled:       new fields.BooleanField({ initial: false }),
      blacksmithEnabled: new fields.BooleanField({ initial: false }),
      enhancerEnabled:   new fields.BooleanField({ initial: false }),
    };
  }
}

// ── NPC SHEET ────────────────────────────────────────────────
class DawnbreakerNPCSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dawnbreaker", "sheet", "actor", "npc"],
      template: "systems/dawnbreaker-trials/templates/npc-sheet.html",
      width: 600,
      height: 620,
      tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "npc-core" }],
      scrollY: [".sheet-body.active"],
    });
  }
  get title() { return this.token?.name ?? this.actor.name; }

  getData() {
    const context = super.getData();
    context.system = this.actor.system;
    context.isInteractable = this.actor.system?.shopEnabled ?? this.actor.getFlag("dawnbreaker-trials", "isInteractable") ?? false;
    context.nonCombatant   = this.actor.getFlag("dawnbreaker-trials", "nonCombatant") ?? false;
    context.shopInventory  = this.actor.getFlag("dawnbreaker-trials", "shopInventory") ?? { name: this.actor.name, items: [] };
    context.shopTableId    = this.actor.getFlag("dawnbreaker-trials", "shopTableId") ?? "";
    const allTables        = _getShopTables();
    context.shopTables     = allTables.map(t => ({ id: t.id, name: t.name, selected: t.id === context.shopTableId }));
    context.isGM           = game.user.isGM;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // Non-combatant toggle
    html.find(".npc-noncombatant-toggle").change(async ev => {
      await this.actor.setFlag("dawnbreaker-trials", "nonCombatant", ev.currentTarget.checked);
    });

    // Open shop tables manager
    html.find(".open-shop-tables-btn").click(() => {
      new DawnbreakerShopTablesApp().render(true);
    });

    // Shop table selector
    html.find(".shop-table-select").change(async ev => {
      const val = ev.currentTarget.value || null;
      await this.actor.setFlag("dawnbreaker-trials", "shopTableId", val);
    });

    // Shop name change
    html.find(".shop-name-input").change(async ev => {
      const inv = foundry.utils.deepClone(this.actor.getFlag("dawnbreaker-trials", "shopInventory") ?? { name: "", items: [] });
      inv.name = ev.currentTarget.value;
      await this.actor.setFlag("dawnbreaker-trials", "shopInventory", inv);
    });

    // Add shop item (GM)
    html.find(".shop-add-item-btn").click(async () => {
      const inv = foundry.utils.deepClone(this.actor.getFlag("dawnbreaker-trials", "shopInventory") ?? { name: this.actor.name, items: [] });
      inv.items.push({ id: foundry.utils.randomID(), name: "New Item", img: "icons/svg/item-bag.svg", price: 0, qty: -1, description: "" });
      await this.actor.setFlag("dawnbreaker-trials", "shopInventory", inv);
    });

    // Delete shop item (GM)
    html.find(".shop-del-item-btn").click(async ev => {
      const id  = ev.currentTarget.dataset.id;
      const inv = foundry.utils.deepClone(this.actor.getFlag("dawnbreaker-trials", "shopInventory") ?? { name: "", items: [] });
      inv.items = inv.items.filter(i => i.id !== id);
      await this.actor.setFlag("dawnbreaker-trials", "shopInventory", inv);
    });

    // Save shop item edits inline
    html.find(".shop-item-field").change(async ev => {
      const id    = ev.currentTarget.closest("[data-shop-item-id]").dataset.shopItemId;
      const field = ev.currentTarget.dataset.field;
      let val     = ev.currentTarget.value;
      if (field === "price" || field === "qty") val = parseInt(val) || 0;
      const inv   = foundry.utils.deepClone(this.actor.getFlag("dawnbreaker-trials", "shopInventory") ?? { name: "", items: [] });
      const item  = inv.items.find(i => i.id === id);
      if (item) { item[field] = val; await this.actor.setFlag("dawnbreaker-trials", "shopInventory", inv); }
    });

    // Open shop as GM (preview)
    html.find(".shop-open-preview-btn").click(() => {
      const myChar = game.actors.find(a => a.type === "character" && a.isOwner);
      new DawnbreakerShopApp(this.actor.id, myChar?.id ?? null).render(true);
    });

    html.find(".add-row").click(ev => {
      const type = ev.currentTarget.dataset.type;
      this._addRow(type);
    });

    html.find(".del-row").click(ev => {
      const type  = ev.currentTarget.dataset.type;
      const index = parseInt(ev.currentTarget.dataset.index);
      this._deleteRow(type, index);
    });

    // HP / AR Attack buttons — select this actor's token then run the macro
    html.find(".npc-hp-attack-btn, .npc-ar-attack-btn").click(async ev => {
      const isHP  = ev.currentTarget.classList.contains("npc-hp-attack-btn");
      const name  = isHP ? "HP Attack" : "AR Attack";
      // Find and select this actor's token on the canvas
      const token = canvas.tokens.placeables.find(t => t.actor?.id === this.actor.id);
      if (!token) { ui.notifications.warn(`No token for ${this.actor.name} found on the scene.`); return; }
      canvas.tokens.releaseAll();
      token.control({ releaseOthers: true });
      // Small delay so control registers before macro reads controlled tokens
      await new Promise(r => setTimeout(r, 80));
      const macro = game.macros.getName(name);
      if (macro) macro.execute();
      else ui.notifications.error(`Macro "${name}" not found.`);
    });
  }

  async _addRow(type) {
    const defaults = {
      npcAttacks:     { name: "", stat: "", weaponDmg: 0, cost: "", speed: "", effect: "" },
      npcConditions:  { name: "", label: "", duration: 0, effect: "" },
      npcAnimSlots:   { name: "", file: "", scale: 1.0, sound: "" },
    };
    const paths = {
      npcAttacks:    "attacks",
      npcConditions: "conditions",
      npcAnimSlots:  "animationSlots",
    };
    const path    = paths[type];
    const current = foundry.utils.getProperty(this.actor.system, path) ?? [];
    await this.actor.update({ [`system.${path}`]: [...current, defaults[type]] });
  }

  async _deleteRow(type, index) {
    const paths = {
      npcAttacks:    "attacks",
      npcConditions: "conditions",
      npcAnimSlots:  "animationSlots",
    };
    const path    = paths[type];
    const current = foundry.utils.getProperty(this.actor.system, path) ?? [];
    await this.actor.update({ [`system.${path}`]: current.filter((_, i) => i !== index) });
  }

  async _onDrop(event) {
    // If this NPC has a shop, intercept item drops and add them to shop inventory
    if (this.actor.getFlag("dawnbreaker-trials", "isInteractable") && game.user.isGM) {
      let dragData;
      try { dragData = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return super._onDrop(event); }
      if (dragData?.type !== "Item") return super._onDrop(event);

      const item = await fromUuid(dragData.uuid).catch(() => null);
      if (!item) return super._onDrop(event);

      const inv = foundry.utils.deepClone(
        this.actor.getFlag("dawnbreaker-trials", "shopInventory") ?? { name: this.actor.name, items: [] }
      );
      // Avoid exact duplicates (same uuid already in list)
      if (dragData.uuid && inv.items.some(i => i.uuid === dragData.uuid)) {
        ui.notifications.warn(`${item.name} is already in this shop.`);
        return;
      }
      inv.items.push({
        id:          foundry.utils.randomID(),
        uuid:        dragData.uuid ?? null,
        name:        item.name,
        img:         item.img ?? "icons/svg/item-bag.svg",
        price:       item.system?.price ?? item.system?.cost ?? 0,
        qty:         -1,
        description: item.system?.description?.value?.replace(/<[^>]+>/g, "") ?? item.system?.desc ?? "",
      });
      await this.actor.setFlag("dawnbreaker-trials", "shopInventory", inv);
      return;
    }
    return super._onDrop(event);
  }
}

// ═══════════════════════════════════════════════════════════════
//  SHOP SYSTEM
// ═══════════════════════════════════════════════════════════════

const _shoppingDrawings = new Map();

// ── Journal-backed shop table storage ──────────────────────────
function _getShopTables() {
  const journal = game.journal?.getName("DBT Shop Tables");
  return journal?.getFlag("dawnbreaker-trials", "shopTables") ?? [];
}

async function _setShopTables(tables) {
  let journal = game.journal?.getName("DBT Shop Tables");
  if (!journal) {
    const created = await JournalEntry.createDocuments([{ name: "DBT Shop Tables", ownership: { default: 2 } }]);
    journal = created[0];
  }
  // Ensure players always have observer access to read shop data
  if (journal.ownership?.default !== 2) {
    await journal.update({ ownership: { ...journal.ownership, default: 2 } });
  }
  await journal.setFlag("dawnbreaker-trials", "shopTables", tables);
  game.socket.emit("system.dawnbreaker-trials", { type: "shopTablesUpdate" });
}

// Resolve shop items for an NPC — checks named table first, falls back to per-NPC flag
function _resolveShopData(npc) {
  const tableId = npc.getFlag("dawnbreaker-trials", "shopTableId");
  if (tableId) {
    const table = _getShopTables().find(t => t.id === tableId);
    if (table) return { name: table.name, items: foundry.utils.deepClone(table.items ?? []) };
  }
  return foundry.utils.deepClone(npc.getFlag("dawnbreaker-trials", "shopInventory") ?? { name: npc.name, items: [] });
}

// Persist updated shop items back to the right place (table or per-NPC flag)
async function _saveShopItems(npc, items) {
  const tableId = npc.getFlag("dawnbreaker-trials", "shopTableId");
  if (tableId) {
    const tables = _getShopTables();
    const t = tables.find(t => t.id === tableId);
    if (t) { t.items = items; await _setShopTables(tables); }
  } else {
    const inv = foundry.utils.deepClone(npc.getFlag("dawnbreaker-trials", "shopInventory") ?? { name: npc.name, items: [] });
    inv.items = items;
    await npc.setFlag("dawnbreaker-trials", "shopInventory", inv);
    game.socket.emit("system.dawnbreaker-trials", { type: "shopStockUpdate", npcActorId: npc.id });
  }
}

async function _processShopPurchase({ npcActorId, buyerActorId, itemId, silent = false }) {
  const npc   = game.actors.get(npcActorId);
  const buyer = game.actors.get(buyerActorId);
  if (!npc || !buyer) return;

  const shop = _resolveShopData(npc);
  const item = shop.items.find(i => i.id === itemId);
  if (!item) return;

  const credits = buyer.system.bio.credits ?? 0;
  if (credits < item.price) {
    game.socket.emit("system.dawnbreaker-trials", { type: "shopPurchaseFailed", buyerActorId, reason: "insufficient_credits" });
    return;
  }
  if (item.qty === 0) {
    game.socket.emit("system.dawnbreaker-trials", { type: "shopPurchaseFailed", buyerActorId, reason: "out_of_stock" });
    return;
  }

  if (item.qty > 0) item.qty--;
  await buyer.update({ "system.bio.credits": credits - item.price });
  await _saveShopItems(npc, shop.items);

  if (item.uuid) {
    const src = await fromUuid(item.uuid).catch(() => null);
    if (src) {
      const stackLimit = src.system?.stackLimit ?? 0;
      // Find an existing stack (stackLimit 0 = unlimited, so any existing stack is valid)
      const existing = buyer.items.find(i =>
        i.getFlag("dawnbreaker-trials", "sourceUuid") === item.uuid &&
        (stackLimit === 0 || (i.system.qty ?? 0) < stackLimit)
      );
      if (existing) {
        const newQty = (existing.system.qty ?? 1) + 1;
        await existing.update({ "system.qty": stackLimit > 0 ? Math.min(stackLimit, newQty) : newQty });
      } else {
        const newItem = await Item.create({ ...src.toObject(), ownership: {} }, { parent: buyer });
        await newItem.setFlag("dawnbreaker-trials", "sourceUuid", item.uuid);
      }
    }
  } else {
    await Item.create({
      name: item.name, type: "equipment", img: item.img ?? "icons/svg/item-bag.svg",
      system: { qty: 1, note: item.description ?? "" },
    }, { parent: buyer });
  }

  if (!silent) await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🛒 <b>${buyer.name}</b> purchased <b>${item.name}</b> for <span style="color:#c8a84b;font-weight:700;">${item.price} Credits</span>.</div>` });
}

async function _processShopSell({ buyerActorId, itemId }) {
  const buyer = game.actors.get(buyerActorId);
  if (!buyer) return;
  const item = buyer.items.get(itemId);
  if (!item) return;
  const sellPrice = Math.floor((item.system?.cost ?? 0) / 2);
  const qty = item.system?.qty ?? 1;
  if (qty > 1) await item.update({ "system.qty": qty - 1 });
  else await item.delete();
  const credits = buyer.system.bio.credits ?? 0;
  await buyer.update({ "system.bio.credits": credits + sellPrice });
}

// ── Player-facing Shop Window ──────────────────────────────────
class DawnbreakerShopApp extends foundry.appv1.api.Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dawnbreaker-shop",
      title: "Shop",
      template: "systems/dawnbreaker-trials/templates/shop.html",
      width: window.innerWidth,
      height: window.innerHeight,
      resizable: false,
      classes: ["dawnbreaker", "db-shop-app"],
    });
  }

  constructor(npcActorId, buyerActorId, options = {}, buyerTokenId = null) {
    super(options);
    this.npcActorId        = npcActorId;
    this.buyerActorId      = buyerActorId;
    this._buyerTokenId     = buyerTokenId;
    this._mode             = "buy"; // "buy" | "sell" | "forge" | "enhance"
    this._smithSelectedId  = null;
    this._enhSelectedId    = null;
    this._enhSelectedSlot  = null;
    this._enhSelectedEssence = null;
    this._enhSelectedEssenceQty = 1;
    this._enhLastResult    = null;
    this._enhPendingConfirm = null;
    this._selectedCategory = null;
    this._selectedItemId   = null;
    this._cart             = [];
    this._sellCart         = [];
  }

  get title() {
    const npc = game.actors.get(this.npcActorId);
    return npc?.name ?? "Shop";
  }

  async _render(force, options) {
    await super._render(force, options);
    this.setPosition({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });
    const el = this.element?.[0];
    if (el) {
      el.style.borderRadius = "0";
      // Shop is a fullscreen terminal takeover — sits above everything open
      // before it. Jump the shared core z counter to the shop's level so any
      // window opened FROM the shop (GM dialogs etc.) still lands above it.
      const AppV2 = foundry.applications?.api?.ApplicationV2;
      if (AppV2 && typeof AppV2._maxZ === "number") AppV2._maxZ = Math.max(AppV2._maxZ, 99998);
      el.style.zIndex = "99998";
    }
  }

  _catAbbrev(cat) { return (cat ?? "GN").slice(0, 2).toUpperCase(); }

  getData() {
    const npc     = game.actors.get(this.npcActorId);
    const buyer   = this.buyerActorId ? game.actors.get(this.buyerActorId) : null;
    const shop    = _resolveShopData(npc);
    const credits = buyer?.system?.bio?.credits ?? 0;

    const npcCaps = {
      hasShop:       npc?.system?.shopEnabled       ?? true,
      hasBlacksmith: npc?.system?.blacksmithEnabled ?? false,
      hasEnhancer:   npc?.system?.enhancerEnabled   ?? false,
    };
    if (this._mode === "buy"     && !npcCaps.hasShop)       this._mode = npcCaps.hasBlacksmith ? "forge" : npcCaps.hasEnhancer ? "enhance" : "buy";
    if (this._mode === "sell"    && !npcCaps.hasShop)       this._mode = npcCaps.hasBlacksmith ? "forge" : npcCaps.hasEnhancer ? "enhance" : "buy";
    if (this._mode === "forge"   && !npcCaps.hasBlacksmith) this._mode = npcCaps.hasShop ? "buy" : npcCaps.hasEnhancer ? "enhance" : "buy";
    if (this._mode === "enhance" && !npcCaps.hasEnhancer)   this._mode = npcCaps.hasShop ? "buy" : npcCaps.hasBlacksmith ? "forge" : "buy";

    // ── FORGE MODE ──
    if (this._mode === "forge" && buyer) {
      const items = buyer.items.filter(i =>
        ["weapon","armor","offhand"].includes(i.system?.itemType ?? "") || ["weapon","armor"].includes(i.type)
      );
      const upgradeableItems = items.map(item => {
        const level = item.system?.upgradeLevel ?? 0;
        const rarity = item.system?.rarity ?? "basic";
        return { id:item.id, name:item.name, img:item.img, level, rarity, rarityLabel:_rarityLabel(rarity), rarityColor:_rarityColor(rarity), isSelected:item.id===this._smithSelectedId, atMax:level>=7 };
      });
      let selectedItem=null, costRows=[], canAfford=false, slotRows=[];
      if (this._smithSelectedId) {
        const item = buyer.items.get(this._smithSelectedId);
        if (item) {
          const level=item.system?.upgradeLevel??0, rarity=item.system?.rarity??_rarityFromLevel(level), nextLevel=level+1;
          const cost=_getUpgradeCost(item,nextLevel), mat=_getPrimaryMaterial(item), mat2=_getSecondaryMaterial(item);
          const _qty=(name)=>_craftingQty(buyer,name);
          if (cost&&level<7) {
            const split=mat2?_splitCost(cost.primary):null;
            const hO=_qty(mat),hO2=mat2?_qty(mat2):0,hC=_qty("Carmine Shard"),hR=_qty("Rune");
            const mainNeed=split?split.main:cost.primary, secNeed=split?split.secondary:0;
            costRows=[
              {label:mat,need:mainNeed,have:hO,canAfford:hO>=mainNeed},
              ...(mat2?[{label:mat2,need:secNeed,have:hO2,canAfford:hO2>=secNeed}]:[]),
              {label:"Carmine Shard",need:cost.carmine,have:hC,canAfford:hC>=cost.carmine,skip:cost.carmine===0},
              {label:"Rune",need:cost.rune,have:hR,canAfford:hR>=cost.rune,skip:cost.rune===0}
            ].filter(r=>!r.skip);
            canAfford=costRows.every(r=>r.canAfford);
          }
          const enhancements=item.getFlag("dawnbreaker-trials","enhancements")??[], totalSlots=1+level, isWeapon=item.system?.isWeapon??(item.system?.itemType==="weapon");
          slotRows=[{slotIndex:0,isFixed:true,label:isWeapon?`DAM +${2+level}`:"FIXED",badge:"FIXED",type:"fixed"}];
          for(let s=1;s<totalSlots;s++){const enh=enhancements[s-1];slotRows.push(enh?{slotIndex:s,isFixed:false,isFilled:true,label:`${enh.label??enh.stat?.toUpperCase()} +${enh.value}`,badge:enh.essence?enh.essence.toUpperCase():(isWeapon?"EPHI":"AMYNTI"),type:enh.essence?"elemental":"filled"}:{slotIndex:s,isFixed:false,isFilled:false,isEmpty:true,label:"EMPTY",badge:"",type:"empty"});}
          selectedItem={id:item.id,name:item.name,img:item.img,level,nextLevel,rarity,rarityLabel:_rarityLabel(rarity),rarityColor:_rarityColor(rarity),atMax:level>=7,nextRarity:level<7?_rarityLabel(_rarityFromLevel(nextLevel)):null,crossesRarityBoundary:level<7&&_rarityFromLevel(nextLevel)!==rarity};
        }
      }
      const credits = buyer?.system?.bio?.credits ?? 0;
      return { mode:"forge", shopName:shop.name, npcName:npc?.name??"", npcImg:npc?.img??"", buyerName:buyer?.name??"", buyerImg:buyer?.img??"", canBuy:!!this.buyerActorId, npcCaps, upgradeableItems, selectedItem, costRows, canAfford, slotRows, credits, canAffordCredits: credits >= 200 };
    }

    // ── ENHANCE MODE ──
    if (this._mode === "enhance" && buyer) {
      const enhanceable = buyer.items.filter(i=>["weapon","armor","offhand"].includes(i.system?.itemType??"")||["weapon","armor"].includes(i.type));
      const _qty=(name)=>_craftingQty(buyer,name);
      const itemList=enhanceable.map(item=>{const level=item.system?.upgradeLevel??0,enhs=item.getFlag("dawnbreaker-trials","enhancements")??[];return{id:item.id,name:item.name,img:item.img,level,rarity:item.system?.rarity??"basic",rarityLabel:_rarityLabel(item.system?.rarity??"basic"),rarityColor:_rarityColor(item.system?.rarity??"basic"),isSelected:item.id===this._enhSelectedId,slotsLabel:`${enhs.length}/${level} SLOTS`};});
      let selectedItem=null,slotRows=[],canApply=false,rerollCost=0;
      const essenceOptions=[{value:"",label:"None (standard roll)"},{value:"fire",label:`Fire Essence (${_qty("Fire Essence")} owned)`},{value:"water",label:`Water Essence (${_qty("Water Essence")} owned)`},{value:"earth",label:`Earth Essence (${_qty("Earth Essence")} owned)`},{value:"air",label:`Air Essence (${_qty("Air Essence")} owned)`},{value:"spirit",label:`Spirit Essence (${_qty("Spirit Essence")} owned)`}];
      if (this._enhSelectedId) {
        const item=buyer.items.get(this._enhSelectedId);
        if (item) {
          const level=item.system?.upgradeLevel??0,rarity=item.system?.rarity??"basic",enhancements=item.getFlag("dawnbreaker-trials","enhancements")??[],totalSlots=1+level,isWeapon=item.system?.isWeapon??(item.system?.itemType==="weapon");
          const isGM=game.user.isGM;
          slotRows=[{slotIndex:0,isFixed:true,label:isWeapon?`DAM +${2+level}`:"FIXED",badge:"FIXED",type:"fixed"}];
          for(let s=1;s<totalSlots;s++){const enh=enhancements[s-1],rerolls=enh?.rerollCount??0,rc=_getRerollCost(rarity,rerolls),gmLocked=!!(enh?.gmFixed);slotRows.push(enh?{slotIndex:s,isFixed:false,isFilled:true,isGMFixed:gmLocked,label:`${enh.label??enh.stat?.toUpperCase()} +${enh.value}`,badge:gmLocked?"🔒 GM":(enh.essence?enh.essence.toUpperCase():(isWeapon?"EPHI":"AMYNTI")),type:gmLocked?"gmfixed":(enh.essence?"elemental":"filled"),canReroll:!gmLocked||isGM,rerollCost:rc,rerollCount:rerolls,isSelected:this._enhSelectedSlot===s,isGM}:{slotIndex:s,isFixed:false,isFilled:false,isEmpty:true,label:"EMPTY",badge:"",type:"empty",isSelected:this._enhSelectedSlot===s,isGM});}
          if(this._enhSelectedSlot!==null){const sel=slotRows.find(r=>r.slotIndex===this._enhSelectedSlot);if(sel?.isFilled){rerollCost=sel.rerollCost;canApply=(isGM||!sel.isGMFixed)&&_qty("Carmine Shard")>=rerollCost;}else if(sel?.isEmpty){canApply=isWeapon?_qty("Ephi Shard")>0:_qty("Amynti Shard")>0;}}
          selectedItem={id:item.id,name:item.name,img:item.img,level,rarity,rarityLabel:_rarityLabel(rarity),rarityColor:_rarityColor(rarity),isWeapon,isGM};
        }
      }
      const essenceQtyOwned = this._enhSelectedEssence ? _qty(`${this._enhSelectedEssence.charAt(0).toUpperCase()}${this._enhSelectedEssence.slice(1)} Essence`) : 0;
      const selectedEssenceQty = this._enhSelectedEssence ? Math.max(1, Math.min(this._enhSelectedEssenceQty ?? 1, essenceQtyOwned || 1)) : 0;
      if (this._enhSelectedEssence && (selectedEssenceQty < 1 || selectedEssenceQty > essenceQtyOwned)) canApply = false;
      const credits = buyer?.system?.bio?.credits ?? 0;
      return { mode:"enhance", shopName:shop.name, npcName:npc?.name??"", npcImg:npc?.img??"", buyerName:buyer?.name??"", buyerImg:buyer?.img??"", canBuy:!!this.buyerActorId, npcCaps, itemList, selectedItem, slotRows, essenceOptions, canApply, rerollCost, selectedSlot:this._enhSelectedSlot, selectedEssence:this._enhSelectedEssence, selectedEssenceQty, essenceQtyOwned, essenceBiasPct: selectedEssenceQty * ENHANCE_ESSENCE_BOOST_PCT * 100, lastResult:this._enhLastResult, pendingConfirm:this._enhPendingConfirm ?? null, credits, canAffordCredits: credits >= 200 };
    }


    if (this._mode === "sell") {
      const sellItems = (buyer?.items ?? [])
        .filter(i => (i.system?.cost ?? 0) > 0)
        .map(i => ({
          id: i.id, label: i.name, img: i.img,
          cost: i.system.cost,
          sellPrice: Math.floor((i.system.cost ?? 0) / 2),
          qty: i.system?.qty ?? 1,
          isSelected: i.id === this._selectedItemId,
        }));
      const selSell   = sellItems.find(i => i.isSelected) ?? null;
      const sellTotal = this._sellCart.reduce((s, e) => s + e.sellPrice * e.qty, 0);
      return {
        mode: "sell", shopName: shop.name, npcName: npc?.name ?? "Shop", npcImg: npc?.img ?? "", buyerName: buyer?.name ?? "", buyerImg: buyer?.img ?? "", credits, npcCaps,
        canBuy: !!this.buyerActorId,
        sellItems, selSell,
        sellCart: this._sellCart, sellTotal,
      };
    }

    // Buy mode — group items by category
    const raw = shop.items ?? [];
    const categories = [...new Set(raw.map(i => i.category || "General"))];
    if (!this._selectedCategory || !categories.includes(this._selectedCategory))
      this._selectedCategory = categories[0] ?? "General";
    const filtered = raw.filter(i => (i.category || "General") === this._selectedCategory);
    const selId    = this._selectedItemId ?? filtered[0]?.id ?? null;
    const items    = filtered.map(i => ({
      ...i,
      canAfford:  credits >= i.price,
      inStock:    i.qty !== 0,
      isSelected: i.id === selId,
    }));
    const selected  = items.find(i => i.isSelected) ?? null;
    const cartTotal = this._cart.reduce((sum, e) => sum + e.price * e.qty, 0);
    return {
      mode: "buy", shopName: shop.name, npcName: npc?.name ?? "Shop", npcImg: npc?.img ?? "", buyerName: buyer?.name ?? "", buyerImg: buyer?.img ?? "", credits, npcCaps,
      canBuy: !!this.buyerActorId,
      categories: categories.map(c => ({ name: c, abbrev: this._catAbbrev(c), active: c === this._selectedCategory })),
      items, selected,
      cart: this._cart, cartTotal, canAffordCart: credits >= cartTotal,
    };
  }

  // ── Buy cart ──
  _cartEntry(itemId) { return this._cart.find(e => e.itemId === itemId); }

  _addToCart(itemId) {
    const npc  = game.actors.get(this.npcActorId);
    const shop = _resolveShopData(npc);
    const item = (shop.items ?? []).find(i => i.id === itemId);
    if (!item) return;
    const entry = this._cartEntry(itemId);
    if (entry) {
      if (item.qty === -1 || entry.qty < item.qty) entry.qty++;
    } else {
      this._cart.push({ itemId, label: item.name, img: item.img, price: item.price, qty: 1, stock: item.qty });
    }
    this.render(false);
  }

  _removeFromCart(itemId) { this._cart = this._cart.filter(e => e.itemId !== itemId); this.render(false); }

  _setCartQty(itemId, qty) {
    const entry = this._cartEntry(itemId);
    if (!entry) return;
    const npc  = game.actors.get(this.npcActorId);
    const shop = _resolveShopData(npc);
    const item = (shop.items ?? []).find(i => i.id === itemId);
    const max  = item?.qty === -1 ? Infinity : (item?.qty ?? 1);
    entry.qty  = Math.max(1, Math.min(qty, max));
    this.render(false);
  }

  async _checkout() {
    if (!this.buyerActorId || !this._cart.length) return;
    const cart = [...this._cart];
    for (const entry of cart) {
      for (let i = 0; i < entry.qty; i++) {
        const data = { type: "shopBuy", npcActorId: this.npcActorId, buyerActorId: this.buyerActorId, itemId: entry.itemId, silent: true };
        if (game.user.isGM) await _processShopPurchase(data);
        else game.socket.emit("system.dawnbreaker-trials", data);
      }
    }
    const buyer = game.actors.get(this.buyerActorId);
    const total = cart.reduce((s, e) => s + e.price * e.qty, 0);
    const lines = cart.map(e => `<li>${e.qty > 1 ? `${e.qty}× ` : ""}${e.label}</li>`).join("");
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:8px 12px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🛒 <b>${buyer?.name ?? "Someone"}</b> purchased:<ul style="margin:4px 0 6px 16px;padding:0;">${lines}</ul><span style="color:#c8a84b;font-weight:700;">Total: ${total} Credits</span></div>` });
    this._cart = [];
    this.render(false);
  }

  // ── Sell cart ──
  _sellEntry(itemId) { return this._sellCart.find(e => e.itemId === itemId); }

  _addToSellCart(itemId) {
    const buyer = game.actors.get(this.buyerActorId);
    const item  = buyer?.items.get(itemId);
    if (!item) return;
    const sellPrice = Math.floor((item.system?.cost ?? 0) / 2);
    const maxQty    = item.system?.qty ?? 1;
    const entry     = this._sellEntry(itemId);
    if (entry) { if (entry.qty < maxQty) entry.qty++; }
    else this._sellCart.push({ itemId, label: item.name, img: item.img, sellPrice, qty: 1, maxQty });
    this.render(false);
  }

  _removeFromSellCart(itemId) { this._sellCart = this._sellCart.filter(e => e.itemId !== itemId); this.render(false); }

  _setSellCartQty(itemId, qty) {
    const entry = this._sellEntry(itemId);
    if (!entry) return;
    entry.qty = Math.max(1, Math.min(qty, entry.maxQty));
    this.render(false);
  }

  async _sellCheckout() {
    if (!this.buyerActorId || !this._sellCart.length) return;
    const cart = [...this._sellCart];
    for (const entry of cart) {
      for (let i = 0; i < entry.qty; i++) {
        const data = { type: "shopSell", buyerActorId: this.buyerActorId, itemId: entry.itemId };
        if (game.user.isGM) await _processShopSell(data);
        else game.socket.emit("system.dawnbreaker-trials", data);
      }
    }
    const buyer = game.actors.get(this.buyerActorId);
    const total = cart.reduce((s, e) => s + e.sellPrice * e.qty, 0);
    const lines = cart.map(e => `<li>${e.qty > 1 ? `${e.qty}× ` : ""}${e.label} (+${e.sellPrice * e.qty}¢)</li>`).join("");
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:4px;padding:8px 12px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">💰 <b>${buyer?.name ?? "Someone"}</b> sold:<ul style="margin:4px 0 6px 16px;padding:0;">${lines}</ul><span style="color:#c8a84b;font-weight:700;">Earned: ${total} Credits</span></div>` });
    this._sellCart = [];
    this.render(false);
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Mode tabs
    html.find(".db-mode-tab").click(ev => {
      this._mode             = ev.currentTarget.dataset.mode;
      this._selectedItemId   = null;
      this._selectedCategory = null;
      this.render(false);
    });

    // ── FORGE tab listeners ──
    html.find(".db-smith-item-row").click(ev => { this._smithSelectedId = ev.currentTarget.dataset.itemId; this.render(false); });
    html.find(".db-smith-forge-btn").click(async () => {
      const buyer = game.actors.get(this.buyerActorId);
      const item  = buyer?.items.get(this._smithSelectedId);
      if (!item) return;
      const level = item.system?.upgradeLevel ?? 0;
      if (level >= 7) return;
      const nextLevel = level + 1, cost = _getUpgradeCost(item, nextLevel), mat = _getPrimaryMaterial(item), mat2 = _getSecondaryMaterial(item);
      const split = mat2 ? _splitCost(cost.primary) : null;
      await _consumeStoredMaterial(buyer, mat, split ? split.main : cost.primary);
      if (mat2 && split.secondary > 0) await _consumeStoredMaterial(buyer, mat2, split.secondary);
      if (cost.carmine > 0) await _consumeStoredMaterial(buyer, "Carmine Shard", cost.carmine);
      if (cost.rune > 0)    await _consumeStoredMaterial(buyer, "Rune", cost.rune);
      await buyer.update({ "system.bio.credits": Math.max(0, (buyer.system.bio.credits ?? 0) - 200) });
      const forgeSound = game.actors.get(this.npcActorId)?.system?.forgeSound;
      if (forgeSound) (foundry.audio?.AudioHelper ?? AudioHelper).play({ src: forgeSound, volume: 1, autoplay: true, loop: false }, true);
      const newRarity = _rarityFromLevel(nextLevel);
      await item.update({ "system.upgradeLevel": nextLevel, "system.rarity": newRarity });
      await _applyEnhancements(item);
      const matDetail = mat2 ? `${split.main}x ${mat} + ${split.secondary}x ${mat2}` : `${cost.primary}x ${mat}`;
      _craftingLogAdd({ actorName: buyer.name, action: "upgrade", itemName: item.name, rarity: newRarity, detail: `Upgraded to +${nextLevel} (${_rarityLabel(newRarity)}) — consumed ${matDetail}${cost.carmine ? `, ${cost.carmine}x Carmine` : ""}${cost.rune ? `, ${cost.rune}x Rune` : ""}` });
      ui.notifications.info(`${item.name} upgraded to +${nextLevel}!`);
      this.render(false);
    });

    // ── ENHANCE tab listeners ──
    html.find(".db-enhance-item-row").click(ev => { this._enhSelectedId = ev.currentTarget.dataset.itemId; this._enhSelectedSlot = null; this._enhLastResult = null; this._enhPendingConfirm = null; this.render(false); });
    html.find(".db-enh-slot-select").click(ev => { this._enhSelectedSlot = parseInt(ev.currentTarget.dataset.slot); this._enhPendingConfirm = null; this.render(false); });
    html.find(".db-enhance-essence-select").change(ev => { this._enhSelectedEssence = ev.currentTarget.value || null; this._enhSelectedEssenceQty = 1; this._enhPendingConfirm = null; this.render(false); });
    html.find(".db-enhance-essence-qty").change(ev => { this._enhSelectedEssenceQty = Math.max(1, parseInt(ev.currentTarget.value) || 1); this._enhPendingConfirm = null; this.render(false); });
    // ── GM: set/edit fixed slot ──
    if (game.user.isGM) {
      html.find(".db-enh-gm-fix-btn").click(async ev => {
        const slotIdx = parseInt(ev.currentTarget.dataset.slot) - 1;
        const buyer = game.actors.get(this.buyerActorId);
        const item  = buyer?.items.get(this._enhSelectedId);
        if (!item) return;
        const enhancements = foundry.utils.deepClone(item.getFlag("dawnbreaker-trials", "enhancements") ?? []);
        const existing = enhancements[slotIdx] ?? {};
        const dlg = await new Promise(resolve => {
          new (foundry.appv1?.applications?.Dialog ?? Dialog)({
            title: "GM — Set Fixed Enhancement",
            content: `
              <div style="display:grid;gap:6px;padding:8px;">
                <label>Stat / Label<input class="enh-fix-label" type="text" value="${existing.label ?? existing.stat?.toUpperCase() ?? ""}" style="width:100%;margin-top:2px;"/></label>
                <label>Value<input class="enh-fix-value" type="number" value="${existing.value ?? 0}" style="width:100%;margin-top:2px;"/></label>
                <label style="display:flex;align-items:center;gap:6px;"><input class="enh-fix-locked" type="checkbox" ${existing.gmFixed !== false ? "checked" : ""}/>  Lock (prevent player reroll)</label>
              </div>`,
            buttons: {
              ok: { label: "Save", callback: html => resolve({
                label: html.find(".enh-fix-label").val().trim(),
                value: parseInt(html.find(".enh-fix-value").val()) || 0,
                gmFixed: html.find(".enh-fix-locked").prop("checked")
              })},
              cancel: { label: "Cancel", callback: () => resolve(null) }
            },
            default: "ok"
          }).render(true);
        });
        if (!dlg) return;
        enhancements[slotIdx] = { ...existing, label: dlg.label, stat: dlg.label.toLowerCase(), value: dlg.value, gmFixed: dlg.gmFixed, rerollCount: existing.rerollCount ?? 0 };
        await item.setFlag("dawnbreaker-trials", "enhancements", enhancements);
        await _applyEnhancements(item);
        _craftingLogAdd({ actorName: "GM", action: "gm-set", itemName: item.name, rarity: item.system?.rarity ?? "basic", detail: `Slot ${slotIdx+1}: ${dlg.label} +${dlg.value}${dlg.gmFixed ? " [LOCKED]" : ""}` });
        this.render(false);
      });
    }

    html.find(".db-enhance-apply-btn").click(() => {
      const buyer = game.actors.get(this.buyerActorId);
      const item  = buyer?.items.get(this._enhSelectedId);
      if (!item || this._enhSelectedSlot === null) return;
      const rarity = item.system?.rarity ?? "basic";
      const isWeapon = item.system?.isWeapon ?? (item.system?.itemType === "weapon");
      const enhancements = item.getFlag("dawnbreaker-trials", "enhancements") ?? [];
      const slotIdx = this._enhSelectedSlot - 1, existing = enhancements[slotIdx], rerollCount = existing?.rerollCount ?? 0;
      if (existing?.gmFixed && !game.user.isGM) { ui.notifications.warn("This slot is locked by the GM."); return; }
      // Build cost summary for inline confirmation panel
      const shardName = existing ? "Carmine Shard" : (isWeapon ? "Ephi Shard" : "Amynti Shard");
      const shardCost = existing ? _getRerollCost(rarity, rerollCount) : 1;
      const essenceQty = this._enhSelectedEssence ? Math.max(1, this._enhSelectedEssenceQty ?? 1) : 0;
      const essenceName = this._enhSelectedEssence ? `${this._enhSelectedEssence.charAt(0).toUpperCase()}${this._enhSelectedEssence.slice(1)} Essence` : null;
      const costLines = [`${shardCost}x ${shardName}`];
      if (essenceName) costLines.push(`${essenceQty}x ${essenceName}`);
      this._enhPendingConfirm = {
        isReroll: !!existing,
        actionLabel: existing ? `Reroll slot ${this._enhSelectedSlot} on ${item.name}?` : `Enhance slot ${this._enhSelectedSlot} on ${item.name}?`,
        costLabel: costLines.join(" + "),
      };
      this.render(false);
    });

    html.find(".db-enhance-confirm-cancel-btn").click(() => {
      this._enhPendingConfirm = null;
      this.render(false);
    });

    html.find(".db-enhance-confirm-yes-btn").click(async () => {
      this._enhPendingConfirm = null;
      const buyer = game.actors.get(this.buyerActorId);
      const item  = buyer?.items.get(this._enhSelectedId);
      if (!item || this._enhSelectedSlot === null) { this.render(false); return; }
      const rarity = item.system?.rarity ?? "basic";
      const isWeapon = item.system?.isWeapon ?? (item.system?.itemType === "weapon");
      const enhancements = foundry.utils.deepClone(item.getFlag("dawnbreaker-trials", "enhancements") ?? []);
      const slotIdx = this._enhSelectedSlot - 1, existing = enhancements[slotIdx], rerollCount = existing?.rerollCount ?? 0;
      if (existing?.gmFixed && !game.user.isGM) { ui.notifications.warn("This slot is locked by the GM."); this.render(false); return; }
      const essenceQty = this._enhSelectedEssence ? Math.max(1, this._enhSelectedEssenceQty ?? 1) : 0;
      if (existing) {
        await _consumeStoredMaterial(buyer, "Carmine Shard", _getRerollCost(rarity, rerollCount));
        if (this._enhSelectedEssence) { const en = this._enhSelectedEssence.charAt(0).toUpperCase() + this._enhSelectedEssence.slice(1); await _consumeStoredMaterial(buyer, `${en} Essence`, essenceQty); }
      } else {
        await _consumeStoredMaterial(buyer, isWeapon ? "Ephi Shard" : "Amynti Shard", 1);
        if (this._enhSelectedEssence) { const en = this._enhSelectedEssence.charAt(0).toUpperCase() + this._enhSelectedEssence.slice(1); await _consumeStoredMaterial(buyer, `${en} Essence`, essenceQty); }
      }
      await buyer.update({ "system.bio.credits": Math.max(0, (buyer.system.bio.credits ?? 0) - 200) });
      const enhSound = game.actors.get(this.npcActorId)?.system?.enhanceSound;
      if (enhSound) (foundry.audio?.AudioHelper ?? AudioHelper).play({ src: enhSound, volume: 1, autoplay: true, loop: false }, true);
      const result = _rollEnhancement(item, this._enhSelectedEssence, essenceQty);
      result.rerollCount = existing ? rerollCount + 1 : 0;
      enhancements[slotIdx] = result;
      await item.setFlag("dawnbreaker-trials", "enhancements", enhancements);
      await _applyEnhancements(item);
      _craftingLogAdd({ actorName: buyer.name, action: existing ? "reroll" : "enhance", itemName: item.name, rarity, detail: `Slot ${this._enhSelectedSlot}: ${result.label} +${result.value}${result.essence ? ` [${result.essence} x${essenceQty}]` : ""}` });
      this._enhLastResult = result; this._enhSelectedSlot = null; this._enhSelectedEssence = null; this._enhSelectedEssenceQty = 1;
      this.render(false);
    });


    // Category select (buy mode)
    html.find(".db-cat-row").click(ev => {
      this._selectedCategory = ev.currentTarget.dataset.cat;
      this._selectedItemId   = null;
      this.render(false);
    });

    // Item select
    html.find(".db-shop-item-row").click(ev => {
      this._selectedItemId = ev.currentTarget.dataset.itemId;
      this.render(false);
    });

    // Buy cart
    html.find(".shop-add-to-cart-btn").click(ev => this._addToCart(ev.currentTarget.dataset.itemId));
    html.find(".db-cart-remove-btn").click(ev => this._removeFromCart(ev.currentTarget.dataset.itemId));
    html.find(".db-cart-qty").on("change", ev => this._setCartQty(ev.currentTarget.dataset.itemId, parseInt(ev.currentTarget.value) || 1));
    html.find(".db-cart-checkout-btn").click(() => this._checkout());

    // Sell cart
    html.find(".db-sell-item-row").click(ev => {
      this._selectedItemId = ev.currentTarget.dataset.itemId;
      this.render(false);
    });
    html.find(".shop-add-to-sell-btn").click(ev => this._addToSellCart(ev.currentTarget.dataset.itemId));
    html.find(".db-sell-cart-remove-btn").click(ev => this._removeFromSellCart(ev.currentTarget.dataset.itemId));
    html.find(".db-sell-cart-qty").on("change", ev => this._setSellCartQty(ev.currentTarget.dataset.itemId, parseInt(ev.currentTarget.value) || 1));
    html.find(".db-sell-checkout-btn").click(() => this._sellCheckout());
  }

  async close(options = {}) {
    const tokenId = this._buyerTokenId
      ?? canvas?.tokens?.placeables?.find(t => t.actor?.id === this.buyerActorId)?.document?.id;
    if (tokenId) {
      const payload = { type: "shopClose", tokenId };
      if (game.user.isGM) _handleShopClose(payload);
      else game.socket.emit("system.dawnbreaker-trials", payload);
    }
    return super.close(options);
  }
}

// ── GM Shop Tables Manager ─────────────────────────────────────
class DawnbreakerShopTablesApp extends foundry.appv1.api.Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dawnbreaker-shop-tables",
      title: "Shop Table Manager",
      template: "systems/dawnbreaker-trials/templates/shop-tables.html",
      width: 780, height: 580, resizable: true,
      classes: ["dawnbreaker", "db-shop-tables-app"],
    });
  }

  constructor(options = {}) {
    super(options);
    this._activeTableId = null;
  }

  getData() {
    const tables = _getShopTables();
    if (!this._activeTableId && tables.length) this._activeTableId = tables[0].id;
    const activeTable = tables.find(t => t.id === this._activeTableId) ?? null;
    return {
      tables: tables.map(t => ({ ...t, active: t.id === this._activeTableId })),
      activeTable,
      items: activeTable?.items ?? [],
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Wire up drag-and-drop on the main panel
    const dropZone = html.find(".db-tables-main")[0];
    if (dropZone) {
      dropZone.addEventListener("dragover", ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = "copy"; });
      dropZone.addEventListener("drop", ev => { ev.preventDefault(); this._onDrop(ev); });
    }

    html.find(".db-table-list-item").click(ev => {
      this._activeTableId = ev.currentTarget.dataset.tableId;
      this.render(false);
    });

    html.find(".db-table-new-btn").click(async () => {
      const tables    = _getShopTables();
      const newTable  = { id: foundry.utils.randomID(), name: "New Table", items: [] };
      tables.push(newTable);
      this._activeTableId = newTable.id;
      await _setShopTables(tables);
      this.render(false);
    });

    html.find(".db-table-delete-btn").click(async () => {
      if (!this._activeTableId) return;
      const tableName = _getShopTables().find(t => t.id === this._activeTableId)?.name ?? "this table";
      const confirmed = await (foundry.appv1?.applications?.Dialog ?? Dialog).confirm({ title: "Delete Table", content: `<p>Delete <strong>${tableName}</strong>? This cannot be undone.</p>` });
      if (!confirmed) return;
      const tables = _getShopTables().filter(t => t.id !== this._activeTableId);
      this._activeTableId = tables[0]?.id ?? null;
      await _setShopTables(tables);
      this.render(false);
    });

    const saveTableName = async (val) => {
      const tables = _getShopTables();
      const t = tables.find(t => t.id === this._activeTableId);
      if (t && val.trim()) { t.name = val.trim(); await _setShopTables(tables); this.render(false); }
    };
    html.find(".db-table-name-input").change(async ev => saveTableName(ev.currentTarget.value));
    html.find(".db-table-name-input").keydown(async ev => {
      if (ev.key === "Enter") { ev.preventDefault(); await saveTableName(ev.currentTarget.value); }
    });

    html.find(".db-item-add-btn").click(async () => {
      const tables = _getShopTables();
      const t = tables.find(t => t.id === this._activeTableId);
      if (!t) return;
      t.items = t.items ?? [];
      t.items.push({ id: foundry.utils.randomID(), name: "New Item", img: "icons/svg/item-bag.svg", price: 0, qty: -1, category: "General", description: "" });
      await _setShopTables(tables);
      this.render(false);
    });

    html.find(".db-item-del-btn").click(async ev => {
      const itemId = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      const tables = _getShopTables();
      const t = tables.find(t => t.id === this._activeTableId);
      if (!t) return;
      t.items = t.items.filter(i => i.id !== itemId);
      await _setShopTables(tables);
      this.render(false);
    });

    html.find(".db-item-field").change(async ev => {
      const itemId = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      const field  = ev.currentTarget.dataset.field;
      let val      = ev.currentTarget.value;
      if (field === "price" || field === "qty") val = parseInt(val) || 0;
      const tables = _getShopTables();
      const t = tables.find(t => t.id === this._activeTableId);
      if (!t) return;
      const item = t.items?.find(i => i.id === itemId);
      if (item) { item[field] = val; await _setShopTables(tables); }
    });
  }

  async _onDrop(event) {
    if (!this._activeTableId || !game.user.isGM) return;
    let dragData;
    try { dragData = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }

    const tables = _getShopTables();
    const t = tables.find(t => t.id === this._activeTableId);
    if (!t) return;
    t.items = t.items ?? [];

    // Collect items to add — either a single Item or all items in a Folder
    let srcs = [];
    if (dragData?.type === "Item") {
      const src = await fromUuid(dragData.uuid).catch(() => null);
      if (src) srcs = [{ src, uuid: dragData.uuid }];
    } else if (dragData?.type === "Folder") {
      const folder = game.folders.get(dragData.id) ?? await fromUuid(dragData.uuid).catch(() => null);
      if (folder) {
        // Collect all items recursively in this folder
        const collectItems = (f) => {
          const items = (f.contents ?? []).map(item => ({ src: item, uuid: item.uuid }));
          const sub = (f.children ?? []).flatMap(child => collectItems(child.folder ?? child));
          return [...items, ...sub];
        };
        srcs = collectItems(folder).filter(({ src }) => src?.documentName === "Item" || src?.type !== undefined);
      }
    }

    if (!srcs.length) return;

    let added = 0, skipped = 0;
    for (const { src, uuid } of srcs) {
      if (uuid && t.items.some(i => i.uuid === uuid)) { skipped++; continue; }
      t.items.push({
        id:          foundry.utils.randomID(),
        uuid:        uuid ?? null,
        name:        src.name,
        img:         src.img ?? "icons/svg/item-bag.svg",
        price:       src.system?.price ?? src.system?.cost ?? 0,
        qty:         -1,
        category:    "General",
        description: src.system?.description?.value?.replace(/<[^>]+>/g, "") ?? src.system?.desc ?? "",
      });
      added++;
    }

    await _setShopTables(tables);
    this.render(false);
    if (skipped) ui.notifications.info(`Added ${added} item(s) — ${skipped} already in table, skipped.`);
  }
}

function _handleShopClose({ tokenId }) {
  const drawId = _shoppingDrawings.get(tokenId);
  if (drawId && canvas.scene) {
    canvas.scene.deleteEmbeddedDocuments("Drawing", [drawId]).catch(() => {});
    _shoppingDrawings.delete(tokenId);
  }
}

async function _handleShopOpen({ tokenId }) {
  if (!game.user.isGM || !canvas.scene) return;
  const token = canvas.tokens.placeables.find(t => (t.document?.id ?? t.id) === tokenId);
  if (!token) return;
  const { x, y } = token.document;
  const gridSize  = canvas.grid.size;
  const w = Math.ceil(gridSize * 0.9);
  const drawing   = await canvas.scene.createEmbeddedDocuments("Drawing", [{
    author: game.user.id,
    x: x + Math.floor(gridSize * 0.05), y: y - 28,
    shape: { type: "r", width: w, height: 22 },
    fillType: 1, fillColor: "#1a1c20", fillAlpha: 0.9,
    strokeWidth: 1, strokeColor: "#c8a84b", strokeAlpha: 1,
    text: "SHOPPING", fontFamily: "Arial", fontSize: 11,
    textColor: "#c8a84b",
  }]);
  if (drawing?.[0]) _shoppingDrawings.set(tokenId, drawing[0].id);
}

function _playGreetingSound(npcActor) {
  const src = npcActor?.system?.greetingSound;
  if (src) (foundry.audio?.AudioHelper ?? AudioHelper).play({ src, volume: 1, autoplay: true, loop: false }, true);
}

// ── Item Transfer (player-to-player) ─────────────────────────────
async function _openItemTransferDialog(sourceActor, item) {
  const targets = game.actors.filter(a => a.type === "character" && a.id !== sourceActor.id);
  if (!targets.length) { ui.notifications.warn("No other player characters available to send items to."); return; }
  const qtyMax = item.system?.qty ?? 1;
  const options = targets.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
  const content = `
    <div style="font-family:sans-serif;font-size:13px;display:flex;flex-direction:column;gap:8px;padding:6px 0;">
      <div>Send <b>${item.name}</b> to:</div>
      <select id="db-transfer-target" style="width:100%;padding:4px;">${options}</select>
      <div style="display:flex;align-items:center;gap:6px;">
        <label>Quantity:</label>
        <input id="db-transfer-qty" type="number" value="${qtyMax}" min="1" max="${qtyMax}" style="width:70px;padding:3px;"/>
        <span style="color:#888;font-size:11px;">(max ${qtyMax})</span>
      </div>
    </div>`;
  const DialogClass = foundry.appv1?.applications?.Dialog ?? Dialog;
  new DialogClass({
    title: "Send Item",
    content,
    buttons: {
      send: {
        label: "Send",
        callback: async (html) => {
          const targetActorId = html.find("#db-transfer-target").val();
          const qty = Math.max(1, Math.min(qtyMax, parseInt(html.find("#db-transfer-qty").val()) || 1));
          const data = {
            type: "itemTransfer",
            sourceActorId: sourceActor.id,
            targetActorId,
            itemId: item.id,
            qty,
          };
          if (game.user.isGM) await _processItemTransfer(data);
          else game.socket.emit("system.dawnbreaker-trials", data);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "send",
  }).render(true);
}

async function _processItemTransfer({ sourceActorId, targetActorId, itemId, qty }) {
  const sourceActor = game.actors.get(sourceActorId);
  const targetActor = game.actors.get(targetActorId);
  const item = sourceActor?.items.get(itemId);
  if (!sourceActor || !targetActor || !item) return;

  const transferQty = Math.max(1, Math.min(qty ?? 1, item.system?.qty ?? 1));
  const itemData = item.toObject();
  itemData.system.qty = transferQty;
  itemData.system.equipped = false;
  delete itemData._id;

  await targetActor.createEmbeddedDocuments("Item", [itemData]);

  const remaining = (item.system?.qty ?? 1) - transferQty;
  if (remaining > 0) await item.update({ "system.qty": remaining });
  else await item.delete();

  await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #4a9eff;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">📤 <b>${sourceActor.name}</b> sent <b>${item.name}</b>${transferQty > 1 ? ` x${transferQty}` : ""} to <b>${targetActor.name}</b>.</div>` });
}

window._openShop = function(npcActorId, buyerActorId) {
  new DawnbreakerShopApp(npcActorId, buyerActorId).render(true);
};
window._openShopTables = function() {
  new DawnbreakerShopTablesApp().render(true);
};

// ── Token interaction patch ────────────────────────────────────
// Intercept double-click on interactable NPC tokens
Hooks.once("ready", function _patchTokenDblClick() {
  const _orig = Token.prototype._onClickLeft2;
  Token.prototype._onClickLeft2 = async function(event) {
    const actor = this.actor;
    if (actor?.getFlag("dawnbreaker-trials", "isInteractable")) {
      // Find the player's own actor token on the scene
      const myActor = game.user.character ?? game.actors.find(a => a.isOwner && a.type === "character");
      const myToken = canvas.tokens.placeables.find(t => t.actor?.id === myActor?.id);
      if (!myToken) {
        ui.notifications.warn("You need a character token on the scene to interact.");
        return;
      }
      // Proximity check — must be within 1.5 tiles (adjacent)
      const dx = Math.abs(this.document.x - myToken.document.x) / canvas.grid.size;
      const dy = Math.abs(this.document.y - myToken.document.y) / canvas.grid.size;
      const dist = Math.max(dx, dy);
      if (dist > 1.5) {
        ui.notifications.warn(`${actor.name} is too far away to interact with.`);
        return;
      }
      // Notify GM to show SHOPPING label
      const payload = { type: "shopOpen", tokenId: myToken.document.id };
      if (game.user.isGM) await _handleShopOpen(payload);
      else game.socket.emit("system.dawnbreaker-trials", payload);
      _playGreetingSound(actor);
      new DawnbreakerShopApp(actor.id, myActor?.id ?? null, {}, myToken.document.id).render(true);
      return;
    }
    return _orig.call(this, event);
  };
});

// Remove mirror/flip animation — force duration 0 for texture scale changes
// Clean up any orphaned SHOPPING drawings left from a previous session
Hooks.on("canvasReady", () => {
  if (!game.user.isGM || !canvas.scene) return;
  const orphans = canvas.scene.drawings.filter(d => d.text === "SHOPPING").map(d => d.id);
  if (orphans.length) canvas.scene.deleteEmbeddedDocuments("Drawing", orphans).catch(() => {});
  _shoppingDrawings.clear();
});

Hooks.on("canvasReady", () => {
  const _origOnUpdate = Token.prototype._onUpdate;
  Token.prototype._onUpdate = function(changed, options, userId) {
    if (foundry.utils.hasProperty(changed, "texture.scaleX") || foundry.utils.hasProperty(changed, "texture.scaleY")) {
      options = foundry.utils.mergeObject(foundry.utils.deepClone(options ?? {}), { animationDuration: 0, animation: { duration: 0 } });
    }
    return _origOnUpdate.call(this, changed, options, userId);
  };
});

// Suppress the Token HUD (right-click radial menu) entirely
Hooks.on("getTokenContextMenuEntries", (_token, entries) => { entries.splice(0, entries.length); });
Hooks.on("canvasReady", () => {
  Token.prototype._onClickRight = function(event) { event.stopPropagation(); };
  if (canvas.hud?.token) {
    canvas.hud.token.bind = function() {};
    canvas.hud.token.render = function() {};
  }
});

// ── REGISTER ─────────────────────────────────────────────────
Hooks.once("ready", () => {

  // NOTE: this ready hook no longer registers a socket listener. It previously
  // registered a SECOND listener that duplicated only kiShieldPrompt/
  // kiShieldResolved — causing players to get two Ki Shield dialogs and the GM
  // to apply the reduction twice (double damage). The listener in the later
  // ready hook is the sole, complete dispatcher.

  // ── Register last attack type setting ───────────────────
  game.settings.register("dawnbreaker-trials", "lastAttackType", {
    scope: "world", config: false, type: String, default: "physical",
  });

  // ── Block HP/AR/KI restoration on Down actors ───────────
  // Exception: updates that simultaneously remove the Down condition (revive effects)
  Hooks.on("preUpdateActor", (actorDoc, changes, options) => {
    if (options.allowHealDown) return; // explicit override for revive macros
    const isDown = (actorDoc.system.conditions ?? []).some(c =>
      c.name?.toLowerCase() === "down" || c.label === "down"
    );
    if (!isDown) return;

    // If this same update removes Down, allow the heal (e.g. Sacrificial Lamb)
    const newConditions = foundry.utils.getProperty(changes, "system.conditions");
    if (Array.isArray(newConditions)) {
      const stillDown = newConditions.some(c => c.name?.toLowerCase() === "down" || c.label === "down");
      if (!stillDown) return;
    }

    let blocked = false;
    const newHP = foundry.utils.getProperty(changes, "system.hp.current");
    if (newHP !== undefined && newHP > (actorDoc.system.hp?.current ?? 0)) {
      foundry.utils.setProperty(changes, "system.hp.current", actorDoc.system.hp?.current ?? 0);
      blocked = true;
    }
    const newAR = foundry.utils.getProperty(changes, "system.ar.current");
    if (newAR !== undefined && newAR > (actorDoc.system.ar?.current ?? 0)) {
      foundry.utils.setProperty(changes, "system.ar.current", actorDoc.system.ar?.current ?? 0);
      blocked = true;
    }
    const newKI = foundry.utils.getProperty(changes, "system.ki.current");
    if (newKI !== undefined && newKI > (actorDoc.system.ki?.current ?? 0)) {
      foundry.utils.setProperty(changes, "system.ki.current", actorDoc.system.ki?.current ?? 0);
      blocked = true;
    }
    if (blocked) ui.notifications?.info(`${actorDoc.name} is Down — healing blocked.`);
  });

  // ── Cursed Reflection — WIL check before KI is spent ────
  Hooks.on("preUpdateActor", (actorDoc, changes, options) => {
    if (options.cursedReflectionChecked) return; // already passed the check
    const hasCR = (actorDoc.system.conditions ?? []).some(c =>
      c.name?.toLowerCase() === "cursed reflection" || c.label?.toLowerCase() === "cursed reflection"
    );
    if (!hasCR) return;
    const newKI  = foundry.utils.getProperty(changes, "system.ki.current");
    const curKI  = actorDoc.system.ki?.current ?? 0;
    if (newKI === undefined || newKI >= curKI) return; // not spending KI
    // Cancel this update and run the async check
    _cursedReflectionCheck(actorDoc, changes).catch(console.error);
    return false;
  });

  // ── Scorpid Scales auto-toggle ──────────────────────────
  Hooks.on("updateActor", async (actor, changes) => {
    // Only trigger on HP reduction
    const newHP = foundry.utils.getProperty(changes, "system.hp.current");
    if (newHP === undefined) return;
    const oldHP = actor.system.hp?.current ?? 0;
    if (newHP >= oldHP) return;

    // Only GM runs this to avoid duplicate triggers
    if (!game.user.isGM) return;

    // Find equipped Scorpid Scales
    const armor = actor.items.find(i =>
      i.name.toLowerCase().includes("scorpid scales") && i.system?.equipped
    );
    if (!armor) return;

    // Read last attack type set by the attack macro
    let attackType = "physical";
    try { attackType = game.settings.get("dawnbreaker-trials", "lastAttackType"); } catch(e) {}

    const currentMode = armor.system.effect?.includes("mode:magical") ? "magical" : "physical";

    // Only toggle if the attack matched current mode (meaning it got through)
    if (attackType !== currentMode) return;

    const newMode   = attackType === "physical" ? "magical" : "physical";
    const modeColor = newMode === "physical" ? "#e07a30" : "#a080ff";
    const modeLabel = newMode === "physical" ? "Physical (+5 PR)" : "Magical (+5 MR)";
    const modeIcon  = newMode === "physical" ? "🛡" : "✨";
    const trigger   = newMode === "physical"
      ? "Received a magical attack — switching to physical resistance"
      : "Received a physical attack — switching to magical resistance";

    await armor.update({
      "flags.dawnbreaker-trials.modeBonus": newMode === "physical" ? { pr: 5, mr: 0 } : { pr: 0, mr: 5 },
      "system.effect":     `mode:${newMode}`,
    });

    await ChatMessage.create({
      content: `
        <div style="background:#1a1c20;border:1px solid ${modeColor};border-radius:6px;padding:10px;font-family:sans-serif;">
          <div style="font-size:13px;font-weight:700;color:${modeColor};text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #3a3f4a;padding-bottom:5px;margin-bottom:8px;">
            ${modeIcon} Scorpid Scales — Auto Switch
          </div>
          <div style="font-size:12px;color:#d4d8e0;margin-bottom:4px;"><b>${actor.name}</b></div>
          <div style="font-size:12px;color:#7a8090;margin-bottom:6px;">${trigger}</div>
          <div style="background:#222428;border-radius:4px;padding:8px;text-align:center;">
            <div style="font-size:11px;color:#7a8090;text-transform:uppercase;letter-spacing:1px;">Now Active</div>
            <div style="font-size:18px;font-weight:900;color:${modeColor};">${modeLabel}</div>
          </div>
        </div>
      `
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  ITEM DATA MODEL
// ═══════════════════════════════════════════════════════════
class DawnbreakerItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const req    = { required: true, nullable: false };
    const bonus  = () => new fields.NumberField({ required: false, nullable: false, initial: 0, integer: false });

    return {
      itemType:    new fields.StringField({ initial: "common" }),
      slot:        new fields.StringField({ initial: "" }),
      attribute:   new fields.StringField({ initial: "physical" }),
      weaponType:  new fields.StringField({ initial: "" }),
      gearType:    new fields.StringField({ initial: "" }),
      subtype:     new fields.StringField({ initial: "" }),
      attackStat:  new fields.StringField({ initial: "STR" }),
      armorSlot:   new fields.StringField({ initial: "" }),
      slot:        new fields.StringField({ initial: "" }),
      reach:       new fields.NumberField({ ...req, initial: 1, integer: true, min: 1 }),
      cost:        new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
      qty:         new fields.NumberField({ ...req, initial: 1, integer: true, min: 0 }),
      stackLimit:  new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
      equipped:    new fields.BooleanField({ initial: false }),
      expires:     new fields.BooleanField({ initial: false }),
      effect:      new fields.StringField({ initial: "" }),
      recipe:      new fields.StringField({ initial: "" }),
      upgradeNotes:new fields.StringField({ initial: "" }),
      macroName:   new fields.StringField({ initial: "" }),
      rollFormula: new fields.StringField({ initial: "" }),
      animationFile:  new fields.StringField({ initial: "" }),
      animationScale: new fields.NumberField({ required: false, nullable: true, initial: 1.0 }),
      animationSound: new fields.StringField({ initial: "" }),

      rarity:        new fields.StringField({ initial: "basic" }),
      upgradeLevel:  new fields.NumberField({ required: false, nullable: false, initial: 0, integer: true, min: 0, max: 7 }),
      armorSlotType: new fields.StringField({ initial: "" }),
      forgePath:          new fields.StringField({ initial: "" }),
      forgePathSecondary: new fields.StringField({ initial: "" }),
      isTwoHanded:        new fields.BooleanField({ initial: false }),

      bonuses: new fields.SchemaField({
        dam: bonus(), str: bonus(), con: bonus(), agi: bonus(),
        dex: bonus(), int: bonus(), spr: bonus(), for: bonus(),
        wil: bonus(), cha: bonus(), mv:  bonus(), ap:  bonus(),
        ass: bonus(), pr:  bonus(), brk: bonus(), mr:  bonus(),
        ar:  bonus(), hp:  bonus(), ki:  bonus(),
      }),
    };
  }

  prepareDerivedData() {
    const t = this.itemType;
    this.isWeapon = t === "weapon" || t === "offhand";
    this.isArmor  = t === "armor";
    this.isOther  = ["consumable","common","special","craft"].includes(t);
  }
}

// ═══════════════════════════════════════════════════════════
//  ITEM SHEET
// ═══════════════════════════════════════════════════════════
class DawnbreakerItemSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dawnbreaker","dawnbreaker-item","sheet"],
      template: "systems/dawnbreaker-trials/templates/item-sheet.html",
      width: 560,
      height: 600,
      resizable: true,
      tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "item-details" }],
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.item.system;
    context.item   = this.item;
    context.isGM   = game.user.isGM;
    const level = this.item.system?.upgradeLevel ?? 0;
    const rarity = this.item.system?.rarity ?? "basic";
    const isWeapon = this.item.system?.isWeapon ?? (this.item.system?.itemType === "weapon");
    const isArmor  = this.item.type === "armor" || this.item.system?.itemType === "armor";
    const rawEnhs = this.item.getFlag("dawnbreaker-trials", "enhancements") ?? [];
    const totalSlots = 1 + level;
    const enhSlots = [];
    const slot0Flag = this.item.getFlag("dawnbreaker-trials", "slot0") ?? {};
    const selectedGrowthPath = this.item.getFlag("dawnbreaker-trials", "growthPath") ?? null;
    const forgePath = this.item.system?.forgePath ?? "";
    const armorSlot = this.item.system?.slot ?? "";
    const weaponGrowth = (isWeapon && selectedGrowthPath) ? _getPathLevelGrowth(selectedGrowthPath, level) : {};

    // Slot0 label: macro > custom stat > weapon DAM > armor base bonuses
    let slot0Label;
    if (slot0Flag.macroName) {
      slot0Label = `🔒 ${slot0Flag.macroName}`;
    } else if (slot0Flag.stat) {
      slot0Label = `${slot0Flag.stat.toUpperCase()} +${slot0Flag.value ?? 0}`;
    } else if (isWeapon) {
      const bonusDam = this.item.system?.bonuses?.dam ?? 0;
      const growthDam = weaponGrowth.dam ?? 0;
      const fixedDam = selectedGrowthPath ? 0 : (2 + level);
      const totalDam = fixedDam + bonusDam + growthDam;
      const otherParts = Object.entries(weaponGrowth).filter(([k,v]) => v && k !== 'dam').map(([k,v]) => `+${v}${k.toUpperCase()}`);
      const parts = [`DAM +${totalDam}`, ...otherParts];
      slot0Label = parts.join(" ");
    } else if (isArmor) {
      const b = this.item.system?.bonuses ?? {};
      const parts = Object.entries(b).filter(([,v]) => v > 0).map(([k,v]) => `+${v}${k.toUpperCase()}`);
      slot0Label = parts.length ? parts.join(" ") : "BASE";
    } else {
      slot0Label = "BASE";
    }

    // Growth path label for slot0 sub-text
    let growthLabel = "";
    if (isArmor || isWeapon) {
      const rates = _getGrowthPathRates(selectedGrowthPath, forgePath, armorSlot);
      growthLabel = _formatGrowthRates(rates);
    }

    // Build growth path dropdown options
    let customPaths = [];
    try { customPaths = game.settings.get("dawnbreaker-trials", "growthPaths") ?? []; } catch(e) {}
    const growthPathOptions = [
      { id: "", name: "— Auto (from forge type) —" },
      ...BUILTIN_GROWTH_PATHS,
      ...customPaths,
    ];

    enhSlots.push({ slotIndex: 0, label: slot0Label, badge: "FIXED", type: "fixed" });
    for (let s = 1; s < totalSlots; s++) {
      const e = rawEnhs[s - 1];
      if (e?.macroName) {
        enhSlots.push({ slotIndex: s, label: e.macroName, badge: "🔒 ABILITY", type: "gmfixed" });
      } else {
        enhSlots.push(e
          ? { slotIndex: s, label: `${e.label ?? e.stat?.toUpperCase()} +${e.value}`, badge: e.gmFixed ? "🔒 GM" : (e.essence ? e.essence.toUpperCase() : (isWeapon ? "EPHI" : "AMYNTI")), type: e.gmFixed ? "gmfixed" : (e.essence ? "elemental" : "filled") }
          : { slotIndex: s, label: "EMPTY", badge: "", type: "empty" }
        );
      }
    }
    context.enhSlots   = enhSlots;
    context.hasEnhData = ["weapon","armor","offhand"].includes(this.item.system?.itemType ?? "") || ["weapon","armor","offhand"].includes(this.item.type ?? "") || level > 0 || rawEnhs.length > 0;
    context.rarityLabel = _rarityLabel(rarity);
    context.rarityColor = _rarityColor(rarity);
    const enhSlotsGM = [];
    const s0IsAbility = !!slot0Flag.macroName;
    // Compute slot0 base stat display from growth path or item bonuses
    let slot0BaseSummary = "";
    if (isArmor) {
      const pathRatesObj = _getGrowthPathRates(selectedGrowthPath, forgePath, armorSlot);
      const b = this.item.system?.bonuses ?? {};
      const parts = Object.entries(b).filter(([,v]) => v > 0).map(([k,v]) => `+${v} ${k.toUpperCase()}`);
      slot0BaseSummary = parts.length ? parts.join("  ") : "— set via Growth Path —";
    } else if (isWeapon) {
      const bonusDam = this.item.system?.bonuses?.dam ?? 0;
      const growthDam = weaponGrowth.dam ?? 0;
      const fixedDam = selectedGrowthPath ? 0 : (2 + level);
      const totalDam = fixedDam + bonusDam + growthDam;
      const otherParts = Object.entries(weaponGrowth).filter(([k,v]) => v && k !== 'dam').map(([k,v]) => `+${v} ${k.toUpperCase()}`);
      slot0BaseSummary = [`DAM +${totalDam}`, ...otherParts].join("  ");
    }
    enhSlotsGM.push({ slotIndex: 0, isSlot0: true, isAbility: s0IsAbility, macroName: slot0Flag.macroName ?? "", stat: slot0Flag.stat ?? "", value: slot0Flag.value ?? (isWeapon ? 2 + level : 0), essence: "", isFilled: !!(slot0Flag.stat || slot0Flag.macroName), slot0BaseSummary });
    for (let s = 1; s < totalSlots; s++) {
      const e = rawEnhs[s - 1];
      const isAbility = !!(e?.macroName);
      enhSlotsGM.push({ slotIndex: s, isSlot0: false, isAbility, macroName: e?.macroName ?? "", stat: e?.stat ?? "", value: e?.value ?? 0, essence: e?.essence ?? "", isFilled: !!e });
    }
    context.enhSlotsGM = enhSlotsGM;
    context.isArmor = isArmor;
    context.showGrowthPath = isArmor || isWeapon;
    context.selectedGrowthPath = selectedGrowthPath ?? "";
    context.growthPathOptions = growthPathOptions;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".test-macro-btn").click(() => {
      const macroName = this.item.system.macroName;
      const formula   = this.item.system.rollFormula;
      _executeMacroOrRoll(macroName, formula, null, this.item);
    });

    if (game.user.isGM) {
      const saveSlot = async (slot) => {
        const row = html.find(`.db-enh-gm-row[data-slot='${slot}']`)[0];
        if (!row) return;
        const isAbility = row.querySelector(".db-enh-gm-ability-toggle")?.checked ?? false;
        if (slot === 0) {
          if (isAbility) {
            const macro = (row.querySelector(".db-enh-gm-macro")?.value ?? "").trim() || null;
            await this.item.setFlag("dawnbreaker-trials", "slot0", { macroName: macro });
          } else {
            const stat = row.querySelector(".db-enh-gm-stat")?.value || null;
            const val  = parseInt(row.querySelector(".db-enh-gm-val")?.value) || 0;
            await this.item.setFlag("dawnbreaker-trials", "slot0", { stat, value: val });
          }
        } else {
          const rawEnhs = foundry.utils.deepClone(this.item.getFlag("dawnbreaker-trials", "enhancements") ?? []);
          const idx = slot - 1;
          if (isAbility) {
            const macro = (row.querySelector(".db-enh-gm-macro")?.value ?? "").trim();
            rawEnhs[idx] = macro ? { macroName: macro, gmFixed: true, stat: null, value: 0, label: macro } : undefined;
          } else {
            const stat = row.querySelector(".db-enh-gm-stat")?.value ?? "";
            const val  = parseInt(row.querySelector(".db-enh-gm-val")?.value) || 0;
            const ess  = row.querySelector(".db-enh-gm-essence")?.value || null;
            rawEnhs[idx] = stat ? { stat, value: val, label: stat.toUpperCase(), essence: ess, gmFixed: true, rerollCount: rawEnhs[idx]?.rerollCount ?? 0 } : undefined;
          }
          await this.item.setFlag("dawnbreaker-trials", "enhancements", rawEnhs.filter(e => e?.stat || e?.macroName));
        }
      };

      html.find(".db-enh-gm-ability-toggle").on("change", async (ev) => {
        const slot = parseInt(ev.currentTarget.closest(".db-enh-gm-row").dataset.slot);
        const isAbility = ev.currentTarget.checked;
        const row = ev.currentTarget.closest(".db-enh-gm-row");
        row.querySelector(".db-enh-gm-stat-block").style.display = isAbility ? "none" : "";
        row.querySelector(".db-enh-gm-ability-block").style.display = isAbility ? "" : "none";
        await saveSlot(slot);
      });

      html.find(".db-enh-gm-stat, .db-enh-gm-val, .db-enh-gm-essence, .db-enh-gm-macro").on("change", async (ev) => {
        const slot = parseInt(ev.currentTarget.closest(".db-enh-gm-row").dataset.slot);
        await saveSlot(slot);
      });

      html.find(".db-enh-gm-clear").click(async (ev) => {
        const slot = parseInt(ev.currentTarget.dataset.slot);
        if (slot === 0) {
          await this.item.setFlag("dawnbreaker-trials", "slot0", {});
        } else {
          await this.item.setFlag("dawnbreaker-trials", "enhancements",
            (this.item.getFlag("dawnbreaker-trials", "enhancements") ?? []).filter((e, i) => (e?.stat || e?.macroName) && i !== slot - 1));
        }
      });

      html.find(".db-growth-path-select").on("change", async (ev) => {
        const val = ev.currentTarget.value;
        if (val) {
          let path = BUILTIN_GROWTH_PATHS.find(p => p.id === val);
          if (!path) {
            try {
              const customs = game.settings.get("dawnbreaker-trials", "growthPaths") ?? [];
              path = customs.find(p => p.id === val);
            } catch(e) {}
          }
          const update = { [`flags.dawnbreaker-trials.growthPath`]: val };
          // Zero out all bonus stats first, then apply path base values
          const allBonusKeys = ["dam","str","con","agi","dex","int","spr","for","wil","cha","mv","ap","ass","pr","brk","mr","ar","hp","ki"];
          for (const k of allBonusKeys) update[`system.bonuses.${k}`] = 0;
          if (path?.base) {
            for (const [k, v] of Object.entries(path.base)) update[`system.bonuses.${k}`] = v;
          }
          await this.item.update(update);
        } else {
          await this.item.update({ [`flags.dawnbreaker-trials.growthPath`]: null });
        }
      });

      html.find(".db-growth-path-manage").click(() => window._openGrowthPathEditor());
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  EQUIPPED ITEM BONUS HELPER
//  Called from prepareDerivedData on the actor to sum up
//  all equipped item bonuses and return them
// ═══════════════════════════════════════════════════════════
function getEquippedBonuses(actor) {
  const totals = {
    dam:0, str:0, con:0, agi:0, dex:0, int:0, spr:0,
    for:0, wil:0, cha:0, mv:0,  ap:0,  ass:0, pr:0,
    brk:0, mr:0,  ar:0,  hp:0,  ki:0,
  };
  for (const item of actor.items) {
    if (item.type !== "equipment" && item.type !== "weapon" && item.type !== "armor" && item.type !== "offhand") {
      // Only apply bonuses from gear items that are equipped
    }
    const s = item.system;
    if (!s?.equipped) continue;
    const b = s.bonuses;
    if (!b) continue;
    for (const key of Object.keys(totals)) {
      totals[key] += (b[key] ?? 0);
    }
    // Mode bonus (Scorpid Scales style) stored in flag, separate from growth path bonuses
    const modeBonus = item.getFlag?.("dawnbreaker-trials", "modeBonus");
    if (modeBonus) {
      for (const key of Object.keys(totals)) {
        totals[key] += (modeBonus[key] ?? 0);
      }
    }
  }
  return totals;
}


// ═══════════════════════════════════════════════════════════
//  ABILITY DATA MODEL
// ═══════════════════════════════════════════════════════════
class DawnbreakerAbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const req    = { required: true, nullable: false };
    return {
      class:       new fields.StringField({ initial: "" }),
      abilityType: new fields.StringField({ initial: "mainActive" }),
      jpCost:      new fields.StringField({ initial: "" }),
      attribute:   new fields.StringField({ initial: "" }),
      reach:       new fields.StringField({ initial: "" }),
      range:       new fields.StringField({ initial: "" }),
      apCost:      new fields.StringField({ initial: "" }),
      kiCost:      new fields.StringField({ initial: "" }),
      speed:       new fields.StringField({ initial: "instant" }),
      skillLevel:  new fields.StringField({ initial: "" }),
      maxUses:     new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
      effect:      new fields.StringField({ initial: "" }),
      misc:        new fields.StringField({ initial: "" }),
      macroName:   new fields.StringField({ initial: "" }),
      rollFormula: new fields.StringField({ initial: "" }),
    };
  }
}

// ═══════════════════════════════════════════════════════════
//  ABILITY SHEET
// ═══════════════════════════════════════════════════════════
class DawnbreakerAbilitySheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dawnbreaker","dawnbreaker-item","dawnbreaker-ability","sheet"],
      template: "systems/dawnbreaker-trials/templates/ability-sheet.html",
      width: 520,
      height: 520,
      tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "ability-details" }],
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.item.system;
    context.item   = this.item;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".test-macro-btn").click(() => {
      const macroName = this.item.system.macroName;
      const formula   = this.item.system.rollFormula;
      _executeMacroOrRoll(macroName, formula, null, this.item);
    });
  }
}

// ═══════════════════════════════════════════════════════════
//  SHARED MACRO / ROLL EXECUTOR
//  Used by both ability roll buttons and item test buttons
// ═══════════════════════════════════════════════════════════
function _executeMacroOrRoll(macroName, formula, actor, item) {
  // 1. Try named macro first
  if (macroName) {
    const macro = game.macros.find(m => m.name === macroName);
    if (macro) {
      macro.execute({ actor, item });
      return;
    }
  }
  // 2. Fall back to roll formula
  if (formula && actor) {
    const roll = new Roll(formula, actor.getRollData());
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<b>${item?.name ?? "Roll"}</b>`,
      rollMode: game.settings.get("core", "rollMode"),
    });
    return;
  }
  // 3. No macro or formula — post helpful message
  const aName = item?.name ?? "this ability";
  ChatMessage.create({
    content: `<b>${aName}</b> — no macro named "<i>${macroName || "(none)"}</i>" found and no roll formula set. Open the item and assign a macro or formula on the Macro tab.`,
  });
}

// ═══════════════════════════════════════════════════════════
//  TOKEN HIGHLIGHT HELPER
// ═══════════════════════════════════════════════════════════
async function _highlightToken(token, active) {
  if (!token) return;
  try {
    await token.document.update({
      "light.bright": active ? 0.5 : 0,
      "light.dim":    active ? 1   : 0,
      "light.color":  active ? "#ff0000" : "#000000",
      "light.alpha":  active ? 0.15 : 0,
    });
  } catch(e) { console.warn("CTB | Could not highlight token:", e); }
}

// ═══════════════════════════════════════════════════════════
//  CURSED REFLECTION — async WIL check helper
//  Returns true if the actor may proceed, false if blocked.
//  Call window._checkCursedReflection(actor) from any KI macro.
// ═══════════════════════════════════════════════════════════
async function _cursedReflectionCheck(actorDoc, changes) {
  const DC = 10;
  const wilMod = actorDoc.type === "npc"
    ? (actorDoc.system.stats?.WIL ?? 0)
    : (actorDoc.system.stats?.WIL?.mod ?? 0);

  const roll = await new Roll("1d20 + @v", { v: wilMod }).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: actorDoc }),
    flavor: `<b>${actorDoc.name}</b> — Cursed Reflection WIL Check (DC ${DC})`,
    rollMode: "publicroll",
  });

  if (roll.total >= DC) {
    // Passed — re-apply the blocked KI update
    await actorDoc.update(changes, { cursedReflectionChecked: true });
    ChatMessage.create({
      content: `<div style="color:#2ecc71;font-weight:700;font-size:13px;letter-spacing:1px;">✔ ${actorDoc.name} resists the Cursed Reflection! (${roll.total} ≥ ${DC})</div>`,
      speaker: ChatMessage.getSpeaker({ actor: actorDoc }),
    });
  } else {
    ChatMessage.create({
      content: `<div style="color:#e05555;font-weight:700;font-size:13px;letter-spacing:1px;">✕ Cursed Reflection blocks ${actorDoc.name}'s cast! (${roll.total} < ${DC})</div>`,
      speaker: ChatMessage.getSpeaker({ actor: actorDoc }),
    });
  }
}

// Universal KI spender for macros.
// Usage: if (!await window._spendKI(actor, cost)) return;
// Runs Cursed Reflection check if the actor has it, then deducts KI.
// Returns false if blocked (CR failed or not enough KI), true if spent successfully.
window._spendKI = async function(actorDoc, amount) {
  if (!actorDoc) return false;
  const currentKI = actorDoc.system.ki?.current ?? 0;

  // KI availability check
  if (amount > 0 && currentKI < amount) {
    ui.notifications.warn(`Not enough KI! Need ${amount}, have ${currentKI}.`);
    return false;
  }

  // Cursed Reflection check
  const hasCR = (actorDoc.system.conditions ?? []).some(c =>
    c.name?.toLowerCase() === "cursed reflection" || c.label?.toLowerCase() === "cursed reflection"
  );
  if (hasCR) {
    const DC = 10;
    const wilMod = actorDoc.type === "npc"
      ? (actorDoc.system.stats?.WIL ?? 0)
      : (actorDoc.system.stats?.WIL?.mod ?? 0);
    const roll = await new Roll("1d20 + @v", { v: wilMod }).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actorDoc }),
      flavor: `<b>${actorDoc.name}</b> — Cursed Reflection WIL Check (DC ${DC})`,
      rollMode: "publicroll",
    });
    const passed = roll.total >= DC;
    await ChatMessage.create({ content: passed
      ? `<div style="background:#1a1c20;border:1px solid #2ecc71;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">✔ <b>${actorDoc.name}</b> resists <b>Cursed Reflection</b>! (${roll.total} ≥ ${DC})</div>`
      : `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">✕ <b>Cursed Reflection</b> blocks <b>${actorDoc.name}</b>'s ability! (${roll.total} < ${DC})</div>`
    });
    if (!passed) return false;
  }

  // Deduct KI
  if (amount > 0) {
    await actorDoc.update({ "system.ki.current": Math.max(0, currentKI - amount) }, { cursedReflectionChecked: true });
  }
  return true;
};

// ═══════════════════════════════════════════════════════════
//  MOVEMENT RANGE HIGHLIGHT
// ═══════════════════════════════════════════════════════════
const CTB_MOVE_LAYER = "crucible.movement";
let _dbMoveActiveTokenId = null; // token whose movement range is currently displayed

function _getMVTotal(actor) {
  let mv = actor.type === "npc" ? (actor.system.stats?.MV ?? 3) : (actor.system.stats?.MV?.total ?? 3);
  const conditions = actor.system.conditions ?? [];
  // Crippled — MV drops to 0 until condition is removed
  if (conditions.some(c => c.label === "crippled" || c.name?.toLowerCase() === "crippled")) return 0;
  // Slowed — reduce MV by the amount stored in effect (e.g. effect: "3" → −3 MV)
  const slowedCond = conditions.find(c => c.label === "slowed" || c.name?.toLowerCase() === "slowed");
  if (slowedCond) mv = Math.max(0, mv - (parseInt(slowedCond.effect) || 0));
  return mv;
}

async function _showMovementRange(token, mvOverride = null) {
  if (!canvas.interface?.grid) return;
  const actor = token.actor;
  if (!actor) return;
  _dbMoveActiveTokenId = token.document?.id ?? token.id;
  const mv   = mvOverride !== null ? mvOverride : _getMVTotal(actor);
  const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
  const tileX = Math.round(token.document.x / size);
  const tileY = Math.round(token.document.y / size);
  const allTokens = canvas.tokens.placeables;
  const isAlly = (t) => {
    if (t.id === token.id) return true;
    return t.document.disposition === token.document.disposition;
  };
  const reachable = new Set();
  const queue   = [{ x: tileX, y: tileY, remaining: mv }];
  const visited = new Map();
  visited.set(`${tileX},${tileY}`, mv);
  while (queue.length > 0) {
    const { x, y, remaining } = queue.shift();
    if (remaining <= 0) continue;
    for (const n of [{ x: x+1, y }, { x: x-1, y }, { x, y: y+1 }, { x, y: y-1 }]) {
      const fromCenter = { x: x * size + size/2, y: y * size + size/2 };
      const toCenter   = { x: n.x * size + size/2, y: n.y * size + size/2 };
      let wallBlocked = false;
      try {
        wallBlocked = CONFIG.Canvas.polygonBackends.move.testCollision(fromCenter, toCenter, { type: "move", mode: "any" });
      } catch(e) {
        try { wallBlocked = canvas.walls.checkCollision(new Ray(fromCenter, toCenter), { type: "move" }); } catch(e2) {}
      }
      if (wallBlocked) continue;
      // Cannot move onto or through a hostile unit — block its FULL footprint
      // (multi-tile enemies occupy width×height tiles, not just their corner).
      const blocked = allTokens.some(t => {
        if (isAlly(t)) return false;
        const tx0 = Math.round(t.document.x / size), ty0 = Math.round(t.document.y / size);
        const tw  = Math.max(1, Math.round(t.document.width  ?? 1));
        const th  = Math.max(1, Math.round(t.document.height ?? 1));
        return n.x >= tx0 && n.x < tx0 + tw && n.y >= ty0 && n.y < ty0 + th;
      });
      if (blocked) continue;

      // Sentinel check — enemy Sentinel tokens block adjacent tiles for passage
      const sentinelBlocked = allTokens.some(t => {
        if (!t.actor || isAlly(t)) return false;
        const hasSentinel = t.actor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("sentinel"))
          || Object.values(t.actor.system.abilities ?? {}).some(arr =>
              Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("sentinel")));
        if (!hasSentinel) return false;
        const ex = Math.round(t.document.x/size);
        const ey = Math.round(t.document.y/size);
        // Block tiles adjacent to sentinel (but not the sentinel's own tile)
        const dist = Math.abs(n.x - ex) + Math.abs(n.y - ey);
        return dist <= 1 && !(n.x === ex && n.y === ey);
      });
      if (sentinelBlocked) continue;

      // Menace check — enemy Menace tokens block tiles in front (facing direction, weapon reach)
      const menaceBlocked = allTokens.some(t => {
        if (!t.actor || isAlly(t)) return false;
        const hasMenace = t.actor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("menace"))
          || Object.values(t.actor.system.abilities ?? {}).some(arr =>
              Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("menace")));
        if (!hasMenace) return false;
        const ex = Math.round(t.document.x / size);
        const ey = Math.round(t.document.y / size);
        // Get weapon reach
        const weaponReach = t.actor.items.find(i => ["weapon","offhand"].includes(i.type) && i.system.equipped)?.system?.reach ?? 1;
        // Get facing from About Face flag
        const afDir  = t.document.flags?.["about-face"]?.direction ?? 90;
        const facing = afDir < 45 || afDir >= 315 ? "E" : afDir < 135 ? "S" : afDir < 225 ? "W" : "N";
        // Check if tile n is in the facing cone (straight line in facing direction)
        const dx = n.x - ex;
        const dy = n.y - ey;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist === 0 || dist > weaponReach) return false;
        switch (facing) {
          case "N": return dy < 0 && dx === 0;
          case "S": return dy > 0 && dx === 0;
          case "E": return dx > 0 && dy === 0;
          case "W": return dx < 0 && dy === 0;
        }
        return false;
      });
      if (menaceBlocked) continue;
      const nKey = `${n.x},${n.y}`;
      const newRem = remaining - 1;
      if (newRem > (visited.get(nKey) ?? -1)) {
        visited.set(nKey, newRem);
        reachable.add(nKey);
        if (newRem > 0) queue.push({ x: n.x, y: n.y, remaining: newRem });
      }
    }
  }
  canvas.interface.grid.clearHighlightLayer(CTB_MOVE_LAYER);
  canvas.interface.grid.addHighlightLayer(CTB_MOVE_LAYER);
  for (const tileKey of reachable) {
    const [tx, ty] = tileKey.split(",").map(Number);
    canvas.interface.grid.highlightPosition(CTB_MOVE_LAYER, { x: tx * size, y: ty * size, color: 0x3399ff, border: 0x0055cc, alpha: 0.25 });
  }
  // Push movement layer to the back so other highlights (targets, blink) render on top
  try {
    const mvLayer = canvas.interface.grid.getHighlightLayer(CTB_MOVE_LAYER);
    if (mvLayer) {
      mvLayer.zIndex = -100;
      const parent = mvLayer.parent;
      if (parent) { parent.sortableChildren = true; parent.sortChildren(); }
    }
  } catch(e) {}
}

async function _clearMovementRange() {
  _dbMoveActiveTokenId = null;
  canvas.interface?.grid?.clearHighlightLayer(CTB_MOVE_LAYER);
}

// ═══════════════════════════════════════════════════════════
//  DUPLICATE TOKEN — AUTO-UNLINK, AUTO-NUMBER, CANVAS OVERLAY
// ═══════════════════════════════════════════════════════════

function _getBaseName(name) {
  return (name ?? "").replace(/\s+\d+$/, "").trim();
}

function _refreshDbNumberOverlay(token) {
  if (token._dbNumOverlay) {
    try { token._dbNumOverlay.destroy({ children: true }); } catch(e) {}
    token._dbNumOverlay = null;
  }
  const match = token.document?.name?.match(/\s(\d+)$/);
  if (!match) return;
  const num = match[1];
  const gridSize = canvas.grid?.sizeX ?? canvas.grid?.size ?? 100;
  const tokenW   = (token.document?.width ?? 1) * gridSize;
  const fontSize = Math.max(16, Math.round(tokenW * 0.22));
  const style = new PIXI.TextStyle({
    fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
    fontSize,
    fontWeight: "900",
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: Math.max(3, Math.round(fontSize * 0.18)),
    dropShadow: false,
  });
  const text = new PIXI.Text(num, style);
  text.anchor.set(0, 0);
  text.position.set(4, 4);
  text.zIndex = 999;
  token._dbNumOverlay = text;
  token.addChild(text);
}

// ── Live stat overlay (current HP/AR/KI) mounted on the token ──────────────
// Per-client toggle (default: GM on, players off). GMs see every unit; players
// only see allies/friendly/owned tokens and enemies that have been Scanned —
// preserving the Scan mechanic while letting the table read the board.
window._dbStatOverlayEnabled = () => {
  const v = localStorage.getItem("dbt-stat-overlay");
  if (v === null) return game.user.isGM; // default: on for GM, off for players
  return v === "1";
};
window._dbToggleStatOverlay = () => {
  const now = !window._dbStatOverlayEnabled();
  localStorage.setItem("dbt-stat-overlay", now ? "1" : "0");
  for (const t of canvas.tokens?.placeables ?? []) _refreshDbStatOverlay(t);
  window.DawnbreakerPartyHUD?.render?.();
  return now;
};

function _refreshDbStatOverlay(token) {
  // Tear down any existing overlay first
  if (token._dbStatOverlay) {
    try { token._dbStatOverlay.destroy({ children: true }); } catch(e) {}
    token._dbStatOverlay = null;
  }
  if (!window._dbStatOverlayEnabled()) return;
  const actor = token.actor;
  if (!actor) return;
  const sys = actor.system;
  if (!sys?.hp) return; // only actors with the DBT resource schema

  // Player visibility scope: friendly/owned always; enemies only when Scanned
  if (!game.user.isGM) {
    const FRIENDLY = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    const friendlyOrOwned = token.document.disposition === FRIENDLY || actor.isOwner;
    const scanned = (sys.conditions ?? []).some(c =>
      (c.name ?? "").toLowerCase() === "scan" || (c.label ?? "").toLowerCase() === "scan");
    if (!friendlyOrOwned && !scanned) return;
  }

  const hp = sys.hp ?? {}, ar = sys.ar ?? {}, ki = sys.ki ?? {};
  const hasKI = (ki.max ?? 0) > 0;

  const gridSize = canvas.grid?.sizeX ?? canvas.grid?.size ?? 100;
  const tokenW   = (token.document?.width  ?? 1) * gridSize;
  const tokenH   = (token.document?.height ?? 1) * gridSize;

  // Current values only, color-coded (no labels, no max)
  const vals = [
    { cur: hp.current ?? 0, color: 0xff5555 },
    { cur: ar.current ?? 0, color: 0x66a8ff },
  ];
  if (hasKI) vals.push({ cur: ki.current ?? 0, color: 0x4dff9a });

  const fontSize = Math.max(13, Math.round(tokenW * 0.20));
  const gap = Math.round(fontSize * 0.30);

  const container = new PIXI.Container();
  container.zIndex = 998;
  container.eventMode = "none";

  const style = new PIXI.TextStyle({
    fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
    fontSize, fontWeight: "900", fill: 0xffffff,
    stroke: 0x000000, strokeThickness: Math.max(3, Math.round(fontSize * 0.22)),
    dropShadow: true, dropShadowColor: 0x000000, dropShadowBlur: 2,
    dropShadowDistance: 0, dropShadowAlpha: 0.9,
  });
  const texts = vals.map(v => {
    const t = new PIXI.Text(String(v.cur), style.clone());
    t.style.fill = v.color;
    t.anchor.set(0, 1); // baseline at bottom
    return t;
  });

  const rowW = texts.reduce((w, t) => w + t.width, 0) + gap * (texts.length - 1);
  const bottomMargin = Math.max(2, Math.round(tokenH * 0.03));
  let x = Math.round((tokenW - rowW) / 2); // centered horizontally
  const baselineY = tokenH - bottomMargin; // justified to bottom, overlaid

  for (const t of texts) {
    t.position.set(x, baselineY);
    container.addChild(t);
    x += t.width + gap;
  }

  // Spent once-per-combat abilities — small strikethrough tags at the token top
  // (GM only, since players shouldn't see enemy ability state).
  if (game.user.isGM) {
    const flags = actor.flags?.["dawnbreaker-trials"] ?? {};
    const spent = _DB_ONCE_PER_COMBAT.filter(a => flags[a.flag]).map(a => a.label);
    if (spent.length) {
      const tagFont = Math.max(9, Math.round(tokenW * 0.11));
      const tagStyle = new PIXI.TextStyle({
        fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
        fontSize: tagFont, fontWeight: "700", fill: 0xe07a30,
        stroke: 0x000000, strokeThickness: Math.max(2, Math.round(tagFont * 0.2)),
      });
      const tagText = new PIXI.Text(`⊘ ${spent.join(" · ")}`, tagStyle);
      tagText.anchor.set(0.5, 0);
      tagText.position.set(Math.round(tokenW / 2), Math.max(2, Math.round(tokenH * 0.02)));
      container.addChild(tagText);
    }
  }

  token._dbStatOverlay = container;
  token.addChild(container);
}
// Once-per-combat abilities surfaced on the GM overlay when their flag is set
const _DB_ONCE_PER_COMBAT = [
  { flag: "ambushUsed",     label: "AMBUSH" },
  { flag: "shellUsed",      label: "SHELL" },
  { flag: "shatterUsed",    label: "SHATTER" },
  { flag: "myrBandageUsed", label: "BANDAGE" },
];

// Draw / refresh overlay whenever a token is rendered
Hooks.on("drawToken",    token => { _refreshDbNumberOverlay(token); _refreshDbStatOverlay(token); });
Hooks.on("refreshToken", token => {
  if (!token._dbNumOverlay)  _refreshDbNumberOverlay(token);
  if (!token._dbStatOverlay) _refreshDbStatOverlay(token);
});

// Refresh the stat overlay when an actor's HP/AR/KI changes, or when its Scan
// condition is added/removed (so newly-scanned enemies reveal to players).
Hooks.on("updateActor", (actor, changes) => {
  const touched = foundry.utils.hasProperty(changes, "system.hp")
    || foundry.utils.hasProperty(changes, "system.ar")
    || foundry.utils.hasProperty(changes, "system.ki")
    || foundry.utils.hasProperty(changes, "system.conditions")
    || foundry.utils.hasProperty(changes, "flags.dawnbreaker-trials"); // spent-ability tags
  if (!touched) return;
  // For an unlinked token's synthetic actor, refresh only that exact token;
  // for a world actor, refresh every linked token sharing its id.
  if (actor.isToken && actor.token) {
    const t = canvas.tokens?.placeables?.find(p => p.document.id === actor.token.id);
    if (t) _refreshDbStatOverlay(t);
    return;
  }
  for (const t of canvas.tokens?.placeables ?? []) {
    if (t.document.actorLink && t.actor?.id === actor.id) _refreshDbStatOverlay(t);
  }
});

// Re-number and re-overlay all siblings when a token is placed
Hooks.on("createToken", async (tokenDoc) => {
  if (!game.user.isGM) return;
  const scene = tokenDoc.parent;
  if (!scene) return;
  const actorId = tokenDoc.actorId;
  if (!actorId) return;

  const allSame = [...scene.tokens.filter(t => t.actorId === actorId)]
    .sort((a, b) => (a.id < b.id ? -1 : 1)); // oldest first

  if (allSame.length <= 1) return; // only one on scene — nothing to do

  const baseName = _getBaseName(game.actors.get(actorId)?.name ?? tokenDoc.name);

  // Build batch update: number all siblings, unlink all except the oldest
  const updates = allSame.map((t, i) => {
    const expectedName = `${baseName} ${i + 1}`;
    const update = { _id: t.id };
    if (t.name !== expectedName)        update.name      = expectedName;
    if (i > 0 && t.actorLink !== false) update.actorLink = false;
    return update;
  }).filter(u => Object.keys(u).length > 1);

  if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);

  // Refresh PIXI overlays for all affected tokens
  setTimeout(() => {
    for (const t of allSame) {
      const obj = canvas.tokens.placeables.find(p => p.document.id === t.id);
      if (obj) _refreshDbNumberOverlay(obj);
    }
  }, 120);
});

// Re-number when a duplicate is deleted so gaps don't appear
Hooks.on("deleteToken", async (tokenDoc) => {
  if (!game.user.isGM) return;
  const scene = tokenDoc.parent;
  if (!scene) return;
  const actorId = tokenDoc.actorId;
  if (!actorId) return;

  const allSame = [...scene.tokens.filter(t => t.actorId === actorId && t.id !== tokenDoc.id)]
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  if (allSame.length === 0) return;

  const baseName = _getBaseName(game.actors.get(actorId)?.name ?? tokenDoc.name);

  if (allSame.length === 1) {
    // Only one left — strip the number, revert to plain name
    if (allSame[0].name !== baseName)
      await scene.updateEmbeddedDocuments("Token", [{ _id: allSame[0].id, name: baseName }]);
  } else {
    // Renumber remaining tokens
    const updates = allSame.map((t, i) => {
      const expectedName = `${baseName} ${i + 1}`;
      return t.name !== expectedName ? { _id: t.id, name: expectedName } : null;
    }).filter(Boolean);
    if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
  }

  setTimeout(() => {
    for (const t of allSame) {
      const obj = canvas.tokens.placeables.find(p => p.document.id === t.id);
      if (obj) _refreshDbNumberOverlay(obj);
    }
  }, 120);
});

// Refresh overlay when token name changes (e.g. after renumber)
Hooks.on("updateToken", async (tokenDoc, changes) => {
  if (changes.name !== undefined) {
    setTimeout(() => {
      const obj = canvas.tokens.placeables.find(p => p.document.id === tokenDoc.id);
      if (obj) _refreshDbNumberOverlay(obj);
    }, 50);
  }
});

Hooks.on("updateToken", async (tokenDoc, changes) => {
  // NOTE: the movement-range highlight deliberately does NOT redraw as the
  // active token moves. It stays anchored to the tiles lit from the actor's
  // starting position (full MV) until the turn ends, so the player always sees
  // their original reachable area rather than a shrinking remainder.

  // Clear Cover Fire stance when token moves
  if ((changes.x !== undefined || changes.y !== undefined) && tokenDoc.actor) {
    const cfActive = tokenDoc.actor.getFlag("dawnbreaker-trials", "coverFireActive");
    if (cfActive) {
      await tokenDoc.actor.unsetFlag("dawnbreaker-trials", "coverFireActive");
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #3a3f4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#7a8090;">🎯 <b>Cover Fire</b> — ${tokenDoc.actor.name} moved. Cover Fire stance broken.</div>` });
    }
  }

  // Trap trigger check — GM only
  if (game.user.isGM && (changes.x !== undefined || changes.y !== undefined)) {
    const size  = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    const newGX = Math.round((changes.x ?? tokenDoc.x) / size);
    const newGY = Math.round((changes.y ?? tokenDoc.y) / size);
    const token = canvas.tokens.placeables.find(t => t.document.id === tokenDoc.id);
    if (token && window.TrapSystem) await window.TrapSystem.checkTrigger(token, newGX, newGY);
  }

  // Crystal Burrower tremor — play ground crack effect when burrowed and moving
  if (changes.x !== undefined || changes.y !== undefined) {
    const actor = tokenDoc.actor;
    if (actor && actor.name.toLowerCase().includes("crystal burrower")) {
      const isBurrowed = actor.getFlag("dawnbreaker-trials", "burrowed") ?? false;
      if (isBurrowed && window.Sequence) {
        const token = canvas.tokens.placeables.find(t => t.document.id === tokenDoc.id);
        if (token) {
          new Sequence()
            .effect()
              .atLocation(token)
              .file("jb2a.ground_cracks.03.orange")
              .scale(0.6)
              .opacity(0.5)
              .belowTokens()
            .play();
        }
      }
    }
  }

  // Light Aura — recheck AURA conditions when any token moves
  if (game.user.isGM && (changes.x !== undefined || changes.y !== undefined)) {
    for (const tok of canvas.tokens.placeables) {
      if (!tok.actor) continue;
      const laFlag = tok.actor.getFlag("dawnbreaker-trials", "lightAura");
      if (!laFlag?.active || !laFlag.tokenId) continue;
      await _lightAuraUpdateAllyConditions(tok.actor, laFlag.tokenId, laFlag.prMRBonus ?? 0);
    }
  }
});

// ── Ranged LOS — straight line, stops at first token or wall ──
// Returns { blocked: bool, blockingToken: Token|null, tilesTraversed: number }
window._checkRangedLOS = function(fromToken, toToken, ignoreTokens = false) {
  if (!fromToken || !toToken) return { blocked: false, blockingToken: null, tilesTraversed: 0 };
  const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
  const fx   = Math.round(fromToken.document.x / size);
  const fy   = Math.round(fromToken.document.y / size);
  const tx   = Math.round(toToken.document.x / size);
  const ty   = Math.round(toToken.document.y / size);
  const dx   = tx - fx;
  const dy   = ty - fy;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return { blocked: false, blockingToken: null, tilesTraversed: 0 };

  // Full ray from source center to destination center — catches all wall types
  const rayFrom = { x: fx * size + size / 2, y: fy * size + size / 2 };
  const rayTo   = { x: tx * size + size / 2, y: ty * size + size / 2 };
  try {
    const wallHit = CONFIG.Canvas.polygonBackends.move.testCollision(rayFrom, rayTo, { type: "move", mode: "any" });
    if (wallHit) return { blocked: true, blockingToken: null, tilesTraversed: steps };
  } catch(e) {
    try {
      const wallHit = canvas.walls.checkCollision(new Ray(rayFrom, rayTo), { type: "move" });
      if (wallHit) return { blocked: true, blockingToken: null, tilesTraversed: steps };
    } catch(e2) {}
  }

  // Token collision along path
  if (!ignoreTokens) {
    for (let i = 1; i < steps; i++) {
      const cx = Math.round(fx + (dx / steps) * i);
      const cy = Math.round(fy + (dy / steps) * i);
      const blockingToken = canvas.tokens.placeables.find(t => {
        if (t.id === fromToken.id || t.id === toToken.id) return false;
        return Math.round(t.document.x / size) === cx && Math.round(t.document.y / size) === cy;
      });
      if (blockingToken) return { blocked: true, blockingToken, tilesTraversed: i };
    }
  }

  return { blocked: false, blockingToken: null, tilesTraversed: steps };
};

// ═══════════════════════════════════════════════════════════
//  TRAP SYSTEM
// ═══════════════════════════════════════════════════════════

const TRAP_LAYER_NAME = "dawnbreaker.traps";

const TrapSystem = {
  getTraps() {
    try { return game.settings.get("dawnbreaker-trials", "trapState") ?? []; }
    catch(e) { return []; }
  },

  async setTraps(traps) {
    if (game.user.isGM) {
      await game.settings.set("dawnbreaker-trials", "trapState", traps);
    } else {
      game.socket.emit("system.dawnbreaker-trials", { type: "trapUpdate", traps });
    }
  },

  async addTrap(trap) {
    const traps = this.getTraps();
    traps.push(trap);
    await this.setTraps(traps);
    TrapSystem.drawTraps();
  },

  async removeTrap(trapId) {
    const traps = this.getTraps().filter(t => t.id !== trapId);
    await this.setTraps(traps);
    TrapSystem.drawTraps();
  },

  getTrapsAtTile(gx, gy) {
    return this.getTraps().filter(t => t.gx === gx && t.gy === gy);
  },

  drawTraps() {
    if (!canvas?.interface?.grid) return;
    try { canvas.interface.grid.clearHighlightLayer(TRAP_LAYER_NAME); } catch(e) {}
    try { canvas.interface.grid.addHighlightLayer(TRAP_LAYER_NAME); } catch(e) {}

    const size   = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    const myDisp = canvas.tokens.controlled[0]?.document?.disposition ?? 1;
    const traps  = TrapSystem.getTraps();

    for (const trap of traps) {
      const isFriendly = trap.disposition === myDisp;
      if (!isFriendly && !game.user.isGM) continue;
      const isOwn  = trap.actorId === (canvas.tokens.controlled[0]?.actor?.id);
      const color  = isOwn ? 0xe07a30 : 0xf5c518;
      const border = isOwn ? 0xcc5500 : 0xc8a84b;
      canvas.interface.grid.highlightPosition(TRAP_LAYER_NAME, {
        x: trap.gx * size, y: trap.gy * size, color, border, alpha: 0.35,
      });
    }
  },

  async checkTrigger(token, gx, gy) {
    const traps     = TrapSystem.getTrapsAtTile(gx, gy);
    if (!traps.length) return false;
    const tokenDisp = token.document.disposition;
    const hostile   = traps.filter(t => t.disposition !== tokenDisp);
    if (!hostile.length) return false;

    for (const trap of hostile) {
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e07a30;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;">
        <div style="font-size:13px;font-weight:700;color:#e07a30;border-bottom:1px solid #3a3f4a;padding-bottom:4px;margin-bottom:8px;">⚠️ TRAP TRIGGERED — <b>${token.name}</b> stepped on <b>${trap.itemName}</b>!</div>
        <div style="font-size:12px;color:#d4d8e0;">Effect: <span style="color:#c8a84b;">${trap.effect || "No effect defined"}</span></div>
      </div>` });

      const actor       = token.actor;
      const effectStr   = (trap.effect ?? "").toLowerCase();
      const effectToks  = effectStr.match(/(\w+):(\w+):(\d+)/g) ?? [];

      for (const eff of effectToks) {
        const [action, stat, valStr] = eff.split(":");
        const val = parseInt(valStr);
        if (!val) continue;
        if (action === "damage") {
          if (stat === "hp") {
            const cur = actor.system.hp?.current ?? 0;
            await window._dbApplyDamage({ type: "applyDamage", actorId: actor.id, tokenId: token.document?.id ?? token.id, newHP: Math.max(0, cur - val), attackType: "physical" });
          } else if (stat === "ar") {
            const cur = actor.system.ar?.current ?? 0;
            await window._dbApplyDamage({ type: "applyARDamage", actorId: actor.id, tokenId: token.document?.id ?? token.id, newAR: Math.max(0, cur - val), attackType: "physical" });
          }
        } else if (action === "condition") {
          const conditions = foundry.utils.deepClone(actor.system.conditions ?? []);
          conditions.push({ name: trap.itemName, label: stat, duration: val, instance: 0, effect: "" });
          await actor.update({ "system.conditions": conditions });
        }
      }

      await TrapSystem.removeTrap(trap.id);
    }
    return true;
  },
};

window.TrapSystem = TrapSystem;

Hooks.on("canvasReady", () => { TrapSystem.drawTraps(); });
Hooks.on("updateSetting", (setting) => {
  if (setting.key === "dawnbreaker-trials.trapState") TrapSystem.drawTraps();
});



window._getFacing = function(token) {
  const dir = token?.document?.flags?.["about-face"]?.direction ?? 90;
  if (dir >= 225 && dir < 315) return "N";
  if (dir < 45 || dir >= 315)  return "E";
  if (dir >= 45  && dir < 135) return "S";
  return "W";
};

window._isAttackingFromBehind = function(defenderToken, attackerToken) {
  if (!defenderToken || !attackerToken) return false;
  const size   = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
  const facing = window._getFacing(defenderToken);
  const dx     = Math.round((attackerToken.document.x - defenderToken.document.x) / size);
  const dy     = Math.round((attackerToken.document.y - defenderToken.document.y) / size);
  switch (facing) {
    case "N": return dy > 0;
    case "S": return dy < 0;
    case "E": return dx < 0;
    case "W": return dx > 0;
  }
  return false;
};

// ═══════════════════════════════════════════════════════════
//  STATUS EFFECT HELPER
// ═══════════════════════════════════════════════════════════
async function _applyStatusEffect(actor, label, active) {
  if (!label) return;
  const effect = CONFIG.statusEffects?.find(e => e.id === label);
  if (!effect) return;
  const token = (actor.isToken && actor.token
    ? canvas.tokens?.placeables?.find(t => t.document.id === actor.token.id)
    : null) ?? canvas.tokens?.placeables?.find(t => t.actor?.id === actor.id);
  if (!token) return;
  try {
    if (active) {
      const already = actor.effects?.some(e => e.statuses?.has(label));
      if (!already) await token.document.toggleActiveEffect(effect, { active: true });
    } else {
      // Find and delete the active effect by checking the statuses Set
      const ae = actor.effects?.find(e => e.statuses?.has(label));
      if (ae) {
        await ae.delete();
      } else {
        await token.document.toggleActiveEffect(effect, { active: false });
      }
    }
  } catch(e) { console.warn(`Dawnbreaker | Could not ${active ? "apply" : "remove"} status effect "${label}":`, e); }
}

// ── Condition change → status effect sync ──────────────────
const _conditionPreUpdateCache = new Map();

Hooks.on("preUpdateActor", (actor, changes) => {
  if (foundry.utils.getProperty(changes, "system.conditions"))
    _conditionPreUpdateCache.set(actor.id, foundry.utils.deepClone(actor.system.conditions ?? []));
});

Hooks.on("updateActor", async (actor, changes) => {
  const newConditions = foundry.utils.getProperty(changes, "system.conditions");
  if (!newConditions) return;
  // Use cache if available, otherwise fall back to actor's pre-update state
  const oldConditions = _conditionPreUpdateCache.get(actor.id) ?? actor.system.conditions ?? [];
  _conditionPreUpdateCache.delete(actor.id);
  for (const newC of newConditions) {
    if (!newC.label) continue;
    if (!oldConditions.some(o => o.name === newC.name && o.label === newC.label)) {
      await _applyStatusEffect(actor, newC.label, true);
      if (CAST_CANCEL_CONDITIONS.includes(newC.label?.toLowerCase()) && game.user.isGM) {
        await CastQueue.cancelForActor(actor.id, `gained ${newC.name}`, actor.isToken ? actor.token?.id : null);
      }
    }
  }
  for (const oldC of oldConditions) {
    if (!oldC.label) continue;
    if (!newConditions.some(n => n.name === oldC.name && n.label === oldC.label))
      await _applyStatusEffect(actor, oldC.label, false);
  }
});

// ── Shimmering Scales — auto-toggle Shimmer condition based on HP% ──
Hooks.on("updateActor", async (actor, changes, options) => {
  if (options?._shimmerUpdate) return;
  const newHP = foundry.utils.getProperty(changes, "system.hp.current");
  if (newHP === undefined) return;
  if (!game.user.isGM) return;

  const hasScales = actor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("shimmering scales"))
    || Object.values(actor.system.abilities ?? {}).some(arr => Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("shimmering scales")));
  if (!hasScales) return;

  const hpMax = actor.system.hp?.max ?? 0;
  const belowHalf = hpMax > 0 && newHP / hpMax < 0.5;
  const conditions = foundry.utils.deepClone(actor.system.conditions ?? []);
  const hasShimmer = conditions.some(c => c.label === "shimmer");

  if (belowHalf && !hasShimmer) {
    conditions.push({ name: "Shimmer", label: "shimmer", duration: 0, instance: 0, effect: "shimmer" });
    await actor.update({ "system.conditions": conditions }, { _shimmerUpdate: true });
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">✨ <b>${actor.name}</b> activates <b style="color:#64b5f6;">Shimmer</b> — +5 PR & +5 MR while below 50% HP!</div>` });
  } else if (!belowHalf && hasShimmer) {
    const cleaned = conditions.filter(c => c.label !== "shimmer");
    await actor.update({ "system.conditions": cleaned }, { _shimmerUpdate: true });
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #3a3f4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#7a8090;">✨ <b>${actor.name}</b>'s <b>Shimmer</b> fades — HP restored above 50%.</div>` });
  }
});

// ── Permanent passive conditions — re-enforce after any condition update ──
// If an actor has a passive ability whose name matches a condition label,
// that condition is considered permanent and will be re-added if removed.
const _PERMANENT_CONDITION_PASSIVES = ["cursed reflection"];

Hooks.on("updateActor", async (actor, changes, options) => {
  if (options?._permanentCondRestore) return; // prevent re-trigger loop
  const newConditions = foundry.utils.getProperty(changes, "system.conditions");
  if (!Array.isArray(newConditions)) return;

  // Collect which permanent conditions this actor's passives demand
  const allAbilities = [
    ...(actor.system.abilities?.passives       ?? []),
    ...(actor.system.abilities?.mainActives    ?? []),
    ...(actor.system.abilities?.secondaryActives ?? []),
    ...(actor.system.abilities?.reactions      ?? []),
    ...(actor.system.abilities?.movement       ?? []),
    ...(actor.system.abilities?.tracker        ?? []),
  ];
  const permanentNeeded = _PERMANENT_CONDITION_PASSIVES.filter(label =>
    allAbilities.some(a => a.name?.toLowerCase().includes(label))
  );
  if (!permanentNeeded.length) return;

  const missing = permanentNeeded.filter(label =>
    !newConditions.some(c => c.label?.toLowerCase() === label || c.name?.toLowerCase() === label)
  );
  if (!missing.length) return;

  const restored = missing.map(label => ({
    name:     label.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
    label:    label,
    duration: 0,
    instance: 0,
    effect:   "",
  }));

  await actor.update(
    { "system.conditions": [...newConditions, ...restored] },
    { _permanentCondRestore: true }
  );

  for (const r of restored) {
    ui.notifications?.info(`${actor.name}: "${r.name}" is a permanent passive — condition restored.`);
  }
});

// ═══════════════════════════════════════════════════════════
//  ASSIST SYSTEM
//  Scans adjacent allied tokens for Camaraderie/assist abilities
//  Returns total ASS bonus from all valid assisters
// ═══════════════════════════════════════════════════════════

// Ability names that grant assist (lowercase, partial match)
const ASSIST_ABILITY_NAMES = ["camaraderie"];

function _hasAssistAbility(actor) {
  // Check system.abilities text arrays
  const inArrays = Object.values(actor.system.abilities ?? {}).some(arr =>
    Array.isArray(arr) && arr.some(a => ASSIST_ABILITY_NAMES.some(n => a.name?.toLowerCase().includes(n)))
  );
  if (inArrays) return true;
  // Check embedded item documents
  return actor.items?.some(i => i.type === "ability" && ASSIST_ABILITY_NAMES.some(n => i.name?.toLowerCase().includes(n)));
}

function _getAssistRange(actor) {
  // Check system.abilities arrays for assist ability with a range field
  for (const arr of Object.values(actor.system.abilities ?? {})) {
    if (!Array.isArray(arr)) continue;
    for (const a of arr) {
      if (ASSIST_ABILITY_NAMES.some(n => a.name?.toLowerCase().includes(n))) {
        const r = parseInt(a.cost); // use cost field as range placeholder for now
        if (!isNaN(r) && r > 0) return r;
      }
    }
  }
  // Check embedded ability items for reach field
  for (const item of actor.items?.contents ?? []) {
    if (item.type === "ability" && ASSIST_ABILITY_NAMES.some(n => item.name?.toLowerCase().includes(n))) {
      const r = parseInt(item.system.reach);
      if (!isNaN(r) && r > 0) return r;
    }
  }
  return 1; // default assist range
}

// Get total ASS bonus from all adjacent allies with assist abilities
// assistedActor = the actor receiving the assist
window._getAssistBonus = function(assistedActor) {
  if (!canvas?.tokens?.placeables) return 0;
  const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
  const assistedToken = canvas.tokens.placeables.find(t => t.actor?.id === assistedActor.id);
  if (!assistedToken) return 0;

  const ax = Math.round(assistedToken.document.x / size);
  const ay = Math.round(assistedToken.document.y / size);
  const assistedDisp = assistedToken.document.disposition;

  let total = 0;

  for (const token of canvas.tokens.placeables) {
    const actor = token.actor;
    if (!actor) continue;
    if (actor.id === assistedActor.id) continue; // can't assist yourself
    if (token.document.disposition !== assistedDisp) continue; // must be same side

    if (!_hasAssistAbility(actor)) continue;

    const range = _getAssistRange(actor);
    const tx = Math.round(token.document.x / size);
    const ty = Math.round(token.document.y / size);
    const dist = Math.abs(tx - ax) + Math.abs(ty - ay);
    if (dist > range) continue;

    // Add this actor's ASS total
    const ass = actor.system.stats?.ASS?.total ?? actor.system.stats?.ASS?.base ?? actor.system.stats?.ASS ?? 0;
    total += ass;
  }

  return total;
};

// ── Bolden — passive aura reduces glancing blow chance by 1 ──
// Returns 1 if any adjacent ally with Bolden is within range 2, else 0
window._getBoldenBonus = function(actor) {
  if (!canvas?.tokens?.placeables) return 0;
  const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
  const assistedToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
  if (!assistedToken) return 0;
  const ax = Math.round(assistedToken.document.x / size);
  const ay = Math.round(assistedToken.document.y / size);
  const assistedDisp = assistedToken.document.disposition;

  for (const token of canvas.tokens.placeables) {
    const tActor = token.actor;
    if (!tActor || tActor.id === actor.id) continue;
    if (token.document.disposition !== assistedDisp) continue;
    const hasBolden = tActor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("bolden"))
      || Object.values(tActor.system.abilities ?? {}).some(arr =>
          Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("bolden")));
    if (!hasBolden) continue;
    const tx   = Math.round(token.document.x / size);
    const ty   = Math.round(token.document.y / size);
    const dist = Math.abs(tx - ax) + Math.abs(ty - ay);
    if (dist <= 2) return 1; // Bolden reduces glance by 1
  }
  return 0;
};



// Returns PR/MR bonus this actor receives from a nearby allied Light Aura caster (range 5)
// PR/MR bonus from Light Aura is now baked into PR.total/MR.total via the AURA condition in prepareData.
// This function returns 0 so macros that call it don't double-apply the bonus.


// Consume one instance of a condition (instance-based) or leave it alone (duration-based)
async function _consumeGuardInstance(actor, conditionName) {
  const conditions = foundry.utils.deepClone(actor.system.conditions ?? []);
  const idx = conditions.findIndex(c => c.name.toLowerCase() === conditionName.toLowerCase());
  if (idx < 0) return;
  const cond = conditions[idx];
  if (cond.instance > 0) {
    cond.instance -= 1;
    if (cond.instance <= 0) {
      conditions.splice(idx, 1); // consumed — remove
    } else {
      conditions[idx] = cond;
    }
    await actor.update({ "system.conditions": conditions });
  }
}

async function _checkGuardCondition(actor, incomingDamage) {
  const conditions = actor.system.conditions ?? [];

  // Check HP Guard first (from Shroud, Guard ability, etc.)
  const hpGuard = conditions.find(c => c.label === "hpguard" || c.name.toLowerCase() === "hp guard");
  if (hpGuard) {
    const effectVal = hpGuard.effect ?? "";
    const isPct     = effectVal.includes("%");
    const match     = effectVal.match(/(\d+)/);
    if (match) {
      const val       = parseInt(match[1]);
      const reduction = isPct ? Math.floor(incomingDamage * (val / 100)) : val;
      const reduced   = val >= 100 ? 0 : Math.max(0, incomingDamage - reduction);
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #1a6b4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🛡 <b>${actor.name}</b> — <b>${hpGuard.name}</b> absorbs <span style="color:#81c784;font-weight:700;">${incomingDamage - reduced}</span> HP damage (${effectVal})</div>` });
      await _consumeGuardInstance(actor, hpGuard.name);
      return reduced;
    }
  }

  // Legacy Guard condition (old style, keep for backwards compat)
  const guard = conditions.find(c => c.name.toLowerCase() === "guard" && !c.label);
  if (guard) {
    const effectVal = guard.effect ?? "";
    const isPct     = effectVal.includes("%");
    const match     = effectVal.match(/(\d+)/);
    if (match) {
      const val       = parseInt(match[1]);
      const reduction = isPct ? Math.floor(incomingDamage * (val / 100)) : val;
      const reduced   = Math.max(0, incomingDamage - reduction);
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #1a6b4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🛡 <b>${actor.name}</b> Guard absorbs <span style="color:#81c784;font-weight:700;">${reduction}</span> damage — ${incomingDamage} → ${reduced}</div>` });
      return reduced;
    }
  }

  return incomingDamage;
}

async function _checkARGuardCondition(actor, incomingARDamage) {
  const conditions = actor.system.conditions ?? [];
  const arGuard = conditions.find(c => c.label === "arguard" || c.name.toLowerCase() === "ar guard");
  if (!arGuard) return incomingARDamage;
  const effectVal = arGuard.effect ?? "";
  const isPct     = effectVal.includes("%");
  const match     = effectVal.match(/(\d+)/);
  if (!match) return incomingARDamage;
  const val       = parseInt(match[1]);
  const reduction = isPct ? Math.floor(incomingARDamage * (val / 100)) : val;
  const reduced   = val >= 100 ? 0 : Math.max(0, incomingARDamage - reduction);
  await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #1a6b4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🛡 <b>${actor.name}</b> — <b>${arGuard.name}</b> absorbs <span style="color:#81c784;font-weight:700;">${incomingARDamage - reduced}</span> AR damage (${effectVal})</div>` });
  await _consumeGuardInstance(actor, arGuard.name);
  return reduced;
}

async function _checkReactiveItems(actor, attackType) {
  for (const item of actor.items) {
    if (!item.system?.equipped) continue;
    if (item.name.toLowerCase().includes("scorpid scales")) {
      const currentMode = item.system.effect?.includes("mode:magical") ? "magical" : "physical";
      if (attackType !== currentMode) continue;
      const newMode   = attackType === "physical" ? "magical" : "physical";
      const modeColor = newMode === "physical" ? "#e07a30" : "#a080ff";
      await item.update({ "flags.dawnbreaker-trials.modeBonus": newMode === "physical" ? { pr: 5, mr: 0 } : { pr: 0, mr: 5 }, "system.effect": `mode:${newMode}` });
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid ${modeColor};border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🐍 <b>Scorpid Scales</b> — ${actor.name} switches to ${newMode === "physical" ? "Physical (+5 PR)" : "Magical (+5 MR)"} resistance.</div>` });
    }
  }
}

// Apply Down condition when HP hits 0
async function _applyDownCondition(actor, { suppressChat = false } = {}) {
  if (!actor) return;

  // Healing Beacon — destroy immediately on any hit instead of going Down
  const beaconData = actor.getFlag("dawnbreaker-trials", "healingBeacon");
  if (beaconData?.active) {
    const ctbState = window.CTB.getState();
    const token = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
    const tokenId = token?.document?.id ?? token?.id;
    const newCombatants = (ctbState.combatants ?? []).filter(c => c.tokenId !== tokenId);
    await CTB.setState({ ...ctbState, combatants: newCombatants });
    await token?.document?.delete();
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">💥 <b>Healing Beacon</b> was destroyed!</div>` });
    return;
  }

  const conditions = foundry.utils.deepClone(actor.system.conditions ?? []);
  if (conditions.some(c => c.name?.toLowerCase() === "down")) return;
  conditions.push({ name: "Down", label: "down", duration: 4, effect: "Unit is incapacitated. Removed from combat after 4 turns." });
  await actor.update({ "system.conditions": conditions });
  await _applyStatusEffect(actor, "down", true);
  if (!suppressChat) {
    await ChatMessage.create({
      content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">☠ <b>${actor.name}</b> is <span style="color:#e05555;font-weight:700;">Down!</span> — 4 turns remaining before removal from combat.</div>`
    });
  }

  // Sacrificial Lamb — check if any adjacent ally Adept can spend KI to revive
  if (!canvas?.tokens?.placeables) return;
  const downToken = _actorToken(actor);
  if (!downToken) return;
  const size     = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
  const dx2      = Math.round(downToken.document.x / size);
  const dy2      = Math.round(downToken.document.y / size);
  const downDisp = downToken.document.disposition;

  for (const t of canvas.tokens.placeables) {
    if (!t.actor || t.document.disposition !== downDisp) continue;
    const lambActor = t.actor;
    const hasSL = lambActor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("sacrificial lamb"))
      || Object.values(lambActor.system.abilities ?? {}).some(arr =>
          Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("sacrificial lamb")));
    if (!hasSL) continue;
    const dist = Math.abs(Math.round(t.document.x/size) - dx2) + Math.abs(Math.round(t.document.y/size) - dy2);
    if (dist > 1) continue;
    const lambKI = lambActor.system.ki?.current ?? 0;
    if (lambKI <= 0) continue;
    // Prompt the Adept's owner
    const owner = game.users.find(u => !u.isGM && lambActor.getUserLevel(u) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER && u.active);
    const requestId = foundry.utils.randomID();
    if (owner) {
      game.socket.emit("system.dawnbreaker-trials", {
        type: "sacrificialLambPrompt",
        actorId: lambActor.id,
        targetActorId: actor.id,
        maxKI: lambKI,
        requestId,
      });
    } else if (game.user.isGM) {
      // GM handles it directly
      const heal = await new Promise(resolve => {
        new (foundry.appv1?.applications?.Dialog ?? Dialog)({
          title: `Sacrificial Lamb — ${lambActor.name}`,
          content: `<div style="font-family:sans-serif;font-size:13px;padding:8px;color:#d4d8e0;">
            <p><b>${lambActor.name}</b> can spend KI to revive <b>${actor.name}</b>.</p>
            <p>Available KI: <b>${lambKI}</b></p>
            <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
              <label style="color:#d4d8e0;">KI to spend:</label>
              <input id="ki-spend" type="number" min="1" max="${lambKI}" value="${Math.min(5, lambKI)}" style="background:#2a2d33;border:1px solid #3a3f4a;color:#d4d8e0;border-radius:3px;padding:3px 6px;width:60px;"/>
            </div>
          </div>`,
          buttons: {
            spend: { label: "Spend KI", callback: (html) => resolve(parseInt(html.find("#ki-spend").val()) || 0) },
            skip:  { label: "Skip",     callback: () => resolve(0) }
          }, default: "spend"
        }).render(true);
      });
      if (heal > 0) {
        const kiSpent = Math.min(heal, lambKI);
        const curHP   = actor.system.hp?.current ?? 0;
        const maxHP   = actor.system.hp?.max ?? curHP;
        const newHP   = Math.min(maxHP, curHP + kiSpent);
        const conds2  = foundry.utils.deepClone(actor.system.conditions ?? []).filter(c => c.label !== "down");
        await actor.update({ "system.hp.current": newHP, "system.conditions": conds2 });
        await lambActor.update({ "system.ki.current": Math.max(0, lambKI - kiSpent) });
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #f5c518;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🐑 <b>Sacrificial Lamb</b> — <b>${lambActor.name}</b> spends ${kiSpent} KI to revive <b>${actor.name}</b> with ${kiSpent} HP!</div>` });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  REACTION REGISTRY
//  Add new HP damage reactions here.
//  Each entry: { match: string, canReact: (actor, dmg) => bool, handler: async (actor, dmg, attackType) => resolvedDamage|null }
//  handler returns the final damage to apply, or null to skip applying (handler takes over)
// ═══════════════════════════════════════════════════════════
const DB_REACTIONS = {
  onHpDamage: [
    {
      // Ki Shield — spend KI 1:1 to reduce HP damage
      match: "ki shield",
      canReact: (actor, dmg) => {
        if (dmg <= 0) return false;
        if ((actor.system.ki?.current ?? 0) <= 0) return false;
        // Only react if target has an active non-GM owner online
        const owner = game.users.find(u => !u.isGM && actor.getUserLevel(u) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER && u.active);
        return !!owner;
      },
      handler: async (actor, dmg, attackType) => {
        // Sends socket prompt to owner — damage applied asynchronously via
        // kiShieldResolved, or by the safety timeout if the player never answers.
        const requestId = foundry.utils.randomID();
        _dbRegisterReactionTimeout(requestId, actor, dmg, attackType, "Ki Shield");
        game.socket.emit("system.dawnbreaker-trials", {
          type: "kiShieldPrompt", actorId: actor.id,
          tokenId: actor.isToken ? actor.token?.id : null,
          incomingDamage: dmg, attackType,
          requestId,
        });
        return null; // null = handler takes over, don't apply damage here
      },
    },
    // ── Add future HP damage reactions below ──────────────────
    {
      // Doubleteam — always-on reaction, splits damage with adjacent doubleteam user(s)
      match: "doubleteam",
      canReact: (actor, dmg) => {
        if (dmg <= 0) return false;
        // Check if any adjacent allied token has Doubleteam ability
        if (!canvas?.tokens?.placeables) return false;
        const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
        const targetToken = _actorToken(actor);
        if (!targetToken) return false;
        const ax = Math.round(targetToken.document.x / size);
        const ay = Math.round(targetToken.document.y / size);
        const targetDisp = targetToken.document.disposition;
        return canvas.tokens.placeables.some(t => {
          if (!t.actor || t.actor.id === actor.id) return false;
          if (t.document.disposition !== targetDisp) return false;
          const dist = Math.abs(Math.round(t.document.x/size) - ax) + Math.abs(Math.round(t.document.y/size) - ay);
          if (dist > 1) return false;
          const dtActor = t.actor;
          const inItems = dtActor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("doubleteam"));
          const inAbilities = Object.values(dtActor.system.abilities ?? {}).some(arr =>
            Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("doubleteam"))
          );
          return inItems || inAbilities;
        });
      },
      handler: async (actor, dmg, attackType) => {
        if (!canvas?.tokens?.placeables) return dmg;
        const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
        const targetToken = _actorToken(actor);
        if (!targetToken) return dmg;
        const ax = Math.round(targetToken.document.x / size);
        const ay = Math.round(targetToken.document.y / size);
        const targetDisp = targetToken.document.disposition;

        // Find all adjacent Doubleteam users
        const dtUsers = canvas.tokens.placeables.filter(t => {
          if (!t.actor || t.actor.id === actor.id) return false;
          if (t.document.disposition !== targetDisp) return false;
          const dist = Math.abs(Math.round(t.document.x/size) - ax) + Math.abs(Math.round(t.document.y/size) - ay);
          if (dist > 1) return false;
          const dtActor = t.actor;
          const inItems = dtActor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("doubleteam"));
          const inAbilities = Object.values(dtActor.system.abilities ?? {}).some(arr =>
            Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("doubleteam"))
          );
          return inItems || inAbilities;
        });

        if (!dtUsers.length) return dmg;

        const splitCount  = 1 + dtUsers.length; // original target + all DT users
        const splitDmg    = Math.floor(dmg / splitCount);
        const remainder   = dmg - (splitDmg * splitCount);
        const targetTakes = splitDmg + remainder; // remainder goes to original target

        // Apply split damage directly to each Doubleteam user's HP (bypasses resistances)
        for (const dtToken of dtUsers) {
          const dtActor  = dtToken.actor;
          const curHP    = dtActor.system.hp?.current ?? 0;
          const newHP    = Math.max(0, curHP - splitDmg);
          await dtActor.update({ "system.hp.current": newHP });
          await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">
            🤜 <b>Doubleteam</b> — <b>${dtActor.name}</b> shares damage with <b>${actor.name}</b><br/>
            ❤ HP: <span style="color:#e57373;">${curHP}</span> → <span style="color:${newHP<=0?"#e05555":"#81c784"};font-weight:700;">${newHP}</span> (−${splitDmg})
            ${newHP<=0?" ☠ Down!":""}
          </div>` });
          if (newHP <= 0) {
            await CastQueue.cancelForActor(dtActor.id, "was downed", dtActor.isToken ? dtActor.token?.id : null);
            await _applyDownCondition(dtActor);
          }
        }

        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">
          🤜 <b>Doubleteam</b> — ${dmg} damage split ${splitCount} ways: <span style="color:#c8a84b;font-weight:700;">${targetTakes}</span> to ${actor.name}, <span style="color:#c8a84b;font-weight:700;">${splitDmg}</span> each to ${dtUsers.map(t=>t.actor.name).join(", ")}
        </div>` });

        // Return the target's share — pipeline applies this to them
        return targetTakes;
      },
    },
    {
      // Counter — always-on reaction, auto counter-attacks if not hit from behind
      match: "counter",
      canReact: (actor, dmg) => {
        if (dmg <= 0) return false;
        // Need AP to counter (at least -70 remaining after -30)
        return (actor.system.ctbAP ?? 0) > -70;
      },
      handler: async (actor, dmg, attackType, sourceActorId = null, sourceTokenId = null) => {
        // Counter fires after damage is received — find enemy tokens in weapon reach
        const defenderToken = _actorToken(actor);
        if (!defenderToken) return dmg;

        const size        = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
        const dx2         = Math.round(defenderToken.document.x / size);
        const dy2         = Math.round(defenderToken.document.y / size);
        const defDisp     = defenderToken.document.disposition;
        const weaponReach = actor.items.find(i => ["weapon","offhand"].includes(i.type) && i.system.equipped)?.system?.reach ?? 1;

        // Prefer the exact attacking token if it was passed through — this is
        // required when multiple duplicate/unlinked tokens (e.g. several
        // Crystal Burrowers) share the same actorId, since scanning "any
        // adjacent enemy" would otherwise counter whichever one is first on
        // the canvas, not the one that actually attacked.
        let candidateTokens;
        const exactAttackerToken = sourceTokenId
          ? canvas.tokens.placeables.find(t => t.document.id === sourceTokenId)
          : null;
        if (exactAttackerToken) {
          // Counter still requires the attacker within weapon reach — a known
          // attacker token outside melee range (ranged attack) is not counterable.
          const ex = Math.round(exactAttackerToken.document.x / size);
          const ey = Math.round(exactAttackerToken.document.y / size);
          const inReach = Math.abs(ex - dx2) + Math.abs(ey - dy2) <= weaponReach;
          candidateTokens = inReach ? [exactAttackerToken] : [];
        } else {
          // Fallback (older callers that don't pass sourceTokenId yet): find
          // adjacent enemies within weapon reach, preferring sourceActorId match.
          const adjacentEnemies = canvas.tokens.placeables.filter(t => {
            if (!t.actor || t.document.disposition === defDisp) return false;
            const ex = Math.round(t.document.x / size);
            const ey = Math.round(t.document.y / size);
            return Math.abs(ex - dx2) + Math.abs(ey - dy2) <= weaponReach;
          });
          const bySourceActor = sourceActorId ? adjacentEnemies.filter(t => t.actor?.id === sourceActorId) : [];
          candidateTokens = bySourceActor.length ? bySourceActor : adjacentEnemies;
        }

        for (const attackerToken of candidateTokens) {
          // Skip if attacking from behind
          if (window._isAttackingFromBehind(defenderToken, attackerToken)) continue;

          const targetActor = attackerToken.actor;
          const rollData    = actor.getRollData?.() ?? {};
          const w           = rollData.weapon ?? {};
          const str         = actor.system.stats?.STR?.total ?? 0;
          const weaponDam   = w.dam ?? 0;
          const profLevel   = w.profLevel ?? 0;
          const assistBonus = window._getAssistBonus ? window._getAssistBonus(actor) : 0;
          const glanceCap   = Math.max(0, 6 - profLevel - assistBonus);
          const targetAR    = targetActor.system.ar?.current ?? 0;
          const targetPR    = targetActor.system.stats?.PR?.total ?? targetActor.system.stats?.PR ?? 0;

          const effRoll  = await new Roll("1d20").evaluate();
          const d20      = effRoll.total;
          const atkTotal = str + weaponDam + profLevel + assistBonus;
          const defTotal = targetAR + targetPR;
          const rawDmg   = Math.max(1, atkTotal - defTotal);
          const arBroken = targetAR <= 0;

          let tier, effectiveDmg, finalDmg, tierColor;
          if (glanceCap > 0 && d20 <= glanceCap) {
            tier = "Glancing Blow"; effectiveDmg = Math.floor(rawDmg * 0.5); tierColor = "#e07a30";
          } else if (d20 <= 19) {
            tier = "Regular Hit"; effectiveDmg = rawDmg; tierColor = "#c8a84b";
          } else {
            tier = "CRITICAL HIT"; effectiveDmg = rawDmg * 2; tierColor = "#e05555";
          }
          effectiveDmg += assistBonus;
          finalDmg = arBroken ? effectiveDmg * 2 : effectiveDmg;

          const speaker = ChatMessage.getSpeaker({ actor });
          await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;">
            <div style="font-size:13px;font-weight:700;color:#64b5f6;border-bottom:1px solid #3a3f4a;padding-bottom:4px;margin-bottom:8px;">🔄 Counter — ${actor.name} → ${targetActor.name}</div>
            <div style="background:#222428;border-radius:4px;padding:6px;text-align:center;">
              <div style="font-size:10px;color:#7a8090;">d20: ${d20} — ${tier}</div>
              <div style="font-size:24px;font-weight:900;color:${tierColor};">${finalDmg} HP</div>
            </div>
            <div style="font-size:10px;color:#7a8090;margin-top:4px;text-align:center;">AP: −30</div>
          </div>` });
          await effRoll.toMessage({ speaker, flavor: "Counter Effectiveness Roll" });

          const curHP   = targetActor.system.hp?.current ?? 0;
          const newHP   = Math.max(0, curHP - finalDmg);
          const cData   = { type: "applyDamage", actorId: targetActor.id, tokenId: attackerToken.document?.id ?? attackerToken.id, newHP, attackType: "physical" };
          if (game.user.isGM) await window._dbApplyDamage(cData);
          else game.socket.emit("system.dawnbreaker-trials", cData);

          // Deduct 30 AP
          const curAP = actor.system.ctbAP ?? 0;
          await actor.update({ "system.ctbAP": Math.max(-100, curAP - 30) });
        }

        return dmg; // damage to original target is unchanged
      },
    },
    {
      // Avoid — always-on passive reaction, reduces all incoming HP damage by AGI MOD
      match: "avoid",
      canReact: (actor, dmg) => {
        if (dmg <= 0) return false;
        const agi    = actor.system.stats?.AGI?.total ?? 0;
        const agiMod = Math.floor(agi / 3) - 3;
        return agiMod > 0;
      },
      handler: async (actor, dmg, attackType) => {
        const agi    = actor.system.stats?.AGI?.total ?? 0;
        const agiMod = Math.floor(agi / 3) - 3;
        const reduced = Math.max(1, dmg - agiMod);
        if (reduced < dmg) {
          await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🌀 <b>Avoid</b> — <b>${actor.name}</b> reduces incoming damage by <span style="color:#81c784;font-weight:700;">${agiMod}</span> (AGI MOD). ${dmg} → ${reduced}</div>` });
        }
        return reduced;
      },
    },
    {
      // Soulbound Gale — like Ki Shield but spends 1 KI per 2 damage reduced
      match: "soulbound gale",
      canReact: (actor, dmg) => {
        if (dmg <= 0) return false;
        if ((actor.system.ki?.current ?? 0) <= 0) return false;
        const owner = game.users.find(u => !u.isGM && actor.getUserLevel(u) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER && u.active);
        return !!owner;
      },
      handler: async (actor, dmg, attackType) => {
        const requestId = foundry.utils.randomID();
        _dbRegisterReactionTimeout(requestId, actor, dmg, attackType, "Soulbound Gale");
        game.socket.emit("system.dawnbreaker-trials", {
          type: "soulboundGalePrompt", actorId: actor.id,
          tokenId: actor.isToken ? actor.token?.id : null,
          incomingDamage: dmg, attackType,
          requestId,
        });
        return null;
      },
    },
  ],
  onArDamage: [
    // ── Crystal Shell — Crystal Burrower BP1 counter (once per combat) ──
    {
      match: "crystal shell",
      canReact(actor, finalNewAR, attackType, sourceActorId) {
        if (actor.getFlag("dawnbreaker-trials", "shellUsed")) return false;
        const oldAR = actor.system.ar?.current ?? 0;
        return oldAR > 21 && finalNewAR <= 21;
      },
      async handler(actor, finalNewAR, attackType, sourceActorId, sourceTokenId = null) {
        await actor.setFlag("dawnbreaker-trials", "shellUsed", true);
        // BP1 side effects: PR 12 → 6, apply weakened as visual indicator
        await actor.update({ "system.stats.PR": 6 });
        const bp1Conds = foundry.utils.deepClone(actor.system.conditions ?? []);
        if (!bp1Conds.some(c => c.name === "weakened")) {
          bp1Conds.push({ name: "weakened", label: "weakened", duration: 999, instance: 0, effect: "" });
          await actor.update({ "system.conditions": bp1Conds });
          await _applyStatusEffect(actor, "weakened", true);
        }
        // Counter: 8 flat AR to the BRK attacker who cracked the shell —
        // prefer the exact attacking token (duplicates share actor ids)
        if (sourceActorId || sourceTokenId) {
          const srcToken = (sourceTokenId ? canvas.tokens?.placeables?.find(t => t.document.id === sourceTokenId) : null)
            ?? canvas.tokens?.placeables?.find(t => t.actor?.id === sourceActorId);
          const srcActor = srcToken?.actor ?? game.actors.get(sourceActorId);
          if (srcActor) {
            const curAR = srcActor.system.ar?.current ?? 0;
            const newAR = Math.max(0, curAR - 8);
            await window._dbApplyDamage({ type: "applyARDamage", actorId: srcActor.id, tokenId: srcToken?.document?.id ?? srcToken?.id, newAR, attackType: "physical", sourceActorId: actor.id });
            await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:13px;font-weight:700;color:#64b5f6;border-bottom:1px solid #3a3f4a;padding-bottom:4px;margin-bottom:8px;">💎 Crystal Shell — ${actor.name} CRACKS!</div><div style="font-size:12px;"><b>${srcActor.name}</b> takes <span style="color:#e57373;font-weight:700;">8 AR damage</span> from the shard spray!</div><div style="font-size:12px;margin-top:4px;">⚠ ${actor.name} PR reduced: 12 → 6. Shell is compromised.</div></div>` });
          }
        }
        _dbBossBanner("💎 CRYSTAL SHELL SHATTERS", `${actor.name} — armor compromised`, "#64b5f6");
        // Crystal Crack animation (slot: "shell-crack")
        const crackToken = _actorToken(actor);
        const crackSlot  = _getNPCAnimSlot(actor, "shell-crack");
        if (crackSlot?.file && crackToken) await window._playHitAnimation(crackToken, crackSlot.file, crackSlot.scale ?? 1.0, crackSlot.sound ?? "");
        return finalNewAR;
      },
    },
  ],
};

// Run all matching reactions for a trigger — returns { handled: bool, finalDmg: number }
async function _runReactions(trigger, actor, dmg, attackType, sourceActorId = null, sourceTokenId = null) {
  const reactions = DB_REACTIONS[trigger] ?? [];
  for (const reaction of reactions) {
    // Check embedded items, system.abilities text arrays, AND system.attacks (NPC)
    const inItems = actor.items.some(i => i.type === "ability" && i.name.toLowerCase().includes(reaction.match));
    const inAbilities = Object.values(actor.system.abilities ?? {}).some(arr =>
      Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes(reaction.match))
    );
    const inAttacks = Array.isArray(actor.system.attacks) && actor.system.attacks.some(a => a.name?.toLowerCase().includes(reaction.match));
    const hasAbility = inItems || inAbilities || inAttacks;
    if (!hasAbility) continue;
    if (!reaction.canReact(actor, dmg, attackType, sourceActorId)) continue;
    const result = await reaction.handler(actor, dmg, attackType, sourceActorId, sourceTokenId);
    if (result === null) return { handled: true, finalDmg: 0 }; // handler takes over
    dmg = result; // handler modified damage, continue chain
  }
  return { handled: false, finalDmg: dmg };
}

// ── NPC animation slot lookup ─────────────────────────────────
function _getNPCAnimSlot(actor, slotName) {
  return (actor.system.animationSlots ?? []).find(s => s.name?.toLowerCase() === slotName?.toLowerCase());
}

// ── Crystal Burrower BP2 — Shell Shatter (AR reaches 0) ──────
// ── Golem Sentry: auto-track BRK/AR hits against a detaining golem ──
// 2 landed AR-damage hits break the grip: frees the target of all Detain
// stacks/conditions, and releases every golem currently detaining them.
async function _checkGolemGripBreak(golemActor, actualARDmg) {
  if (actualARDmg <= 0) return;
  const state = golemActor.getFlag("dawnbreaker-trials", "detainState");
  if (!state?.active) return;

  const hits = (state.brkHitsTaken ?? 0) + 1;
  if (hits < 2) {
    await golemActor.setFlag("dawnbreaker-trials", "detainState", { ...state, brkHitsTaken: hits });
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #4a9eff;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🔨 <b>${golemActor.name}</b>'s grip weakens (${hits}/2 BRK hits).</div>` });
    return;
  }

  const targetToken = state.targetTokenId
    ? canvas.tokens?.placeables?.find(t => t.document.id === state.targetTokenId)
    : null;
  const targetActor = targetToken?.actor ?? game.actors.get(state.targetActorId);
  if (targetActor) {
    const dd = targetActor.getFlag("dawnbreaker-trials", "detainData") ?? { detainerTokenIds: [] };
    for (const tId of dd.detainerTokenIds ?? []) {
      const gToken = canvas.tokens?.placeables?.find(t => t.document.id === tId);
      if (gToken?.actor) await gToken.actor.unsetFlag("dawnbreaker-trials", "detainState");
    }
    await targetActor.unsetFlag("dawnbreaker-trials", "detainData");
    const clearedConditions = (targetActor.system.conditions ?? []).filter(c => c.name !== "Immovable" && c.name !== "Stun");
    await targetActor.update({ "system.conditions": clearedConditions });
  } else {
    await golemActor.unsetFlag("dawnbreaker-trials", "detainState");
  }

  await ChatMessage.create({ content: `<div style="background:#1a2a10;border:2px solid #81c784;border-radius:4px;padding:10px 14px;font-family:sans-serif;font-size:15px;font-weight:900;color:#81c784;text-align:center;">🔓 ${golemActor.name}'s GRIP IS BROKEN — ${targetActor?.name ?? "the target"} is freed!</div>` });
  _dbBossBanner("🔓 GRIP BROKEN", `${targetActor?.name ?? "The target"} breaks free of ${golemActor.name}`, "#81c784");
}

async function _handleCrystalBurrowerBreakpoints(actor, oldAR, newAR) {
  if (!actor.name?.toLowerCase().includes("crystal burrower")) return;
  if (newAR !== 0 || oldAR === 0) return;
  if (actor.getFlag("dawnbreaker-trials", "shatterUsed")) return;
  await actor.setFlag("dawnbreaker-trials", "shatterUsed", true);
  _dbBossBanner("💥 SHELL SHATTER — SHARD BURST", `${actor.name} ruptures in a spray of crystal!`, "#e05555");

  // Shard Burst — 8 flat HP to ALL tokens within 2 tiles (no resistance)
  const bToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
  const shardHit = [];
  if (bToken) {
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    const bx   = Math.round(bToken.document.x / size);
    const by   = Math.round(bToken.document.y / size);
    for (const t of canvas.tokens.placeables) {
      // Exclude only the bursting token itself — duplicate unlinked tokens
      // share actor ids and must still be hit by the burst.
      if (!t.actor || t.id === bToken.id) continue;
      const tx = Math.round(t.document.x / size);
      const ty = Math.round(t.document.y / size);
      if (Math.abs(tx - bx) > 2 || Math.abs(ty - by) > 2) continue;
      const curHP = t.actor.system.hp?.current ?? 0;
      const newHP = Math.max(0, curHP - 8);
      await window._dbApplyDamage({ type: "applyDamage", actorId: t.actor.id, tokenId: t.document?.id ?? t.id, newHP, attackType: "physical", sourceActorId: actor.id });
      shardHit.push(t.actor.name);
    }
  }

  // MV 3 → 5 (no longer weighed down by shell)
  await actor.update({ "system.stats.MV": 5 });

  // Frenzy matrix: shatter with 0 Feeds → Frenzy; shatter while Frenzied → Ravager
  const existConds  = actor.system.conditions ?? [];
  const isRavager   = existConds.some(c => c.name?.toLowerCase() === "ravager frenzy");
  const isFrenzied  = existConds.some(c => c.name?.toLowerCase() === "frenzy");
  let frenzySuffix  = "";

  if (!isRavager) {
    const cleanConds = foundry.utils.deepClone(existConds).filter(c =>
      !["frenzy", "ravager frenzy"].includes(c.name?.toLowerCase())
    );
    if (isFrenzied) {
      cleanConds.push({ name: "Ravager Frenzy", label: "poison", duration: 999, instance: 0, effect: "ravager" });
      await actor.update({ "system.stats.STR": 39, "system.stats.BRK": 10, "system.conditions": cleanConds });
      await _applyStatusEffect(actor, "poison", true);
      frenzySuffix = " → <b style='color:#ff5555'>RAVAGER FRENZY</b> (STR 39, BRK 10)";
    } else {
      cleanConds.push({ name: "Frenzy", label: "burning", duration: 999, instance: 0, effect: "frenzy" });
      await actor.update({ "system.stats.STR": 33, "system.stats.BRK": 8, "system.conditions": cleanConds });
      await _applyStatusEffect(actor, "burning", true);
      frenzySuffix = " → <b style='color:#e07a30'>FRENZY</b> (STR 33, BRK 8)";
    }
  }

  // Shell Shatter animation (slot: "shell-shatter")
  const shatterSlot = _getNPCAnimSlot(actor, "shell-shatter");
  if (shatterSlot?.file && bToken) await window._playHitAnimation(bToken, shatterSlot.file, shatterSlot.scale ?? 1.0, shatterSlot.sound ?? "");

  await ChatMessage.create({ content: `<div style="background:#1a1c20;border:2px solid #e05555;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;">
    <div style="font-size:14px;font-weight:700;color:#e05555;border-bottom:1px solid #3a3f4a;padding-bottom:4px;margin-bottom:8px;">💥 SHELL SHATTER — ${actor.name}</div>
    <div style="font-size:12px;">Crystal carapace explodes! <b>8 flat HP</b> to all tokens within 2 tiles.</div>
    ${shardHit.length ? `<div style="font-size:12px;color:#e57373;">Hit: ${shardHit.join(", ")}</div>` : `<div style="font-size:12px;color:#7a8090;">No tokens in burst range.</div>`}
    <div style="font-size:12px;margin-top:4px;">MV: 3 → <b style="color:#81c784;">5</b>${frenzySuffix}</div>
  </div>` });
}

// ═══════════════════════════════════════════════════════════
//  UNDO SYSTEM
// ═══════════════════════════════════════════════════════════
const UNDO_MAX = 20;
const UNDO_FLAGS = ["bleedStacks","battlecrazeHits","moonGuardian","stoicDamage","lightAura","soulThread","hauntData","tailwindStacks","tetherBonus","tetherTarget","coverFireActive","enchantBonus","aimBonus","healingBeacon","gatheringStorm","blessingOfLight"];

function _dbCaptureActorSnapshot(actor) {
  const flags = {};
  for (const f of UNDO_FLAGS) {
    const v = actor.getFlag("dawnbreaker-trials", f);
    if (v !== undefined) flags[f] = foundry.utils.deepClone(v);
  }
  return {
    actorId:    actor.id,
    name:       actor.name,
    hp:         actor.system.hp?.current ?? 0,
    ar:         actor.system.ar?.current ?? 0,
    ki:         actor.system.ki?.current ?? 0,
    conditions: foundry.utils.deepClone(actor.system.conditions ?? []),
    flags,
  };
}

function _dbPushUndo(description) {
  if (!game.user.isGM) return;
  const snapshots = game.actors.map(a => _dbCaptureActorSnapshot(a));
  const stack = foundry.utils.deepClone(game.settings.get("dawnbreaker-trials", "undoStack") ?? []);
  stack.push({ timestamp: Date.now(), description, snapshots });
  if (stack.length > UNDO_MAX) stack.splice(0, stack.length - UNDO_MAX);
  game.settings.set("dawnbreaker-trials", "undoStack", stack);
}

window._dbPushUndo = _dbPushUndo;

window._dbUndo = async () => {
  if (!game.user.isGM) { ui.notifications.warn("Only the GM can undo actions."); return; }
  const stack = foundry.utils.deepClone(game.settings.get("dawnbreaker-trials", "undoStack") ?? []);
  if (!stack.length) { ui.notifications.info("Nothing to undo."); return; }
  const entry = stack.pop();
  await game.settings.set("dawnbreaker-trials", "undoStack", stack);

  const age = Math.round((Date.now() - entry.timestamp) / 1000);
  const ageStr = age < 60 ? `${age}s ago` : `${Math.round(age/60)}m ago`;

  let lines = [];
  for (const snap of entry.snapshots) {
    const actor = game.actors.get(snap.actorId);
    if (!actor) continue;
    const cur = _dbCaptureActorSnapshot(actor);
    const updates = {};
    const diffs = [];

    if (cur.hp !== snap.hp) { updates["system.hp.current"] = snap.hp; diffs.push(`❤ HP ${cur.hp}→${snap.hp}`); }
    if (cur.ar !== snap.ar) { updates["system.ar.current"] = snap.ar; diffs.push(`🛡 AR ${cur.ar}→${snap.ar}`); }
    if (cur.ki !== snap.ki) { updates["system.ki.current"] = snap.ki; diffs.push(`✨ KI ${cur.ki}→${snap.ki}`); }

    const condChanged = JSON.stringify(cur.conditions) !== JSON.stringify(snap.conditions);
    if (condChanged) { updates["system.conditions"] = snap.conditions; diffs.push(`📋 Conditions restored`); }

    if (Object.keys(updates).length) await actor.update(updates, { allowHealDown: true, cursedReflectionChecked: true });

    for (const [f, v] of Object.entries(snap.flags)) {
      if (JSON.stringify(cur.flags?.[f]) !== JSON.stringify(v)) {
        await actor.setFlag("dawnbreaker-trials", f, v);
        diffs.push(`🚩 ${f} restored`);
      }
    }
    // Remove flags that didn't exist in snapshot
    for (const f of UNDO_FLAGS) {
      if (!(f in snap.flags) && cur.flags?.[f] !== undefined) {
        await actor.unsetFlag("dawnbreaker-trials", f);
      }
    }

    if (diffs.length) lines.push(`<b>${snap.name}</b>: ${diffs.join(", ")}`);
  }

  const body = lines.length
    ? lines.map(l => `<div style="margin:2px 0;">${l}</div>`).join("")
    : `<div style="color:#7a8090;">No actor state changes detected.</div>`;

  ChatMessage.create({ content: `
    <div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:4px;padding:8px 12px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">
      <div style="color:#c8a84b;font-weight:700;font-size:13px;letter-spacing:1px;margin-bottom:6px;">↩ UNDO — ${entry.description} <span style="color:#5a6070;font-size:10px;">(${ageStr})</span></div>
      <div style="color:#7a8090;font-size:10px;margin-bottom:4px;">${stack.length} action(s) remaining in undo history</div>
      ${body}
    </div>`, whisper: [game.user.id] });
};

// ── Combat stats tracker (GM authoritative — drives the end-of-combat recap) ──
// null when not in combat; { [tokenId|actorId]: {name, dealt, taken, healed, downs} }
let _combatStats = null;
function _cbKey(actorId, tokenId) { return tokenId || actorId; }
function _cbEntry(key, name) {
  if (!_combatStats || !key) return null;
  if (!_combatStats[key]) _combatStats[key] = { name: name ?? "Unknown", dealt: 0, taken: 0, healed: 0, downs: 0 };
  else if (name) _combatStats[key].name = name;
  return _combatStats[key];
}
function _recordCombatDamage(targetActor, targetTokenId, amount, downed, sourceActorId, sourceTokenId) {
  if (!_combatStats || amount <= 0) return;
  const tKey = _cbKey(targetActor.id, targetTokenId ?? (targetActor.isToken ? targetActor.token?.id : null));
  const te = _cbEntry(tKey, targetActor.name);
  if (te) { te.taken += amount; if (downed) te.downs += 1; }
  if (sourceActorId) {
    const srcName = (sourceTokenId ? canvas.tokens?.placeables?.find(t => t.document.id === sourceTokenId)?.actor?.name : null)
      ?? game.actors.get(sourceActorId)?.name;
    const se = _cbEntry(_cbKey(sourceActorId, sourceTokenId), srcName);
    if (se) se.dealt += amount;
  }
}

// GM-side healing observer: any HP increase during combat counts as "healed"
// on the recipient (source-agnostic, so it captures every heal path reliably).
const _dbHpBefore = new Map();

// ── Reaction-prompt safety timeout ──────────────────────────────────────────
// Damage-reducing reactions (Ki Shield, Soulbound Gale) send a prompt to a
// player and the pipeline returns treating the hit as "handled" — the damage
// isn't applied until the player answers. If they're AFK the attack silently
// vanishes. The GM registers a timeout when initiating such a reaction; if no
// response arrives, full damage is auto-applied and the prompt is abandoned.
const _dbPendingReactions = new Map(); // requestId → setTimeout handle
const REACTION_TIMEOUT_MS = 25000;

async function _dbApplyReactionDamage(actor, damage, attackType, tokenId) {
  const currentHP = actor.system.hp?.current ?? 0;
  const newHP = Math.max(0, currentHP - damage);
  await actor.update({ "system.hp.current": newHP });
  if (newHP <= 0) {
    await CastQueue.cancelForActor(actor.id, "was downed", actor.isToken ? actor.token?.id : (tokenId ?? null));
    await _applyDownCondition(actor);
  }
  if (attackType) await _checkReactiveItems(actor, attackType);
}

function _dbRegisterReactionTimeout(requestId, actor, fullDamage, attackType, label) {
  if (!game.user.isGM || !requestId) return;
  const tokenId = actor.isToken ? actor.token?.id : null;
  const actorId = actor.id;
  const handle = setTimeout(async () => {
    if (!_dbPendingReactions.has(requestId)) return;
    _dbPendingReactions.delete(requestId);
    // Re-resolve the actor fresh (state may have shifted during the wait)
    const liveActor = (tokenId ? canvas.tokens?.placeables?.find(t => t.document.id === tokenId)?.actor : null)
      ?? game.actors.get(actorId);
    if (!liveActor) return;
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e07a30;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⏱ <b>${label}</b> — no response from <b>${liveActor.name}</b>'s player; full damage applied.</div>` });
    await _dbApplyReactionDamage(liveActor, fullDamage, attackType, tokenId);
  }, REACTION_TIMEOUT_MS);
  _dbPendingReactions.set(requestId, handle);
}

// Returns true if the request was still pending (caller should proceed to
// apply). Returns false if it already timed out (caller must ignore the late
// reply to avoid double-applying).
function _dbClearReactionTimeout(requestId) {
  if (!requestId) return true; // untracked (e.g. GM-direct) — always proceed
  const h = _dbPendingReactions.get(requestId);
  if (h !== undefined) { clearTimeout(h); _dbPendingReactions.delete(requestId); return true; }
  return false;
}

Hooks.on("updateActor", (actor, changes) => {
  if (!game.user.isGM || !_combatStats) return;
  const newHP = foundry.utils.getProperty(changes, "system.hp.current");
  if (newHP === undefined) return;
  const key = actor.isToken ? actor.token?.id ?? actor.id : actor.id;
  const prev = _dbHpBefore.get(key);
  _dbHpBefore.set(key, newHP);
  if (prev !== undefined && newHP > prev) {
    const tokenId = actor.isToken ? actor.token?.id : null;
    const e = _cbEntry(_cbKey(actor.id, tokenId), actor.name);
    if (e) e.healed += (newHP - prev);
  }
});

// ── Floating combat text ─────────────────────────────────────────────────────
// Scrolling numbers pop over a token whenever its HP/AR changes or a new
// condition is applied — from ANY source (pipeline, macros, socket, throws),
// because every path ends in an actor.update(). Runs on every client so each
// player sees the feedback over their own canvas. preUpdate captures the old
// values (document still holds them); update reads the new values and floats
// the deltas.
const _dbVitalsPrev = new Map(); // document.uuid → { hp, ar, conds:[names] }

// Per-token scheduler so simultaneous floaters (e.g. HP + AR from one hit)
// don't stack on the same spot and become unreadable. Each new floater for a
// token is time-staggered after the previous one so they rise one at a time.
const _dbFloatSched = new Map(); // tokenId → next-available spawn timestamp (ms)
const DB_FLOAT_GAP  = 600;       // ms between stacked floaters on one token
const DB_FLOAT_MAXQ = 2600;      // cap queued delay so spam can't trail forever

function _dbFloatSpawn(token, text, color, size, up) {
  const inter = canvas?.interface;
  if (!token || !inter?.createScrollingText) return;
  const c = token.center ?? { x: (token.x ?? 0) + (token.w ?? 0) / 2, y: (token.y ?? 0) + (token.h ?? 0) / 2 };
  const A = CONST.TEXT_ANCHOR_POINTS;
  try {
    inter.createScrollingText(
      { x: c.x, y: c.y },
      text,
      {
        anchor: up ? A.TOP : A.BOTTOM,
        direction: up ? A.TOP : A.BOTTOM,
        distance: (token.h ?? 100) * 0.9,
        fontSize: size,
        fill: color,
        stroke: 0x000000,
        strokeThickness: 4,
        jitter: 0.15,
        duration: 2000,
      }
    );
  } catch (e) { /* interface not ready — ignore */ }
}

function _dbFloatText(token, text, color, { up = true, size = 28 } = {}) {
  if (!token) return;
  const id  = token.id ?? token.document?.id ?? String(Math.random());
  const now = Date.now();
  const start = Math.max(now, _dbFloatSched.get(id) ?? 0);
  const delay = start - now;
  if (delay > DB_FLOAT_MAXQ) return; // too many queued — drop to avoid a long trail
  _dbFloatSched.set(id, start + DB_FLOAT_GAP);
  if (delay <= 0) _dbFloatSpawn(token, text, color, size, up);
  else setTimeout(() => _dbFloatSpawn(token, text, color, size, up), delay);
}

Hooks.on("preUpdateActor", (actor, changes) => {
  const hasHP = foundry.utils.getProperty(changes, "system.hp.current") !== undefined;
  const hasAR = foundry.utils.getProperty(changes, "system.ar.current") !== undefined;
  const hasCo = foundry.utils.getProperty(changes, "system.conditions") !== undefined;
  if (!hasHP && !hasAR && !hasCo) return;
  _dbVitalsPrev.set(actor.uuid, {
    hp: actor.system?.hp?.current ?? null,
    ar: actor.system?.ar?.current ?? null,
    conds: (actor.system?.conditions ?? []).map(c => String(c?.name ?? "").toLowerCase()),
  });
});

Hooks.on("updateActor", (actor, changes) => {
  const prev = _dbVitalsPrev.get(actor.uuid);
  if (!prev) return;
  _dbVitalsPrev.delete(actor.uuid);

  const token = _actorToken(actor);
  if (!token) return;

  const dmgSize = (n) => Math.min(46, 24 + Math.abs(n) * 1.1);

  // HP change
  const newHP = actor.system?.hp?.current;
  if (prev.hp !== null && newHP !== undefined && newHP !== prev.hp) {
    const d = newHP - prev.hp;
    if (d < 0) _dbFloatText(token, `−${-d} HP`, 0xe05555, { size: dmgSize(d) });
    else       _dbFloatText(token, `+${d} HP`,      0x81c784, { size: dmgSize(d) });
  }

  // AR change
  const newAR = actor.system?.ar?.current;
  if (prev.ar !== null && newAR !== undefined && newAR !== prev.ar) {
    const d = newAR - prev.ar;
    if (d < 0) _dbFloatText(token, `−${-d} AR`, 0x66b2ff, { size: dmgSize(d) - 4 });
    else       _dbFloatText(token, `+${d} AR`,      0x4fd6d6, { size: dmgSize(d) - 4 });
  }

  // Newly-added conditions
  const nowConds = (actor.system?.conditions ?? []).map(c => String(c?.name ?? "").toLowerCase());
  if (nowConds.length) {
    const prevCounts = {};
    for (const n of prev.conds) prevCounts[n] = (prevCounts[n] ?? 0) + 1;
    const added = [];
    for (const c of (actor.system?.conditions ?? [])) {
      const n = String(c?.name ?? "").toLowerCase();
      if ((prevCounts[n] ?? 0) > 0) { prevCounts[n]--; continue; }
      added.push(c?.name ?? n);
    }
    // Float up to 2 new conditions so the token isn't spammed
    added.slice(0, 2).forEach((name) => {
      _dbFloatText(token, String(name).toUpperCase(), 0xc79bff, { up: false, size: 20 });
    });
  }

  // Re-evaluate the low-HP heartbeat whenever HP changes (GM-gated internally)
  if (newHP !== undefined) _dbUpdateHeartbeat();
});

window._dbApplyDamage = async (data) => {
  // Resolve token actor first — prefer explicit tokenId so unlinked duplicate
  // tokens (sharing the same actorId) resolve to the exact instance targeted,
  // not just whichever matching token happens to be first on the canvas.
  const tokenActor = data.tokenId
    ? canvas.tokens?.placeables?.find(t => t.document.id === data.tokenId)?.actor
    : canvas.tokens?.placeables?.find(t => t.actor?.id === data.actorId)?.actor;
  const actor = tokenActor ?? game.actors.get(data.actorId);
  if (!actor) return;

  // Snapshot entire world state before this action (captures reactions/chains too)
  if (!data._undoChild && game.user.isGM) {
    const desc = data.type === "applyDamage"   ? `HP attack on ${actor.name}`
               : data.type === "applyARDamage" ? `AR attack on ${actor.name}`
               : `Action on ${actor.name}`;
    _dbPushUndo(desc);
  }

  if (data.type === "applyDamage") {
    const currentHP  = actor.system.hp?.current ?? 0;
    const rawDamage  = currentHP - data.newHP;

    // Tunnel Ambush — first hit after Burrower surfaces bypasses Guard and HP reactions
    let isTunnelAmbush = false;
    if (data.sourceActorId && rawDamage > 0) {
      const srcTok = (data.sourceTokenId ? canvas.tokens?.placeables?.find(t => t.document.id === data.sourceTokenId) : null)
        ?? canvas.tokens?.placeables?.find(t => t.actor?.id === data.sourceActorId);
      const srcAct = srcTok?.actor ?? game.actors.get(data.sourceActorId);
      if (srcAct?.getFlag("dawnbreaker-trials", "tunnelAmbush")) {
        isTunnelAmbush = true;
        await srcAct.unsetFlag("dawnbreaker-trials", "tunnelAmbush");
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>Tunnel Ambush</b> — ${srcAct.name}'s strike ignores Guard and Reactions!</div>` });
      }
    }

    const reducedDmg = (!isTunnelAmbush && rawDamage > 0) ? await _checkGuardCondition(actor, rawDamage) : rawDamage;
    let   finalDmg   = reducedDmg;

    // Apply assist damage reduction (min 1 still applies later)
    const assistBonus = window._getAssistBonus(actor);
    if (assistBonus > 0 && finalDmg > 0) {
      const before = finalDmg;
      finalDmg = Math.max(1, finalDmg - assistBonus);
      if (before !== finalDmg) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🤝 <b>Assist</b> — ${actor.name} reduces damage: <span style="color:#e57373;">${before}</span> → <span style="color:#81c784;font-weight:700;">${finalDmg}</span> (−${assistBonus} ASS)</div>` });
      }
    }

    // Run HP damage reactions (skipped if Tunnel Ambush)
    const { handled, finalDmg: reactionDmg } = isTunnelAmbush
      ? { handled: false, finalDmg: finalDmg }
      : await _runReactions("onHpDamage", actor, finalDmg, data.attackType, data.sourceActorId, data.sourceTokenId);
    if (handled) return;

    // Moon Guardian — check if any ally has this actor shielded
    let moonDmg = reactionDmg;
    if (moonDmg > 0 && game.user.isGM) {
      const defToken5 = _actorToken(actor);
      const defDisp5  = defToken5?.document?.disposition ?? 1;
      for (const t of canvas.tokens.placeables) {
        if (!t.actor || t.document.disposition !== defDisp5) continue;
        const mgData = t.actor.getFlag("dawnbreaker-trials", "moonGuardian");
        if (!mgData?.active || !mgData.targetActorIds?.includes(actor.id)) continue;
        const poolLeft = mgData.pool ?? 0;
        if (poolLeft <= 0) {
          // Pool exhausted — remove target from shield
          const newTargets = mgData.targetActorIds.filter(id => id !== actor.id);
          if (newTargets.length === 0) await t.actor.unsetFlag("dawnbreaker-trials", "moonGuardian");
          else await t.actor.setFlag("dawnbreaker-trials", "moonGuardian", { ...mgData, targetActorIds: newTargets });
          continue;
        }
        const absorbed = Math.min(poolLeft, moonDmg);
        const newPool  = poolLeft - absorbed;
        moonDmg        = Math.max(0, moonDmg - absorbed);
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #a080ff;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🌙 <b>Moon Guardian</b> — ${t.actor.name}'s shield absorbs ${absorbed} damage for ${actor.name}! Pool: ${poolLeft} → ${newPool}</div>` });
        if (newPool <= 0) {
          await t.actor.unsetFlag("dawnbreaker-trials", "moonGuardian");
          await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #3a3f4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#7a8090;">🌙 <b>Moon Guardian</b> — ${t.actor.name}'s shield has been depleted!</div>` });
        } else {
          await t.actor.setFlag("dawnbreaker-trials", "moonGuardian", { ...mgData, pool: newPool });
        }
        break;
      }
    }

    // Shimmering Scales — handled via Shimmer condition (+5 PR/MR) applied by updateActor hook

    // HP attacks always deal at least 1 damage, even after all reductions
    if (rawDamage > 0 && moonDmg === 0) moonDmg = 1;

    const newHP = Math.max(0, currentHP - moonDmg);
    await actor.update({ "system.hp.current": newHP });
    _recordCombatDamage(actor, data.tokenId, currentHP - newHP, newHP <= 0, data.sourceActorId, data.sourceTokenId);
    if (newHP <= 0) {
      await CastQueue.cancelForActor(actor.id, "was downed", actor.isToken ? actor.token?.id : (data?.tokenId ?? null));
      await _applyDownCondition(actor, { suppressChat: true });
    }

    // Stoic Stance — track HP damage taken
    const stoicData = actor.getFlag("dawnbreaker-trials", "stoicDamage");
    if (stoicData?.active && reactionDmg > 0) {
      await actor.setFlag("dawnbreaker-trials", "stoicDamage", { ...stoicData, hp: (stoicData.hp ?? 0) + reactionDmg });
    }

    // Battlecraze — count HP damage events taken (for BRK bonus next attack)
    const hasBattlecraze2 = actor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("battlecraze"))
      || Object.values(actor.system.abilities ?? {}).some(arr => Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("battlecraze")));
    if (hasBattlecraze2 && reactionDmg > 0) {
      const bcData = await actor.getFlag("dawnbreaker-trials", "battlecrazeHits") ?? { active: true, hits: 0 };
      await actor.setFlag("dawnbreaker-trials", "battlecrazeHits", { active: true, hits: (bcData.hits ?? 0) + 1 });
    }

    // Bleeder — add bleeding stack to target if SOURCE actor has Bleeder ability
    // Physical HP damage only, skip if data.noBleed is set (Siphon Strike)
    if (reactionDmg > 0 && data.sourceActorId && data.attackType === "physical" && !data.noBleed) {
      const sourceActor2 = canvas.tokens?.placeables?.find(t => t.actor?.id === data.sourceActorId)?.actor
        ?? game.actors.get(data.sourceActorId);
      if (sourceActor2) {
        const hasBleeder = sourceActor2.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("bleeder"))
          || Object.values(sourceActor2.system.abilities ?? {}).some(arr =>
              Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("bleeder")));
        if (hasBleeder) {
          // Check target isn't immune to bleed (set by Siphon Strike)
          const bleedImmune = (actor.system.conditions ?? []).some(c => c.name.toLowerCase() === "bleed immune");
          if (!bleedImmune) {
            const curStacks = actor.getFlag("dawnbreaker-trials", "bleedStacks") ?? 0;
            const newStacks = Math.min(10, curStacks + 1);
            await actor.setFlag("dawnbreaker-trials", "bleedStacks", newStacks);
            if (newStacks !== curStacks) {
              await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:4px 10px;font-family:sans-serif;font-size:11px;color:#d4d8e0;">🩸 <b>${actor.name}</b> — Bleeding stacks: <span style="color:#e05555;font-weight:700;">${newStacks}</span></div>` });
            }
          }
        }
      }
    }

    // Rememberance — track HP damage DEALT by haunted actor
    if (reactionDmg > 0 && data.sourceActorId) {
      const sourceActor = (data.sourceTokenId ? canvas.tokens?.placeables?.find(t => t.document.id === data.sourceTokenId)?.actor : null)
        ?? canvas.tokens?.placeables?.find(t => t.actor?.id === data.sourceActorId)?.actor
        ?? game.actors.get(data.sourceActorId);
      if (sourceActor) {
        const haunt = sourceActor.getFlag("dawnbreaker-trials", "hauntData");
        if (haunt?.active) {
          await sourceActor.setFlag("dawnbreaker-trials", "hauntData", { ...haunt, hp: (haunt.hp ?? 0) + reactionDmg });
        }
      }
    }

    // Soul Thread — check if any Sage has this actor tethered
    // If so, redirect damage to Sage's KI instead
    if (reactionDmg > 0 && game.user.isGM) {
      const defenderToken4 = _actorToken(actor);
      for (const stToken of canvas.tokens.placeables) {
        if (!stToken.actor || stToken.actor.id === actor.id) continue;
        const stData = stToken.actor.getFlag("dawnbreaker-trials", "soulThread");
        if (!stData?.active || stData.targetActorId !== actor.id) continue;
        // Check target still in range (reach 3)
        if (defenderToken4) {
          const size2 = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
          const dist2 = Math.abs(Math.round(stToken.document.x/size2) - Math.round(defenderToken4.document.x/size2))
                      + Math.abs(Math.round(stToken.document.y/size2) - Math.round(defenderToken4.document.y/size2));
          if (dist2 > 3) {
            await stToken.actor.unsetFlag("dawnbreaker-trials", "soulThread");
            await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #3a3f4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#7a8090;">🧵 <b>Soul Thread</b> — ${actor.name} moved out of range. Thread broken.</div>` });
            continue;
          }
        }
        // Redirect damage to Sage KI
        const sageKI    = stToken.actor.system.ki?.current ?? 0;
        const absorbed  = Math.min(sageKI, reactionDmg);
        const overflow  = reactionDmg - absorbed;
        const newSageKI = Math.max(0, sageKI - absorbed);
        await stToken.actor.update({ "system.ki.current": newSageKI });
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #a080ff;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🧵 <b>Soul Thread</b> — <b>${stToken.actor.name}</b> absorbs ${absorbed} damage for <b>${actor.name}</b>! KI: ${sageKI} → ${newSageKI}${overflow > 0 ? ` | ${overflow} overflow dealt to ${actor.name}` : ""}${newSageKI <= 0 ? " — Thread broken (KI depleted)!" : ""}</div>` });
        if (newSageKI <= 0) await stToken.actor.unsetFlag("dawnbreaker-trials", "soulThread");
        // Restore target HP by absorbed amount (damage redirected)
        if (absorbed > 0) {
          const tHP    = actor.system.hp?.current ?? 0;
          const tHPMax = actor.system.hp?.max ?? tHP;
          await actor.update({ "system.hp.current": Math.min(tHPMax, tHP + absorbed) });
        }
        break; // only one Soul Thread per target
      }
    }

    if (data.attackType) await _checkReactiveItems(actor, data.attackType);

    // Cover Fire — check if any allied sniper with active Cover Fire can AR counter
    if (reactionDmg > 0 && data.sourceActorId && game.user.isGM) {
      // Prefer the exact attacking token — duplicate attackers share actorId,
      // and Cover Fire must retaliate against the one that actually attacked.
      const attackerToken3 = (data.sourceTokenId ? canvas.tokens?.placeables?.find(t => t.document.id === data.sourceTokenId) : null)
        ?? canvas.tokens?.placeables?.find(t => t.actor?.id === data.sourceActorId);
      const defenderToken3 = _actorToken(actor);
      if (attackerToken3 && defenderToken3) {
        const size    = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
        const defDisp = defenderToken3.document.disposition;
        for (const cfToken of canvas.tokens.placeables) {
          if (!cfToken.actor || cfToken.document.disposition !== defDisp || cfToken.actor.id === actor.id) continue;
          const cfActor = cfToken.actor;
          const hasCF = cfActor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("cover fire"))
            || Object.values(cfActor.system.abilities ?? {}).some(arr =>
                Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("cover fire")));
          if (!hasCF) continue;
          if (!cfActor.getFlag("dawnbreaker-trials", "coverFireActive")) continue;
          // Check attacker in range
          const cfReach = (cfActor.items.find(i => ["weapon","offhand"].includes(i.type) && i.system.equipped)?.system?.reach ?? 4) + 4;
          const dist = Math.abs(Math.round(cfToken.document.x/size) - Math.round(attackerToken3.document.x/size))
                     + Math.abs(Math.round(cfToken.document.y/size) - Math.round(attackerToken3.document.y/size));
          if (dist > cfReach) continue;
          if (window._checkRangedLOS) {
            const los = window._checkRangedLOS(cfToken, attackerToken3, false);
            if (los.blocked) continue;
          }
          // Fire BRK AR counter
          const cfBRK  = cfActor.system.stats?.BRK?.total ?? cfActor.system.stats?.BRK?.base ?? 0;
          const cfProf = cfActor.getRollData?.()?.weapon?.profLevel ?? 0;
          const arDmg  = Math.max(1, cfBRK + cfProf);
          const curAR2 = attackerToken3.actor.system.ar?.current ?? 0;
          const newAR2 = Math.max(0, curAR2 - arDmg);
          await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🎯 <b>Cover Fire</b> — <b>${cfActor.name}</b> fires at <b>${attackerToken3.actor.name}</b>! AR −${arDmg} (BRK: ${cfBRK})</div>` });
          await window._dbApplyDamage({ type: "applyARDamage", actorId: attackerToken3.actor.id, tokenId: attackerToken3.document?.id ?? attackerToken3.id, sourceActorId: cfActor.id, newAR: newAR2, attackType: "physical" });
          const cfAP = cfActor.system.ctbAP ?? 0;
          await cfActor.update({ "system.ctbAP": Math.max(-100, cfAP - 30) });
        }
      }
    }

    // Light Aura — cancel if caster takes HP damage
    if (reactionDmg > 0 && game.user.isGM) {
      const laData = actor.getFlag("dawnbreaker-trials", "lightAura");
      if (laData?.active) await _cancelLightAura(actor, "took damage");
    }

  } else if (data.type === "applyARDamage") {
    // Apply assist AR damage reduction
    const currentAR   = actor.system.ar?.current ?? 0;
    const rawARDmg    = currentAR - data.newAR;
    const assistBonus = window._getAssistBonus(actor);
    let   finalNewAR  = data.newAR;
    if (assistBonus > 0 && rawARDmg > 0) {
      const reducedARDmg = Math.max(0, rawARDmg - assistBonus);
      finalNewAR = Math.max(0, currentAR - reducedARDmg);
      if (finalNewAR !== data.newAR) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🤝 <b>Assist</b> — ${actor.name} reduces AR damage: <span style="color:#81c784;font-weight:700;">−${assistBonus} ASS</span></div>` });
      }
    }
    // Apply AR Guard condition check
    const arDmgAmount = currentAR - finalNewAR;
    if (arDmgAmount > 0) {
      const guardedARDmg = await _checkARGuardCondition(actor, arDmgAmount);
      finalNewAR = Math.max(0, currentAR - guardedARDmg);
    }
    const { handled, finalDmg: reactionAR } = await _runReactions("onArDamage", actor, finalNewAR, data.attackType, data.sourceActorId, data.sourceTokenId);
    if (handled) return;
    const actualARDmg = currentAR - reactionAR;
    await actor.update({ "system.ar.current": reactionAR });
    _recordCombatDamage(actor, data.tokenId, actualARDmg, false, data.sourceActorId, data.sourceTokenId);
    await _handleCrystalBurrowerBreakpoints(actor, currentAR, reactionAR);
    await _checkGolemGripBreak(actor, actualARDmg);

    // Stoic Stance — track AR damage taken
    const stoicDataAR = actor.getFlag("dawnbreaker-trials", "stoicDamage");
    if (stoicDataAR?.active && actualARDmg > 0) {
      await actor.setFlag("dawnbreaker-trials", "stoicDamage", { ...stoicDataAR, ar: (stoicDataAR.ar ?? 0) + actualARDmg });
    }

    // Rememberance — track AR damage DEALT by haunted actor
    if (actualARDmg > 0 && data.sourceActorId) {
      const sourceActor = (data.sourceTokenId ? canvas.tokens?.placeables?.find(t => t.document.id === data.sourceTokenId)?.actor : null)
        ?? canvas.tokens?.placeables?.find(t => t.actor?.id === data.sourceActorId)?.actor
        ?? game.actors.get(data.sourceActorId);
      if (sourceActor) {
        const haunt = sourceActor.getFlag("dawnbreaker-trials", "hauntData");
        if (haunt?.active) {
          await sourceActor.setFlag("dawnbreaker-trials", "hauntData", { ...haunt, ar: (haunt.ar ?? 0) + actualARDmg });
        }
      }
    }

    if (data.attackType) await _checkReactiveItems(actor, data.attackType);
  }
};

// ═══════════════════════════════════════════════════════════
//  CAST SPEED CANCEL CONDITIONS
// ═══════════════════════════════════════════════════════════
const CAST_CANCEL_CONDITIONS = ["stun", "sleep", "paralysis", "prone", "blind"];

// ── Stoic Stance bonus helper ──────────────────────────────
// Returns { hp, ar } tracked damage. Pass damageType "hp" or "ar" to consume.
window._getStoicBonus = async function(actor, consume = false, damageType = null) {
  const data = actor.getFlag("dawnbreaker-trials", "stoicDamage");
  if (!data?.active) return { hp: 0, ar: 0 };
  if (consume && damageType) {
    // Clear entire stoic tracker after use
    await actor.unsetFlag("dawnbreaker-trials", "stoicDamage");
    return data;
  }
  return data;
};

// ═══════════════════════════════════════════════════════════
//  CAST QUEUE
// ═══════════════════════════════════════════════════════════
// ── Light Aura helpers ────────────────────────────────────────
async function _applyLightAuraGlow(tokenId) {
  if (!game.user.isGM || !tokenId) return;
  const token = canvas.tokens.placeables.find(t => (t.document?.id ?? t.id) === tokenId);
  if (!token) return;
  const glowProps = {
    "light.bright": 2,
    "light.dim":    7,
    "light.color":  "#c8a820",
    "light.alpha":  0.45,
    "light.animation.type":      "emanation",
    "light.animation.speed":     2,
    "light.animation.intensity": 3,
  };
  await token.document.update(glowProps);
  // Save to prototype so V14 re-syncs preserve the glow
  if (token.actor) {
    await token.actor.update({
      "prototypeToken.light.bright": 2,
      "prototypeToken.light.dim":    7,
      "prototypeToken.light.color":  "#c8a820",
      "prototypeToken.light.alpha":  0.45,
      "prototypeToken.light.animation.type":      "emanation",
      "prototypeToken.light.animation.speed":     2,
      "prototypeToken.light.animation.intensity": 3,
    });
  }
}

async function _lightAuraUpdateAllyConditions(casterActor, casterTokenId, bonus) {
  if (!game.user.isGM) return;
  const casterToken = canvas.tokens.placeables.find(t => (t.document?.id ?? t.id) === casterTokenId);
  if (!casterToken) return;
  const gridS = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
  const cx = Math.round(casterToken.document.x / gridS);
  const cy = Math.round(casterToken.document.y / gridS);
  const casterDisp = casterToken.document.disposition;
  for (const tok of canvas.tokens.placeables) {
    const a = tok.actor;
    if (!a || a.id === casterActor.id) continue;
    if (tok.document.disposition !== casterDisp) continue; // allies only
    const tx = Math.round(tok.document.x / gridS);
    const ty = Math.round(tok.document.y / gridS);
    const dist = Math.abs(tx - cx) + Math.abs(ty - cy);
    const inRange = dist <= 5;
    const hasAura = (a.system.conditions ?? []).some(c => c.label === "aura");
    if (inRange && !hasAura) {
      const conds = [...(a.system.conditions ?? [])];
      conds.push({ name: "Aura", label: "aura", duration: 0, instance: 0, effect: `pr_mr:${bonus}` });
      await a.update({ "system.conditions": conds });
    } else if (!inRange && hasAura) {
      const conds = (a.system.conditions ?? []).filter(c => c.label !== "aura");
      await a.update({ "system.conditions": conds });
    }
  }
}

async function _cancelLightAura(actor, reason = "deactivated") {
  if (!game.user.isGM) return;
  const flag = actor.getFlag?.("dawnbreaker-trials", "lightAura");

  // Remove light and Sequencer animation from the scene token
  if (flag?.tokenId) {
    const token = canvas.tokens.placeables.find(t => (t.document?.id ?? t.id) === flag.tokenId);
    if (token) {
      await token.document.update({
        "light.bright": 0, "light.dim": 0,
        "light.color": "#000000", "light.alpha": 0,
        "light.animation": { type: "none" },
      });
      if (window.Sequencer) {
        Sequencer.EffectManager.endEffects({ name: "dbt-light-aura" });
      }
    }
  }

  // Remove Light Aura condition from caster
  const cleaned = (actor.system.conditions ?? []).filter(c => c.label !== "lightaura");
  await actor.update({ "system.conditions": cleaned });

  // Unset flag
  await actor.unsetFlag("dawnbreaker-trials", "lightAura");

  // Strip AURA condition from all allied tokens
  for (const tok of canvas.tokens.placeables) {
    const a = tok.actor;
    if (!a || a.id === actor.id) continue;
    const hasCond = (a.system.conditions ?? []).some(c => c.label === "aura");
    if (!hasCond) continue;
    const stripped = (a.system.conditions).filter(c => c.label !== "aura");
    await a.update({ "system.conditions": stripped });
  }

  const msgs = { "took damage": "took damage — Light Aura broken!", "ran out of KI": "ran out of KI — Light Aura faded!", "deactivated": "deactivated their Light Aura." };
  await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #3a3f4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#7a8090;">✨ <b>Light Aura</b> — ${actor.name} ${msgs[reason] ?? reason}</div>` });
}

window._applyLightAuraGlow            = _applyLightAuraGlow;
window._cancelLightAura               = _cancelLightAura;
window._lightAuraUpdateAllyConditions = _lightAuraUpdateAllyConditions;

const CastQueue = {
  SETTING: "castQueueState",
  // onResolve callbacks can't serialize into the world-setting queue — they
  // live here on the client that queued the cast, keyed by callbackId. When
  // the GM resolves the entry, a socket ping tells the owning client to run it.
  _localCallbacks: new Map(),
  getQueue() { try { return game.settings.get("dawnbreaker-trials", CastQueue.SETTING) ?? []; } catch(e) { return []; } },
  async setQueue(queue) {
    await game.settings.set("dawnbreaker-trials", CastQueue.SETTING, queue);
    game.socket.emit("system.dawnbreaker-trials", { type: "castQueueUpdate", queue });
  },
  async queue({ actorId, targetId, abilityName, abilityIcon, castSpeed, attackType, formula, apCost, kiCost, targetX, targetY, aoeRange, aoeShape, animFile, animScale, animSound, casterTokenId = null, targetTokenId = null, onResolve = null, callbackId = null }) {
    // Self-derive the caster's token when not passed — the caster is the
    // controlled token in every casting macro. Required so duplicate unlinked
    // casters resolve/cancel/fizzle independently.
    casterTokenId ??= (canvas.tokens.controlled[0]?.actor?.id === actorId ? canvas.tokens.controlled[0].document.id : null);
    // Register onResolve on THIS client before any relay — the GM's resolve
    // pings back via socket and whichever client holds the callback runs it.
    if (onResolve && !callbackId) {
      callbackId = foundry.utils.randomID();
      CastQueue._localCallbacks.set(callbackId, onResolve);
    }
    if (!game.user.isGM) {
      game.socket.emit("system.dawnbreaker-trials", { type: "castQueueAdd", actorId, targetId, abilityName, abilityIcon, castSpeed, attackType, formula, apCost, kiCost, targetX, targetY, aoeRange, aoeShape, animFile, animScale, animSound, casterTokenId, targetTokenId, callbackId });
      return;
    }
    const queue = CastQueue.getQueue();
    const casterForWIL = (casterTokenId ? canvas.tokens.placeables.find(t => t.document.id === casterTokenId)?.actor : null)
      ?? game.actors.get(actorId);

    // ── Cursed Reflection check — must pass WIL DC 10 before queuing ──
    const hasCR = (casterForWIL?.system.conditions ?? []).some(c =>
      c.name?.toLowerCase() === "cursed reflection" || c.label?.toLowerCase() === "cursed reflection"
    );
    if (hasCR) {
      const DC = 10;
      const wilMod = casterForWIL.type === "npc"
        ? (casterForWIL.system.stats?.WIL ?? 0)
        : (casterForWIL.system.stats?.WIL?.mod ?? 0);
      const roll = await new Roll("1d20 + @v", { v: wilMod }).evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: casterForWIL }),
        flavor: `<b>${casterForWIL.name}</b> — Cursed Reflection WIL Check (DC ${DC})`,
        rollMode: "publicroll",
      });
      if (roll.total < DC) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">✕ <b>Cursed Reflection</b> blocks <b>${casterForWIL.name}</b>'s cast of <b>${abilityName}</b>! (${roll.total} < ${DC})</div>` });
        return null;
      }
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #2ecc71;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">✔ <b>${casterForWIL.name}</b> resists <b>Cursed Reflection</b> and begins casting <b>${abilityName}</b>! (${roll.total} ≥ ${DC})</div>` });
    }

    const wilVal = casterForWIL?.type === "npc"
      ? (casterForWIL.system.stats?.WIL ?? 0)
      : (casterForWIL?.system.stats?.WIL?.total ?? 0);
    const effectiveCastSpeed = castSpeed + wilVal;
    const entry = {
      id: foundry.utils.randomID(), actorId, targetId, abilityName,
      casterTokenId: casterTokenId ?? null, targetTokenId: targetTokenId ?? null,
      callbackId: callbackId ?? null,
      abilityIcon: abilityIcon ?? "⚡", castSpeed: effectiveCastSpeed, apCurrent: 0, apTotal: effectiveCastSpeed,
      attackType: attackType ?? "physical", formula: formula ?? "",
      apCost: apCost ?? 0, kiCost: kiCost ?? 0,
      targetX: targetX ?? null, targetY: targetY ?? null,
      aoeRange: aoeRange ?? 0, aoeShape: aoeShape ?? "circle",
      animFile: animFile ?? "", animScale: animScale ?? 1.0, animSound: animSound ?? "",
    };

    // ── Out of combat: cast-speed abilities resolve instantly ──────────────
    // No CTB ticking outside combat means queued casts would never resolve.
    // Healers and support casters can freely use their spells during downtime.
    const ctbPhase  = window.CTB?.getState?.()?.phase ?? "idle";
    const inCombat  = ctbPhase === "ticking" || ctbPhase === "active";
    if (!inCombat) {
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64d4ff;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ ${abilityIcon ?? "⚡"} <b>${abilityName}</b> — cast instantly <span style="color:#7a8090;">(out of combat)</span></div>` });
      await CastQueue.resolve(entry);
      CTBDisplay.refresh();
      return entry;
    }

    queue.push(entry);
    await CastQueue.setQueue(queue);
    const casterToken = (casterTokenId ? canvas.tokens.placeables.find(t => t.document.id === casterTokenId) : null)
      ?? canvas.tokens.placeables.find(t => t.actor?.id === actorId);
    if (casterToken) await casterToken.document.update({ "texture.ring.colors.ring": "#00aaff" });
    const target = (targetTokenId ? canvas.tokens.placeables.find(t => t.document.id === targetTokenId)?.actor : null)
      ?? game.actors.get(targetId);
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #00aaff;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:13px;font-weight:700;color:#64d4ff;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #3a3f4a;padding-bottom:5px;margin-bottom:8px;">⚡ ${abilityIcon} ${abilityName} — Casting</div><table style="width:100%;font-size:12px;border-collapse:collapse;"><tr><td style="color:#7a8090;padding:2px 4px;">Caster</td><td style="text-align:right;">${casterForWIL?.name ?? "Unknown"}</td></tr><tr><td style="color:#7a8090;padding:2px 4px;">Target</td><td style="text-align:right;">${target?.name ?? "Unknown"}</td></tr><tr><td style="color:#7a8090;padding:2px 4px;">Base Cast Speed</td><td style="text-align:right;color:#64d4ff;">${castSpeed} AP / tick</td></tr><tr><td style="color:#a080ff;padding:2px 4px;">WIL Bonus</td><td style="text-align:right;color:#a080ff;">+${wilVal}</td></tr><tr style="border-top:1px solid #3a3f4a;"><td style="color:#d4d8e0;padding:3px 4px;font-weight:700;">Cast Speed</td><td style="text-align:right;color:#64d4ff;font-weight:700;">${effectiveCastSpeed} AP / tick</td></tr></table></div>` });
    CTBDisplay.refresh();
    return entry;
  },
  async tickAll(minTicks) {
    const queue = CastQueue.getQueue();
    if (!queue.length) return [];
    const resolved = [], remaining = [];
    for (const entry of queue) {
      const newAP = entry.apCurrent + (entry.apTotal * minTicks);
      if (newAP >= 100) resolved.push({ ...entry, apCurrent: newAP });
      else remaining.push({ ...entry, apCurrent: newAP });
    }
    await CastQueue.setQueue(remaining);
    return resolved;
  },
  async resolve(entry) {
    if (!game.user.isGM) return;
    // Token-first resolution — duplicate unlinked casters/targets share actor
    // ids, so the stored token ids are the only reliable identity.
    const casterToken = (entry.casterTokenId ? canvas.tokens.placeables.find(t => t.document.id === entry.casterTokenId) : null)
      ?? canvas.tokens.placeables.find(t => t.actor?.id === entry.actorId);
    const targetToken = entry.targetTokenId ? canvas.tokens.placeables.find(t => t.document.id === entry.targetTokenId) : null;
    const caster = casterToken?.actor ?? game.actors.get(entry.actorId);
    const target = targetToken?.actor ?? game.actors.get(entry.targetId);
    if (casterToken) await casterToken.document.update({ "texture.ring.colors.ring": "#000000" });
    if (!caster || (caster.system.hp?.current ?? 0) <= 0) {
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>${entry.abilityName}</b> fizzled — caster was downed.</div>` });
      return;
    }
    const cancelCond = (caster.system.conditions ?? []).find(c => CAST_CANCEL_CONDITIONS.includes(c.label?.toLowerCase() ?? c.name?.toLowerCase()));
    if (cancelCond) {
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>${entry.abilityName}</b> fizzled — ${caster.name} has ${cancelCond.name}.</div>` });
      return;
    }
    let resolvedTargets = [];
    if (entry.aoeRange > 0 && entry.targetX !== null && entry.targetY !== null) {
      const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
      const cx = Math.round(entry.targetX / size), cy = Math.round(entry.targetY / size);
      const aoeTiles = new Set();
      for (let dx = -entry.aoeRange; dx <= entry.aoeRange; dx++)
        for (let dy = -entry.aoeRange; dy <= entry.aoeRange; dy++)
          if (Math.abs(dx) + Math.abs(dy) <= entry.aoeRange) aoeTiles.add(`${cx+dx},${cy+dy}`);
      resolvedTargets = canvas.tokens.placeables.filter(t => {
        const tx = Math.round(t.document.x/size), ty = Math.round(t.document.y/size);
        return aoeTiles.has(`${tx},${ty}`) && t.actor;
      }).map(t => ({ actor: t.actor, token: t }));
      if (!resolvedTargets.length) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e07a30;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>${entry.abilityName}</b> resolved but no targets remain in area.</div>` });
        return;
      }
    } else if (entry.callbackId) {
      // Callback-driven ability (Prayer, Starfall, Zero, Lifeline): it handles
      // its own targeting and posts its own results. No single target required.
      resolvedTargets = [];
    } else {
      if (!target || (target.system.hp?.current ?? 0) <= 0) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>${entry.abilityName}</b> fizzled — target no longer valid.</div>` });
        return;
      }
      resolvedTargets = [{ actor: target, token: targetToken ?? canvas.tokens.placeables.find(t => t.actor?.id === target.id) ?? null }];
    }
    if (resolvedTargets.length) {
      const targetNames = resolvedTargets.map(rt => rt.actor.name).join(", ");
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64d4ff;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:13px;font-weight:700;color:#64d4ff;border-bottom:1px solid #3a3f4a;padding-bottom:5px;margin-bottom:8px;">⚡ ${entry.abilityIcon} ${entry.abilityName} — Resolves!</div><div style="font-size:12px;color:#7a8090;">${caster?.name} → ${targetNames}</div></div>` });
    }
    if (entry.formula && caster) {
      for (const { actor: targetActor, token: tTok } of resolvedTargets) {
        try {
          const dmgRoll = await new Roll(entry.formula, caster.getRollData()).evaluate();
          const amount  = Math.max(0, dmgRoll.total);
          if (entry.attackType === "heal") {
            const cur = targetActor.system.hp?.current ?? 0, max = targetActor.system.hp?.max ?? 0;
            const newHP = Math.min(max, cur + amount);
            await targetActor.update({ "system.hp.current": newHP });
            await dmgRoll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: caster }), flavor: `${entry.abilityName} — Heal → ${targetActor.name}` });
            await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">❤ <b>${targetActor.name}</b> healed: ${cur} → <span style="color:#81c784;font-weight:700;">${newHP}</span> / ${max}</div>` });
          } else {
            const cur = targetActor.system.hp?.current ?? 0;
            const newHP = Math.max(0, cur - amount);
            const dmgData = { type: "applyDamage", actorId: targetActor.id, tokenId: tTok?.document?.id ?? tTok?.id, sourceActorId: entry.actorId, sourceTokenId: entry.casterTokenId ?? undefined, newHP, attackType: entry.attackType };
            await window._dbApplyDamage(dmgData);
            await dmgRoll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: caster }), flavor: `${entry.abilityName} — Damage → ${targetActor.name}` });
          }
        } catch(e) { console.warn("CastQueue | Formula failed:", e); }
      }
    }
    if (entry.animFile && window._playHitAnimation) {
      for (const { token: tTok } of resolvedTargets) {
        if (tTok) await window._playHitAnimation(tTok, entry.animFile, entry.animScale ?? 1.0, entry.animSound ?? "", casterToken);
      }
    }

    // ── Named buff ability resolution ──────────────────────────────────────
    if (entry.attackType === "buff" && caster) {
      if (entry.abilityName === "Light Aura") {
        try {
          const spr    = caster.system.stats?.SPR?.total ?? 0;
          const sprMod = Math.floor(spr / 3) - 3;
          const bonus  = Math.max(0, 5 + sprMod);
          // casterToken already token-first resolved above
          const tokenId = casterToken?.document?.id ?? null;
          const origLight = {
            bright: casterToken?.document.light?.bright ?? 0,
            dim:    casterToken?.document.light?.dim    ?? 0,
            color:  casterToken?.document.light?.color  ?? "#000000",
            alpha:  casterToken?.document.light?.alpha  ?? 0.5,
          };
          // Apply condition to caster and store flag — all actor writes first
          const existConds = [...(caster.system.conditions ?? [])].filter(c => c.label !== "lightaura");
          existConds.push({ name: "Light Aura", label: "lightaura", duration: 0, instance: 0, effect: `pr_mr:${bonus}` });
          await caster.update({ "system.conditions": existConds });
          await caster.setFlag("dawnbreaker-trials", "lightAura", { active: true, prMRBonus: bonus, tokenId, origLight, skipFirstKI: true });
          // Give AURA condition to allies
          await _lightAuraUpdateAllyConditions(caster, tokenId, bonus);
          await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #a080ff;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:13px;font-weight:700;color:#a080ff;border-bottom:1px solid #3a3f4a;padding-bottom:4px;margin-bottom:8px;">✨ Light Aura — ${caster.name}</div><div style="font-size:12px;">Allies within <b>5 tiles</b> gain <span style="color:#a080ff;font-weight:700;">PR/MR +${bonus}</span> and restore <b>+1 HP and +1 AR</b> at the start of their turn.</div><div style="font-size:11px;color:#7a8090;margin-top:4px;">Costs 1 KI per turn. Cancelled if ${caster.name} takes damage.</div></div>` });
          // Apply glow + Sequencer last, after all actor writes settle
          if (casterToken) {
            await new Promise(r => setTimeout(r, 300));
            await _applyLightAuraGlow(tokenId);
            if (window.Sequence) {
              const gridPx = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
              const auraScale = ((11 * gridPx) / 200) * 0.15;
              await new Sequence()
                .effect()
                  .file("jb2a.template_circle.aura.04.inward.001.loop")
                  .atLocation(casterToken)
                  .scale(auraScale)
                  .opacity(0.35)
                  .persist()
                  .name("dbt-light-aura")
                  .attachTo(casterToken)
                .play();
            }
          }
        } catch(e) {}
      }
    }

    // ── onResolve callback dispatch ────────────────────────────────────────
    // The callback lives on whichever client queued the cast. Run it here if
    // this client holds it; otherwise ping all clients — the owner runs it.
    if (entry.callbackId) {
      const cb = CastQueue._localCallbacks.get(entry.callbackId);
      if (cb) {
        CastQueue._localCallbacks.delete(entry.callbackId);
        try { await cb(caster); } catch(e) { console.warn("CastQueue | onResolve failed:", e); }
      } else {
        game.socket.emit("system.dawnbreaker-trials", { type: "castResolvedCallback", callbackId: entry.callbackId, actorId: entry.actorId, casterTokenId: entry.casterTokenId ?? null });
      }
    }
  },
  async cancelForActor(actorId, reason, tokenId = null) {
    // When tokenId is given, cancel only THAT token's casts — duplicate
    // unlinked casters share actorId, and downing one twin must not cancel
    // the other's cast. Entries without a stored casterTokenId still cancel
    // by actorId (legacy entries).
    const queue = CastQueue.getQueue();
    const matches = (e) => e.actorId === actorId && (!tokenId || !e.casterTokenId || e.casterTokenId === tokenId);
    const cancelled = queue.filter(matches);
    const remaining = queue.filter(e => !matches(e));
    if (!cancelled.length) return;
    await CastQueue.setQueue(remaining);
    for (const entry of cancelled) {
      const ringToken = (entry.casterTokenId ? canvas.tokens.placeables.find(t => t.document.id === entry.casterTokenId) : null)
        ?? canvas.tokens.placeables.find(t => t.actor?.id === actorId);
      if (ringToken) await ringToken.document.update({ "texture.ring.colors.ring": "#000000" });
      const casterName = ringToken?.actor?.name ?? game.actors.get(actorId)?.name ?? "Caster";
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>${entry.abilityName}</b> cancelled — ${casterName} ${reason ?? "was interrupted"}.</div>` });
    }
    CTBDisplay.refresh();
  },
};

window.CastQueue = CastQueue;

// ═══════════════════════════════════════════════════════════
//  CTB SYSTEM
// ═══════════════════════════════════════════════════════════
const CTB = {
  SETTING: "ctbState",
  getState() { try { return game.settings.get("dawnbreaker-trials", CTB.SETTING) || {}; } catch(e) { return {}; } },
  async setState(state) {
    await game.settings.set("dawnbreaker-trials", CTB.SETTING, state);
    game.socket.emit("system.dawnbreaker-trials", { type: "ctbUpdate", state });
  },
  getAPTotal(actor) {
    if (actor.type === "npc") return actor.system.stats?.AP || 10;
    return actor.system.stats?.AP?.total || 10;
  },
  getNextAtTurn(combatants) {
    const eligible = combatants.filter(c => !c.turnDone && c.apTotal > 0);
    if (!eligible.length) return { atTurn: [], minTicks: 0 };
    const withTicks = eligible.map(c => ({ ...c, ticksNeeded: c.apCurrent >= 100 ? 0 : Math.ceil((100 - c.apCurrent) / c.apTotal) }));
    const minTicks  = Math.min(...withTicks.map(c => c.ticksNeeded));
    const atTurn    = withTicks.filter(c => c.ticksNeeded === minTicks);
    atTurn.sort((a, b) => (b.apCurrent + b.apTotal * minTicks) - (a.apCurrent + a.apTotal * minTicks));
    return { atTurn, minTicks };
  },
};

// ═══════════════════════════════════════════════════════════
//  CUTSCENE VIEWER — full-screen thematic image overlay
// ═══════════════════════════════════════════════════════════
class CutsceneViewer extends foundry.appv1.api.Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "db-cutscene-viewer",
      template: "systems/dawnbreaker-trials/templates/cutscene-viewer.html",
      popOut: false,
      classes: ["db-cutscene-overlay"],
    });
  }
  constructor(data = {}, options = {}) {
    super(options);
    this._data = data;
  }
  getData() {
    return { img: this._data.img ?? "", caption: this._data.caption ?? "" };
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".db-cutscene-backdrop").click((ev) => {
      if (ev.target === ev.currentTarget) CutsceneViewer.dismiss();
    });
    html.find(".db-cutscene-dismiss").click(() => CutsceneViewer.dismiss());
    this._escHandler = (ev) => { if (ev.key === "Escape") CutsceneViewer.dismiss(); };
    document.addEventListener("keydown", this._escHandler);
  }
  async close(options = {}) {
    if (this._escHandler) document.removeEventListener("keydown", this._escHandler);
    if (CutsceneViewer._current === this) CutsceneViewer._current = null;
    return super.close(options);
  }
  static dismiss() {
    if (CutsceneViewer._current) CutsceneViewer._current.close();
  }
  static show(data = {}) {
    if (CutsceneViewer._current) CutsceneViewer._current.close();
    const app = new CutsceneViewer(data);
    CutsceneViewer._current = app;
    app.render(true);
    if (data.sound) (foundry.audio?.AudioHelper ?? AudioHelper).play({ src: data.sound, volume: 1, autoplay: true, loop: false }, true);
    return app;
  }
  static hide() {
    if (CutsceneViewer._current) CutsceneViewer._current.close();
  }
}
CutsceneViewer._current = null;

window._showCutscene = function(imgPath, options = {}) {
  const data = { img: imgPath, caption: options.caption ?? "", sound: options.sound ?? "" };
  if (game.user.isGM) game.socket.emit("system.dawnbreaker-trials", { type: "cutsceneShow", ...data });
  CutsceneViewer.show(data);
};
window._endCutscene = function() {
  if (game.user.isGM) game.socket.emit("system.dawnbreaker-trials", { type: "cutsceneHide" });
  CutsceneViewer.hide();
};

// ── "Your Turn" spotlight banner + soft turn timer ──────────────────────────
// Shows a big fading banner when a turn starts; if the local user owns one of
// the active actors it reads "YOUR TURN" in gold and starts a small count-up
// timer chip (soft pacing nudge, no enforcement). Turn timer clears when a
// different unit's turn begins.
let _dbTurnTimerInterval = null;
function _dbClearTurnTimer() {
  if (_dbTurnTimerInterval) { clearInterval(_dbTurnTimerInterval); _dbTurnTimerInterval = null; }
  document.getElementById("dbt-turn-timer")?.remove();
}
function _dbShowTurnBanner(entries) {
  if (!Array.isArray(entries) || !entries.length) return;
  const mine = entries.some(e => game.actors.get(e.actorId)?.isOwner && !game.user.isGM);
  const label = mine ? "YOUR TURN" : `${entries.map(e => e.name).join(", ")}`;
  const sub   = mine ? entries.map(e => e.name).join(", ") : "TURN START";
  const color = mine ? "#e8c86a" : "#8fb3d0";

  // Banner element (self-removing)
  document.getElementById("dbt-turn-banner")?.remove();
  const el = document.createElement("div");
  el.id = "dbt-turn-banner";
  el.innerHTML = `<div class="dbt-tb-inner" style="border-color:${color};">
      <div class="dbt-tb-main" style="color:${color};">${label}</div>
      <div class="dbt-tb-sub">${sub}</div>
    </div>`;
  (document.getElementById("interface") ?? document.body).appendChild(el);
  // Force reflow then animate in/out
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); }, 2200);
  setTimeout(() => { el.remove(); }, 2900);

  // Soft turn timer (only for the active player)
  _dbClearTurnTimer();
  if (mine) {
    const chip = document.createElement("div");
    chip.id = "dbt-turn-timer";
    (document.getElementById("interface") ?? document.body).appendChild(chip);
    let sec = 0;
    const render = () => { chip.textContent = `⏱ ${sec}s`; chip.style.color = sec >= 90 ? "#e05555" : sec >= 60 ? "#e07a30" : "#8fb3d0"; };
    render();
    _dbTurnTimerInterval = setInterval(() => { sec++; render(); }, 1000);
  }
}
window._dbShowTurnBanner = _dbShowTurnBanner;
window._dbClearTurnTimer = _dbClearTurnTimer;

// ── Boss breakpoint banner — dramatic full-width flash for phase transitions ──
function _dbShowBossBanner(title, sub, color = "#e05555") {
  document.getElementById("dbt-boss-banner")?.remove();
  const el = document.createElement("div");
  el.id = "dbt-boss-banner";
  el.innerHTML = `<div class="dbt-bb-inner" style="--bb:${color};">
      <div class="dbt-bb-title" style="color:${color};">${title}</div>
      ${sub ? `<div class="dbt-bb-sub">${sub}</div>` : ""}
    </div>`;
  (document.getElementById("interface") ?? document.body).appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => el.classList.remove("show"), 3200);
  setTimeout(() => el.remove(), 3900);
}
// GM calls this — broadcasts to all clients and shows locally.
function _dbBossBanner(title, sub, color) {
  if (game.user.isGM) game.socket.emit("system.dawnbreaker-trials", { type: "bossBanner", title, sub, color });
  _dbShowBossBanner(title, sub, color);
  // Boss-phase sting (GM drives; broadcasts to all)
  _dbAudioSting("audioBossStingSrc", 0.8);
}
window._dbBossBanner = _dbBossBanner;

// ── Audio atmosphere automation ──────────────────────────────────────────────
// Reactive combat audio driven by events that already fire. All settings are
// GM-configurable (Configure Settings); blank paths disable a given cue.
function _dbAudioOn() {
  try { return game.settings.get("dawnbreaker-trials", "audioAtmosphere") !== false; } catch (e) { return false; }
}

// One-shot sting from a settings path. GM broadcasts to all clients.
function _dbAudioSting(settingKey, volume = 0.8) {
  if (!game.user.isGM || !_dbAudioOn()) return;
  let src = "";
  try { src = game.settings.get("dawnbreaker-trials", settingKey) ?? ""; } catch (e) {}
  if (!src) return;
  (foundry.audio?.AudioHelper ?? AudioHelper).play({ src, volume, autoplay: true, loop: false }, true);
}

// Looping ambience — each client holds its own Sound handle so it can stop it.
const _dbAudioLoops = new Map(); // key → Sound
async function _dbAudioLoopStart(key, src, volume = 0.5) {
  if (!src || _dbAudioLoops.has(key)) return;
  try {
    const sound = await (foundry.audio?.AudioHelper ?? AudioHelper).play(
      { src, volume, autoplay: true, loop: true }, false); // local playback only
    if (sound) _dbAudioLoops.set(key, sound);
  } catch (e) { /* ignore */ }
}
function _dbAudioLoopStop(key) {
  const s = _dbAudioLoops.get(key);
  if (!s) return;
  _dbAudioLoops.delete(key);
  try { s.stop(); } catch (e) {}
}

// GM-side heartbeat monitor: loops while a living ally sits at/below the
// critical HP %. Recomputed on every relevant HP change and at combat end, so
// it naturally starts/stops on damage, heal, down, revive, and combat end.
let _dbHeartbeatOn = false;
function _dbUpdateHeartbeat() {
  if (!game.user.isGM) return;
  let src = "", pct = 25;
  try {
    src = game.settings.get("dawnbreaker-trials", "audioHeartbeatSrc") ?? "";
    pct = game.settings.get("dawnbreaker-trials", "audioHeartbeatPct") ?? 25;
  } catch (e) {}

  const state = window.CTB?.getState?.() ?? {};
  const inCombat = state.phase === "active" || state.phase === "ticking";

  let critical = false;
  if (_dbAudioOn() && src && inCombat) {
    for (const t of canvas?.tokens?.placeables ?? []) {
      // Only living allies (friendly disposition) count toward the heartbeat
      if (t.document?.disposition !== CONST.TOKEN_DISPOSITIONS.FRIENDLY) continue;
      const hp = t.actor?.system?.hp?.current ?? 0;
      const max = t.actor?.system?.hp?.max ?? 0;
      if (max > 0 && hp > 0 && (hp / max) * 100 <= pct) { critical = true; break; }
    }
  }

  if (critical && !_dbHeartbeatOn) {
    _dbHeartbeatOn = true;
    game.socket.emit("system.dawnbreaker-trials", { type: "audioLoop", action: "start", key: "heartbeat", src, volume: 0.5 });
    _dbAudioLoopStart("heartbeat", src, 0.5);
  } else if (!critical && _dbHeartbeatOn) {
    _dbHeartbeatOn = false;
    game.socket.emit("system.dawnbreaker-trials", { type: "audioLoop", action: "stop", key: "heartbeat" });
    _dbAudioLoopStop("heartbeat");
  }
}
// Force-stop (combat end / cleanup)
function _dbStopHeartbeat() {
  if (!game.user.isGM) return;
  if (_dbHeartbeatOn) {
    _dbHeartbeatOn = false;
    game.socket.emit("system.dawnbreaker-trials", { type: "audioLoop", action: "stop", key: "heartbeat" });
  }
  _dbAudioLoopStop("heartbeat");
}

// ── Add Cutscene dialog — builds an @Cutscene[...]{...} enricher tag and
// inserts it into the journal page's ProseMirror editor at the cursor ──
async function _openAddCutsceneDialog(editorView) {
  const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;

  const content = `
    <div style="font-family:sans-serif;font-size:13px;display:flex;flex-direction:column;gap:10px;padding:6px 0;">
      <div>
        <label style="display:block;color:var(--db-gold,#c8a84b);font-weight:700;font-size:11px;margin-bottom:3px;">BUTTON LABEL</label>
        <input id="db-ac-label" type="text" placeholder="e.g. Scene 1: Gate Opening" style="width:100%;padding:5px;"/>
      </div>
      <div>
        <label style="display:block;color:var(--db-gold,#c8a84b);font-weight:700;font-size:11px;margin-bottom:3px;">IMAGE *</label>
        <div style="display:flex;gap:6px;">
          <input id="db-ac-img" type="text" placeholder="Pick an image..." style="flex:1;padding:5px;" readonly/>
          <button type="button" id="db-ac-img-browse" style="flex-shrink:0;padding:5px 10px;">📁 Browse</button>
        </div>
      </div>
      <div>
        <label style="display:block;color:var(--db-gold,#c8a84b);font-weight:700;font-size:11px;margin-bottom:3px;">CAPTION (optional)</label>
        <input id="db-ac-caption" type="text" placeholder="Text shown under the image" style="width:100%;padding:5px;"/>
      </div>
      <div>
        <label style="display:block;color:var(--db-gold,#c8a84b);font-weight:700;font-size:11px;margin-bottom:3px;">SOUND (optional)</label>
        <div style="display:flex;gap:6px;">
          <input id="db-ac-sound" type="text" placeholder="Pick a sound..." style="flex:1;padding:5px;" readonly/>
          <button type="button" id="db-ac-sound-browse" style="flex-shrink:0;padding:5px 10px;">📁 Browse</button>
        </div>
      </div>
      <div id="db-ac-preview" style="font-size:11px;color:#888;padding-top:2px;">Fill in an image to preview the tag.</div>
    </div>`;

  const DialogClass = foundry.appv1?.applications?.Dialog ?? Dialog;
  new DialogClass({
    title: "🎬 Add Cutscene",
    content,
    buttons: {
      insert: {
        label: "Insert",
        callback: (html) => {
          const img     = html.find("#db-ac-img").val()?.trim();
          const caption = html.find("#db-ac-caption").val()?.trim() ?? "";
          const sound   = html.find("#db-ac-sound").val()?.trim() ?? "";
          const label   = html.find("#db-ac-label").val()?.trim() || "Play Cutscene";
          if (!img) { ui.notifications.warn("Pick an image before inserting."); return; }
          const parts = [img, caption, sound].filter((p, i) => i === 0 || p);
          const tag = `@Cutscene[${parts.join("|")}]{${label}}`;
          _insertIntoProseMirror(editorView, tag);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "insert",
    render: (html) => {
      const updatePreview = () => {
        const img = html.find("#db-ac-img").val()?.trim();
        const preview = html.find("#db-ac-preview")[0];
        preview.textContent = img ? `Will insert: @Cutscene[${img}...]{...}` : "Fill in an image to preview the tag.";
        preview.style.color = img ? "#81c784" : "#888";
      };
      html.find("#db-ac-img-browse").on("click", () => {
        new FP({
          type: "image",
          callback: (path) => { html.find("#db-ac-img").val(path); updatePreview(); }
        }).render(true);
      });
      html.find("#db-ac-sound-browse").on("click", () => {
        new FP({
          type: "audio",
          callback: (path) => { html.find("#db-ac-sound").val(path); }
        }).render(true);
      });
      html.find("#db-ac-img").on("input", updatePreview);
    }
  }).render(true);
}

function _insertIntoProseMirror(view, text) {
  if (!view) { ui.notifications.warn("Could not find the editor to insert into. Copy this tag manually:\n" + text); return; }
  const { state, dispatch } = view;
  const tr = state.tr.insertText(text, state.selection.from, state.selection.to);
  dispatch(tr);
  view.focus();
  ui.notifications.info("Cutscene tag inserted.");
}

class CTBDisplay extends foundry.appv1.api.Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { id: "ctb-display", title: "Turn Order", template: "systems/dawnbreaker-trials/templates/ctb-display.html", width: 260, height: "auto", resizable: true, popOut: true, classes: ["ctb-display"], left: 10, top: 60 });
  }
  async _render(force, options) {
    await super._render(force, options);
    if (force) CTBDisplay._anchorToHUD(this);
  }
  static _anchorToHUD(app) {
    const hud = document.getElementById("dbt-party-root") ?? document.getElementById("dbt-hud-root");
    const top = hud ? hud.getBoundingClientRect().top : 60;
    app.setPosition({ left: 350, top });
  }
  getData() {
    const state = CTB.getState();
    const combatants = (state.combatants ?? []).map(c => {
      const token     = canvas.tokens?.placeables?.find(t => t.id === c.tokenId);
      const actor     = token?.actor ?? game.actors.get(c.actorId);
      const scanned   = (c.conditions ?? []).some(cd => cd.name.toLowerCase() === "scan");
      const showStats = !c.isNPC || scanned || game.user.isGM;
      const bcData    = actor?.getFlag("dawnbreaker-trials", "battlecrazeHits");
      const battlecrazeHits = (bcData?.active && bcData?.hits > 0) ? bcData.hits : 0;
      return { ...c, img: token?.document?.texture?.src ?? actor?.img ?? c.img ?? "icons/svg/mystery-man.svg", showStats, hp: showStats ? actor?.system?.hp : null, ar: showStats ? actor?.system?.ar : null, ki: showStats ? actor?.system?.ki : null, apPct: Math.min(100, Math.max(0, c.apCurrent)), isActive: c.apCurrent >= 100 && !c.turnDone, battlecrazeHits };
    }).sort((a, b) => b.apCurrent - a.apCurrent);
    const castEntries = (CastQueue.getQueue() ?? []).map(c => ({
      ...c, isCast: true,
      apPct: Math.min(100, Math.max(0, (c.apCurrent / c.apTotal) * 100)),
      casterName: game.actors.get(c.actorId)?.name ?? "Unknown",
    })).sort((a, b) => b.apCurrent - a.apCurrent);
    return { combatants, castEntries, phase: state.phase ?? "idle", isGM: game.user.isGM, inCombat: state.phase === "ticking" || state.phase === "active" };
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".ctb-end-turn").click(async () => {
      // Use selected token if available — pass tokenId to handle duplicate actor types correctly
      const selectedToken = canvas.tokens.controlled[0];
      if (selectedToken) {
        await CTBEngine.endTurn(selectedToken.actor?.id, selectedToken.document?.id ?? selectedToken.id);
        return;
      }
      const state = CTB.getState();
      const active = (state.combatants ?? []).find(c => c.apCurrent >= 100 && !c.turnDone);
      if (active) await CTBEngine.endTurn(active.actorId, active.tokenId);
      else ui.notifications.warn("No active combatant found!");
    });
    html.find(".ctb-next-tick").click(async () => { if (game.user.isGM) await CTBEngine.tick(); });
    html.find(".ctb-end-combat").click(async () => { if (game.user.isGM) await CTBEngine.endCombat(); });

    // ── Remove combatant button ────────────────────────────
    html.find(".ctb-remove-combatant").click(async (ev) => {
      if (!game.user.isGM) return;
      const actorId = ev.currentTarget.dataset.actorId;
      const tokenId = ev.currentTarget.dataset.tokenId;
      const state   = CTB.getState();
      if (!state.combatants) return;
      const combatant  = tokenId
        ? state.combatants.find(c => c.tokenId === tokenId)
        : state.combatants.find(c => c.actorId === actorId);
      const combatants = tokenId
        ? state.combatants.filter(c => c.tokenId !== tokenId)
        : state.combatants.filter(c => c.actorId !== actorId);
      await CTB.setState({ ...state, combatants });
      // Clear highlight
      const token = tokenId
        ? canvas.tokens.placeables.find(t => (t.document?.id ?? t.id) === tokenId)
        : canvas.tokens.placeables.find(t => t.actor?.id === actorId);
      if (token) await _highlightToken(token, false);
      await _clearMovementRange();
      ui.notifications.info(`${combatant?.name ?? "Combatant"} removed from combat.`);
      CTBDisplay.refresh();
    });

    // ── Add selected token to combat ───────────────────────
    html.find(".ctb-add-combatant").click(async () => {
      if (!game.user.isGM) return;
      const token = canvas.tokens.controlled[0];
      if (!token) { ui.notifications.warn("Select a token on the canvas first!"); return; }
      const actor = token.actor;
      if (!actor) return;
      const state = CTB.getState();
      if (!state.combatants) { ui.notifications.warn("No active combat!"); return; }
      // Check if already in combat (match by tokenId so duplicate NPC tokens can each join)
      if (state.combatants.some(c => c.tokenId === token.id)) {
        ui.notifications.warn(`${actor.name} is already in combat!`); return;
      }
      // Roll initiative
      let apCurrent = 0;
      if (actor.type === "npc") {
        const r = await new Roll("2d10").evaluate();
        apCurrent = r.total;
        await r.toMessage({ flavor: `${actor.name} — Joins Combat! Initiative: ${r.total}` });
      } else {
        const apMod   = actor.system.stats?.AP?.mod ?? 0;
        const numDice = Math.max(1, 1 + apMod);
        const r       = await new Roll(`${numDice}d10`).evaluate();
        apCurrent = r.total;
        await r.toMessage({ flavor: `${actor.name} — Joins Combat! Initiative (${numDice}d10): ${r.total}` });
      }
      await actor.update({ "system.ctbAP": apCurrent });
      const newCombatant = {
        actorId:  actor.id,
        tokenId:  token.id,
        name:     actor.name,
        img:      token.document.texture?.src ?? actor.img,
        isNPC:    actor.type === "npc",
        apCurrent,
        apTotal:  CTB.getAPTotal(actor),
        turnDone: false,
        conditions: actor.system.conditions ?? [],
      };
      const combatants = [...state.combatants, newCombatant];
      await CTB.setState({ ...state, combatants });
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚔ <b>${actor.name}</b> joined combat with <span style="color:#81c784;font-weight:700;">${apCurrent} AP</span>!</div>` });
      CTBDisplay.refresh();
    });
  }
  static getInstance() { return null; }
  static async show() {}
  static refresh() {}
}

// Combat-scoped flags that must NOT persist between encounters. Excludes
// durable data (enhancements, growthPath, shop*, stored, healingBeacon,
// nonCombatant, isInteractable — those are gear/economy/config, not per-fight).
// ── Condition reference table ────────────────────────────────────────────────
// Keyed by lowercased condition name. Drives hover tooltips (HUD + inspector).
// Descriptions are concise game-rule summaries.
const _DB_CONDITION_INFO = {
  "down":           "Removed from combat. Auto-clears after 4 turns.",
  "guard":          "Bracing — reduces incoming damage.",
  "hp guard":       "Reduces incoming HP damage by its listed %.",
  "hpguard":        "Reduces incoming HP damage by its listed %.",
  "ar guard":       "Reduces incoming AR damage by its listed %.",
  "arguard":        "Reduces incoming AR damage by its listed %.",
  "scan":           "Target's stats are revealed.",
  "poison":         "Damage over time each turn.",
  "stun":           "Cannot act on its turn.",
  "blind":          "Accuracy reduced; cannot target at range.",
  "sleep":          "Incapacitated until it takes damage.",
  "burning":        "Fire damage over time each turn.",
  "frozen":         "Cannot act; immobilized.",
  "bleeding":       "Loses HP at turn start (Bleeder stacks).",
  "bleed":          "Loses HP at turn start (Bleeder stacks). Cleared by Soothe.",
  "invisible":      "Cannot be targeted normally.",
  "prone":          "Knocked down — movement and defense penalty.",
  "paralysis":      "Cannot act or move.",
  "flying":         "Airborne; ignores ground effects.",
  "fly":            "Airborne; ignores ground effects.",
  "cursed":         "Under a curse.",
  "curse":          "Under a curse.",
  "regen":          "Heals a small amount each turn.",
  "disabled":       "Abilities are disabled.",
  "crippled":       "Movement range reduced.",
  "immovable":      "Rooted/grappled — cannot be moved.",
  "threatened":     "Marked and under threat.",
  "weakened":       "Outgoing damage reduced by its listed amount.",
  "hasted":         "Increased speed / AP gain.",
  "slowed":         "Reduced speed / AP gain.",
  "frenzy":         "Boss rage — STR & BRK up, AR reduced.",
  "ravager frenzy": "Deeper rage — higher STR & BRK, greater AR loss.",
  "light aura":     "Grants PR/MR bonus. Cancelled when the bearer takes HP damage.",
  "aura":           "An active aura effect.",
  "shimmer":        "Shimmering Scales — −5 incoming HP damage while below 50% HP.",
};

// Build a human-readable tooltip for one condition object.
window._dbConditionTip = function(cond) {
  if (!cond) return "";
  const name = String(cond.name ?? cond.label ?? "").trim();
  const key  = name.toLowerCase();
  let desc = _DB_CONDITION_INFO[key] ?? _DB_CONDITION_INFO[String(cond.label ?? "").toLowerCase()] ?? "";
  // Effect-derived detail
  const eff = String(cond.effect ?? "");
  const parts = [];
  if (typeof cond.duration === "number" && cond.duration > 0 && cond.duration < 900) parts.push(`${cond.duration} turn${cond.duration > 1 ? "s" : ""} left`);
  if (typeof cond.instance === "number" && cond.instance > 0) parts.push(`${cond.instance} hit${cond.instance > 1 ? "s" : ""} left`);
  if (/^dot:/.test(eff)) { const [, stat, amt] = eff.split(":"); parts.push(`${amt} ${String(stat).toUpperCase()}/turn`); }
  else if (/^-?\d+%$/.test(eff)) parts.push(`${eff} damage`);
  else if (/^\d+$/.test(eff)) parts.push(`−${eff} DMG`);
  const meta = parts.length ? ` (${parts.join(", ")})` : "";
  return `${name}${meta}${desc ? " — " + desc : ""}`;
};
window._DB_CONDITION_INFO = _DB_CONDITION_INFO;

// ── Stale-condition detection & cleanup ──────────────────────────────────────
// A safety-net for junk that automated ticks/reactions can leave behind:
// malformed durations, orphaned actor references (e.g. hauntedBy:<gone-actor>),
// exact duplicates, and a "Down" tag lingering on a revived (HP>0) actor.
function _dbActorRefExists(id) {
  if (!id) return false;
  return !!(game.actors.get(id) || canvas?.tokens?.placeables?.some(t => t.actor?.id === id));
}

// Returns { list: [{index, cond, reason}], keep: [conds] } for one actor.
function _dbDetectStaleConditions(actor) {
  const conds = actor?.system?.conditions ?? [];
  const stale = [];
  const seen = new Set();
  const hp = actor?.system?.hp?.current ?? 0;
  conds.forEach((c, index) => {
    const name = String(c?.name ?? "").toLowerCase();
    const eff  = String(c?.effect ?? "");
    // Malformed numeric fields
    if ((typeof c?.duration === "number" && (c.duration < 0 || Number.isNaN(c.duration))) ||
        (typeof c?.instance === "number" && (c.instance < 0 || Number.isNaN(c.instance)))) {
      stale.push({ index, cond: c, reason: "malformed duration/instance" }); return;
    }
    // Orphaned actor reference in effect (hauntedBy:<id>, or any :<16-char id>)
    const refMatch = eff.match(/(?:hauntedBy|caster|target|source)?:([A-Za-z0-9]{16})$/);
    if (refMatch && !_dbActorRefExists(refMatch[1])) {
      stale.push({ index, cond: c, reason: "references a unit no longer present" }); return;
    }
    // Lingering Down on a revived actor
    if (name === "down" && hp > 0) {
      stale.push({ index, cond: c, reason: "Down but HP > 0 (revived)" }); return;
    }
    // Exact duplicate (identical name+effect+duration+instance)
    const sig = `${name}|${eff}|${c?.duration}|${c?.instance}`;
    if (seen.has(sig)) { stale.push({ index, cond: c, reason: "duplicate" }); return; }
    seen.add(sig);
  });
  return stale;
}

// Gather unique combatant actors (in-combat combatants, else all canvas tokens).
function _dbCleanupTargets() {
  const seen = new Set();
  const out = [];
  const state = window.CTB?.getState?.() ?? {};
  const inCombat = state.phase === "active" || state.phase === "ticking";
  const source = inCombat
    ? (state.combatants ?? []).map(c =>
        canvas.tokens.placeables.find(t => t.document?.id === c.tokenId || t.id === c.tokenId))
    : (canvas?.tokens?.placeables ?? []);
  for (const t of source) {
    const a = t?.actor;
    if (!a) continue;
    const key = a.isToken ? a.token?.id : a.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ actor: a, token: t });
  }
  return out;
}

// Apply removals to one actor. removeIdx is a Set of indices into its conditions.
async function _dbRemoveConditions(actor, token, removeIdx) {
  const conds = actor?.system?.conditions ?? [];
  const kept = conds.filter((_, i) => !removeIdx.has(i));
  await actor.update({ "system.conditions": kept });
  // Best-effort: clear matching token status icons for removed conditions
  const removedLabels = conds.filter((_, i) => removeIdx.has(i))
    .map(c => String(c?.label ?? "").toLowerCase())
    .filter(l => CONFIG.statusEffects?.some(e => e.id === l));
  for (const statusId of new Set(removedLabels)) {
    try { await token?.document?.toggleActiveEffect?.({ id: statusId }, { active: false }); } catch (e) {}
  }
}

// Silent cleanup (used at combat end). Returns number of conditions removed.
async function _dbCleanupStaleSilent() {
  if (!game.user.isGM) return 0;
  let removed = 0;
  for (const { actor, token } of _dbCleanupTargets()) {
    const stale = _dbDetectStaleConditions(actor);
    if (!stale.length) continue;
    await _dbRemoveConditions(actor, token, new Set(stale.map(s => s.index)));
    removed += stale.length;
  }
  return removed;
}

// GM tool — scans combatants, shows a confirmation of what will be stripped.
window._dbConditionCleanup = async function() {
  if (!game.user.isGM) { ui.notifications.warn("GM only."); return; }
  const targets = _dbCleanupTargets();
  const findings = [];
  for (const { actor, token } of targets) {
    const stale = _dbDetectStaleConditions(actor);
    if (stale.length) findings.push({ actor, token, stale });
  }
  if (!findings.length) { ui.notifications.info("🧹 No stale conditions found."); return; }

  const esc = (s) => String(s ?? "").replace(/</g, "&lt;");
  const rows = findings.map(f => `
    <div style="margin-bottom:8px;">
      <div style="font-weight:700;color:#e8c86a;">${esc(f.actor.name)}</div>
      ${f.stale.map(s => `<div style="font-size:12px;color:#d4d8e0;padding-left:10px;">• <b>${esc(s.cond.name ?? s.cond.label)}</b> <span style="color:#7a8090;">— ${esc(s.reason)}</span></div>`).join("")}
    </div>`).join("");

  const Dlg = foundry.appv1?.applications?.Dialog ?? Dialog;
  const ok = await Dlg.confirm({
    title: "🧹 Condition Cleanup",
    content: `<div style="font-family:sans-serif;color:#d4d8e0;max-height:340px;overflow:auto;">
        <p style="margin:0 0 8px;color:#7a8090;">The following stale conditions will be removed:</p>${rows}</div>`,
    yes: () => true, no: () => false, defaultYes: false,
  });
  if (!ok) return;

  let total = 0;
  for (const f of findings) {
    await _dbRemoveConditions(f.actor, f.token, new Set(f.stale.map(s => s.index)));
    total += f.stale.length;
  }
  await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #7fbf7f;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:13px;font-weight:700;color:#7fbf7f;">🧹 Condition Cleanup</div><div style="font-size:12px;margin-top:4px;">Removed <b>${total}</b> stale condition${total !== 1 ? "s" : ""} across <b>${findings.length}</b> unit${findings.length !== 1 ? "s" : ""}.</div></div>` });
  ui.notifications.info(`🧹 Removed ${total} stale condition${total !== 1 ? "s" : ""}.`);
};

const _COMBAT_FLAGS = [
  "aimBonus", "ambushUsed", "battlecrazeHits", "bleedStacks", "blessingOfLight",
  "burrowed", "coverFireActive", "detainData", "detainState", "enchantBonus",
  "gatheringStorm", "hauntData", "lightAura", "moonGuardian", "myrBandageUsed",
  "myrWILBonus", "shatterUsed", "shellUsed", "soulThread", "stoicDamage",
  "tailwindStacks", "tendonTargets", "tetherBonus", "tetherTarget", "tunnelAmbush",
];

async function _clearCombatFlags() {
  const seen = new Set();
  const actors = [];
  for (const t of canvas.tokens?.placeables ?? []) {
    const a = t.actor;
    if (!a) continue;
    const key = a.isToken ? a.token?.id : a.id;
    if (seen.has(key)) continue;
    seen.add(key);
    actors.push(a);
  }
  for (const a of actors) {
    const flags = a.flags?.["dawnbreaker-trials"] ?? {};
    for (const key of _COMBAT_FLAGS) {
      if (flags[key] !== undefined) { try { await a.unsetFlag("dawnbreaker-trials", key); } catch(e) {} }
    }
  }
}

async function _postCombatRecap() {
  const stats = _combatStats;
  _combatStats = null; // stop tracking
  if (!stats) return;
  const rows = Object.values(stats).filter(s => s.dealt > 0 || s.taken > 0 || s.healed > 0);
  if (!rows.length) return;

  const mvp   = rows.reduce((a, b) => (b.dealt > a.dealt ? b : a));
  const scape = rows.reduce((a, b) => (b.taken > a.taken ? b : a));
  const medic = rows.reduce((a, b) => (b.healed > a.healed ? b : a), { healed: 0, name: null });

  const esc = (s) => String(s ?? "").replace(/</g, "&lt;");
  const tableRows = rows
    .sort((a, b) => b.dealt - a.dealt)
    .map(s => `<tr>
        <td style="padding:2px 6px;color:#d4d8e0;">${esc(s.name)}</td>
        <td style="padding:2px 6px;text-align:right;color:#e8c86a;font-weight:700;">${s.dealt}</td>
        <td style="padding:2px 6px;text-align:right;color:#e57373;">${s.taken}</td>
        <td style="padding:2px 6px;text-align:right;color:#81c784;">${s.healed}</td>
        <td style="padding:2px 6px;text-align:center;color:${s.downs ? "#e05555" : "#7a8090"};">${s.downs || "—"}</td>
      </tr>`).join("");

  const badge = (icon, title, name, detail, color) => name
    ? `<div style="flex:1;min-width:0;background:#222428;border:1px solid ${color};border-radius:4px;padding:6px 8px;text-align:center;">
         <div style="font-size:18px;">${icon}</div>
         <div style="font-size:9px;color:#7a8090;text-transform:uppercase;letter-spacing:1px;">${title}</div>
         <div style="font-size:13px;font-weight:800;color:${color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(name)}</div>
         <div style="font-size:10px;color:#7a8090;">${detail}</div>
       </div>` : "";

  const badges = [
    badge("🏆", "MVP", mvp.dealt > 0 ? mvp.name : null, `${mvp.dealt} dmg dealt`, "#e8c86a"),
    badge("🩹", "Needed Most Help", scape.taken > 0 ? scape.name : null, `${scape.taken} dmg taken${scape.downs ? ` · ${scape.downs} down${scape.downs>1?"s":""}` : ""}`, "#e57373"),
    badge("✚", "Field Medic", medic.healed > 0 ? medic.name : null, `${medic.healed} HP restored`, "#81c784"),
  ].filter(Boolean).join("");

  await ChatMessage.create({ content: `
    <div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;">
      <div style="font-size:14px;font-weight:700;color:#e8c86a;text-transform:uppercase;letter-spacing:2px;text-align:center;border-bottom:1px solid #3a3f4a;padding-bottom:6px;margin-bottom:8px;">📊 Combat Recap</div>
      <div style="display:flex;gap:6px;margin-bottom:10px;">${badges}</div>
      <table style="width:100%;font-size:11px;border-collapse:collapse;">
        <thead><tr style="color:#7a8090;font-size:9px;text-transform:uppercase;letter-spacing:1px;">
          <th style="padding:2px 6px;text-align:left;">Unit</th>
          <th style="padding:2px 6px;text-align:right;">Dealt</th>
          <th style="padding:2px 6px;text-align:right;">Taken</th>
          <th style="padding:2px 6px;text-align:right;">Healed</th>
          <th style="padding:2px 6px;text-align:center;">Downs</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>` });
}

// ── GM flag / condition inspector ──────────────────────────────────────────
// Opens a live panel for the selected (or hovered) token showing every
// dawnbreaker-trials flag, active conditions, and key combat state. Invaluable
// for adjudicating hidden mechanics mid-fight.
window._dbInspector = function(token) {
  if (!game.user.isGM) { ui.notifications.warn("GM only."); return; }
  token = token
    ?? canvas.tokens?.controlled?.[0]
    ?? canvas.tokens?.hover
    ?? null;
  if (!token?.actor) { ui.notifications.warn("Select a token first."); return; }
  const actor = token.actor;
  const s = actor.system ?? {};
  const esc = (v) => String(v ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const flags = actor.flags?.["dawnbreaker-trials"] ?? {};
  const flagRows = Object.entries(flags).filter(([k]) => !["stored"].includes(k));
  const flagsHtml = flagRows.length
    ? flagRows.map(([k, v]) => {
        const val = (typeof v === "object") ? JSON.stringify(v) : String(v);
        const combatFlag = _COMBAT_FLAGS.includes(k);
        return `<tr>
          <td style="padding:2px 6px;color:${combatFlag ? "#64d4ff" : "#c8a84b"};white-space:nowrap;">${esc(k)}</td>
          <td style="padding:2px 6px;color:#d4d8e0;word-break:break-all;font-family:monospace;font-size:10px;">${esc(val)}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="2" style="padding:4px 6px;color:#7a8090;font-style:italic;">No flags set.</td></tr>`;

  const conds = s.conditions ?? [];
  const condTip = (c) => String(window._dbConditionTip ? window._dbConditionTip(c) : (c.name || c.label)).replace(/"/g, "&quot;");
  const condsHtml = conds.length
    ? conds.map(c => `<span title="${condTip(c)}" style="display:inline-block;background:#222428;border:1px solid #3a3f4a;border-radius:3px;padding:1px 7px;margin:2px;font-size:11px;color:#e8c86a;cursor:help;">${esc(c.name || c.label)}${c.duration ? ` <span style="color:#7a8090;">(${c.duration}t)</span>` : ""}${c.instance ? ` <span style="color:#7a8090;">[${c.instance}h]</span>` : ""}${c.effect ? ` <span style="color:#64b5f6;">${esc(c.effect)}</span>` : ""}</span>`).join("")
    : `<span style="color:#7a8090;font-style:italic;">None.</span>`;

  const hp = s.hp ?? {}, ar = s.ar ?? {}, ki = s.ki ?? {};
  const stateHtml = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;margin-bottom:2px;">
      <span>❤ HP <b style="color:#e57373;">${hp.current ?? 0}/${hp.max ?? 0}</b></span>
      <span>🛡 AR <b style="color:#64b5f6;">${ar.current ?? 0}/${ar.max ?? 0}</b></span>
      ${(ki.max ?? 0) > 0 ? `<span>✨ KI <b style="color:#81c784;">${ki.current ?? 0}/${ki.max ?? 0}</b></span>` : ""}
      <span>⚡ AP <b style="color:#c8a84b;">${s.ctbAP ?? 0}</b></span>
      ${s.turnPhase ? `<span style="color:#7a8090;">${s.turnPhase.active ? "active" : "idle"}${s.turnPhase.moved ? " · moved" : ""}${s.turnPhase.acted ? " · acted" : ""}</span>` : ""}
    </div>`;

  const disp = { [-2]:"secret", [-1]:"hostile", [0]:"neutral", [1]:"friendly" }[token.document.disposition] ?? token.document.disposition;

  const content = `
    <div style="font-family:sans-serif;font-size:12px;color:#d4d8e0;">
      <div style="display:flex;align-items:center;gap:8px;border-bottom:1px solid #3a3f4a;padding-bottom:6px;margin-bottom:8px;">
        <img src="${token.document.texture?.src ?? actor.img}" style="width:36px;height:36px;border-radius:3px;object-fit:cover;"/>
        <div>
          <div style="font-weight:700;font-size:14px;color:#e8c86a;">${esc(token.document.name)}</div>
          <div style="font-size:10px;color:#7a8090;">${esc(actor.type)} · ${disp} · ${token.document.actorLink ? "linked" : "unlinked"}</div>
        </div>
      </div>
      ${stateHtml}
      <div style="font-size:9px;color:#7a8090;text-transform:uppercase;letter-spacing:1px;margin:8px 0 3px;">Conditions</div>
      <div>${condsHtml}</div>
      <div style="font-size:9px;color:#7a8090;text-transform:uppercase;letter-spacing:1px;margin:8px 0 3px;">Flags <span style="color:#64d4ff;text-transform:none;">(blue = combat-scoped)</span></div>
      <table style="width:100%;border-collapse:collapse;background:#141619;border:1px solid #2a2d33;border-radius:3px;">${flagsHtml}</table>
    </div>`;

  const DialogClass = foundry.appv1?.applications?.Dialog ?? Dialog;
  new DialogClass({
    title: `🔎 Inspector — ${token.document.name}`,
    content,
    buttons: {
      refresh: { label: "🔄 Refresh", callback: () => window._dbInspector(token) },
      clearCombat: {
        label: "🧹 Clear Combat Flags",
        callback: async () => {
          for (const k of _COMBAT_FLAGS) {
            if (flags[k] !== undefined) { try { await actor.unsetFlag("dawnbreaker-trials", k); } catch(e) {} }
          }
          ui.notifications.info(`Cleared combat flags on ${token.document.name}.`);
        }
      },
      close: { label: "Close" },
    },
    default: "close",
  }, { width: 380 }).render(true);
};

// ── Long Rest — downtime full recovery, one Ration per member ───────────────
// Resolve the party roster (HUD list, else player-owned characters/companions)
function _dbParty() {
  let ids = [];
  try { ids = game.settings.get("dawnbreaker-trials", "partyHudActors") ?? []; } catch(e) {}
  let party = ids.map(id => game.actors.get(id)).filter(Boolean);
  if (!party.length) party = game.actors.filter(a => (a.type === "character" || a.type === "companion") && a.hasPlayerOwner);
  return party;
}

// ── Loot & reward distribution ──────────────────────────────────────────────
window._dbLootDistribute = function() {
  if (!game.user.isGM) { ui.notifications.warn("GM only."); return; }
  const party = _dbParty();
  if (!party.length) { ui.notifications.warn("No party members found."); return; }

  const MATS = [
    { key: "",             label: "— none —" },
    { key: "ore",          label: "Ore" },
    { key: "leather",      label: "Leather" },
    { key: "fabric",       label: "Fabric" },
    { key: "wood",         label: "Wood" },
    { key: "rations",      label: "Rations" },
    { key: "scrap",        label: "Scrap" },
    { key: "runes",        label: "Runes" },
    { key: "ephi",         label: "Ephi Shard" },
    { key: "amynti",       label: "Amynti Shard" },
    { key: "carmine",      label: "Carmine Shard" },
    { key: "essenceFire",  label: "Fire Essence" },
    { key: "essenceWater", label: "Water Essence" },
    { key: "essenceEarth", label: "Earth Essence" },
    { key: "essenceAir",   label: "Air Essence" },
    { key: "essenceSpirit",label: "Spirit Essence" },
  ];
  const matOpts = MATS.map(m => `<option value="${m.key}">${m.label}</option>`).join("");

  const content = `<div style="font-family:sans-serif;font-size:13px;color:#d4d8e0;display:flex;flex-direction:column;gap:8px;padding:4px 0;">
      <div style="font-size:12px;color:#7a8090;">Distribute to the party (${party.length} member${party.length>1?"s":""}).</div>
      <div><label style="color:var(--db-gold,#c8a84b);font-size:11px;font-weight:700;">CREDITS</label>
        <input id="db-loot-credits" type="number" value="0" min="0" style="width:100%;padding:4px;"/></div>
      <div style="display:flex;gap:6px;">
        <div style="flex:1;"><label style="color:var(--db-gold,#c8a84b);font-size:11px;font-weight:700;">MATERIAL</label>
          <select id="db-loot-mat" style="width:100%;padding:4px;">${matOpts}</select></div>
        <div style="width:80px;"><label style="color:var(--db-gold,#c8a84b);font-size:11px;font-weight:700;">AMOUNT</label>
          <input id="db-loot-matamt" type="number" value="0" min="0" style="width:100%;padding:4px;"/></div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;"><input id="db-loot-split" type="checkbox"/> Split evenly (default: each member gets the full amount)</label>
      <div><label style="color:var(--db-gold,#c8a84b);font-size:11px;font-weight:700;">NARRATIVE LOOT (optional)</label>
        <input id="db-loot-note" type="text" placeholder="e.g. an ornate key, a sealed letter..." style="width:100%;padding:4px;"/></div>
    </div>`;

  const DialogClass = foundry.appv1?.applications?.Dialog ?? Dialog;
  new DialogClass({
    title: "💰 Distribute Loot",
    content,
    buttons: {
      give: {
        label: "Distribute",
        callback: async (html) => {
          let credits = Math.max(0, parseInt(html.find("#db-loot-credits").val()) || 0);
          const matKey = html.find("#db-loot-mat").val();
          let matAmt  = Math.max(0, parseInt(html.find("#db-loot-matamt").val()) || 0);
          const note  = (html.find("#db-loot-note").val() || "").trim();
          const split = html.find("#db-loot-split").prop("checked");
          if (split) { credits = Math.floor(credits / party.length); matAmt = Math.floor(matAmt / party.length); }
          if (!credits && !matAmt && !note) { ui.notifications.warn("Nothing to distribute."); return; }

          for (const actor of party) {
            const update = {};
            if (credits) update["system.bio.credits"] = (actor.system.bio?.credits ?? 0) + credits;
            if (matKey && matAmt) update[`system.crafting.${matKey}`] = (actor.system.crafting?.[matKey] ?? 0) + matAmt;
            if (Object.keys(update).length) await actor.update(update);
          }
          const matLabel = MATS.find(m => m.key === matKey)?.label ?? "";
          const parts = [];
          if (credits) parts.push(`<span style="color:#c8a84b;font-weight:700;">${credits} Credits</span>`);
          if (matKey && matAmt) parts.push(`<span style="color:#81c784;font-weight:700;">${matAmt} ${matLabel}</span>`);
          await ChatMessage.create({ content: `
            <div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;">
              <div style="font-size:14px;font-weight:700;color:#e8c86a;text-transform:uppercase;letter-spacing:2px;text-align:center;border-bottom:1px solid #3a3f4a;padding-bottom:6px;margin-bottom:6px;">💰 Loot Distributed</div>
              ${parts.length ? `<div style="font-size:12px;text-align:center;">${split ? "Each member received" : "Each member received"} ${parts.join(" + ")}.</div>` : ""}
              ${note ? `<div style="font-size:12px;text-align:center;margin-top:4px;color:#a080ff;">✦ The party finds: <b>${note.replace(/</g,"&lt;")}</b></div>` : ""}
              <div style="font-size:10px;color:#7a8090;text-align:center;margin-top:6px;">${party.map(a=>a.name).join(", ")}</div>
            </div>` });
          ui.notifications.info("Loot distributed.");
        }
      },
      cancel: { label: "Cancel" },
    },
    default: "give",
  }, { width: 420 }).render(true);
};

window._dbLongRest = function() {
  if (!game.user.isGM) { ui.notifications.warn("GM only."); return; }

  // Party = configured HUD party, else all player-owned characters/companions
  const party = _dbParty();
  if (!party.length) { ui.notifications.warn("No party members found to rest."); return; }

  const doRest = async (requireRation) => {
    const rested = [], noRation = [];
    for (const actor of party) {
      const rations = actor.system.crafting?.rations ?? 0;
      if (requireRation && rations < 1) { noRation.push(actor.name); continue; }
      const update = {
        "system.hp.current": actor.system.hp?.max ?? actor.system.hp?.current ?? 0,
        "system.ar.current": actor.system.ar?.max ?? actor.system.ar?.current ?? 0,
        "system.ki.current": actor.system.ki?.max ?? actor.system.ki?.current ?? 0,
      };
      if (requireRation) update["system.crafting.rations"] = Math.max(0, rations - 1);
      // Revive the downed / clear death state
      const conds = (actor.system.conditions ?? []).filter(c =>
        (c.name ?? "").toLowerCase() !== "down" && (c.label ?? "").toLowerCase() !== "down");
      update["system.conditions"] = conds;
      await actor.update(update);
      rested.push(actor.name);
    }
    const line = (label, arr, color) => arr.length
      ? `<div style="font-size:11px;margin-top:3px;"><span style="color:${color};font-weight:700;">${label}:</span> ${arr.join(", ")}</div>` : "";
    await ChatMessage.create({ content: `
      <div style="background:#1a1c20;border:1px solid #81c784;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;">
        <div style="font-size:14px;font-weight:700;color:#81c784;text-transform:uppercase;letter-spacing:2px;text-align:center;border-bottom:1px solid #3a3f4a;padding-bottom:6px;margin-bottom:6px;">🏕 Long Rest</div>
        <div style="font-size:11px;color:#7a8090;text-align:center;">${requireRation ? "Each rested member consumed 1 Ration." : "GM bypass — no Rations consumed."}</div>
        ${line("Fully Restored", rested, "#81c784")}
        ${line("No Ration — not rested", noRation, "#e07a30")}
      </div>` });
    if (noRation.length) ui.notifications.warn(`${noRation.length} member(s) had no Ration and were not rested.`);
  };

  const DialogClass = foundry.appv1?.applications?.Dialog ?? Dialog;
  new DialogClass({
    title: "🏕 Long Rest",
    content: `<div style="font-family:sans-serif;font-size:13px;padding:6px 0;color:#d4d8e0;">
        <p>Fully restore <b>HP / AR / KI</b> and revive any downed member for the party (${party.length}).</p>
        <p style="font-size:12px;color:#7a8090;">Standard rest consumes <b>1 Ration</b> per member. Members without a Ration are skipped.</p>
      </div>`,
    buttons: {
      ration: { label: "🍖 Rest (use Rations)", callback: () => doRest(true) },
      bypass: { label: "⭐ GM Bypass (free)",    callback: () => doRest(false) },
      cancel: { label: "Cancel" },
    },
    default: "ration",
  }).render(true);
};

const CTBEngine = {
  async startCombat(scene) {
    if (!game.user.isGM) return;
    const tokens = scene?.tokens?.contents ?? canvas.tokens.placeables.map(t => t.document);
    if (!tokens.length) { ui.notifications.warn("No tokens on scene!"); return; }
    // Begin fresh combat-stats tracking for the end-of-combat recap
    _combatStats = {};
    _dbHpBefore.clear();
    for (const h of _dbPendingReactions.values()) clearTimeout(h);
    _dbPendingReactions.clear();
    const combatants = [];
    for (const tokenDoc of tokens) {
      const actor = tokenDoc.actor;
      if (!actor || actor.getFlag("dawnbreaker-trials", "nonCombatant")) continue;
      await (canvas.tokens.placeables.find(t => t.document.id === tokenDoc.id)?.actor ?? actor).update({ "system.ctbAP": 0 });
    }
    for (const tokenDoc of tokens) {
      const actor = tokenDoc.actor;
      if (!actor) continue;
      if (actor.getFlag("dawnbreaker-trials", "nonCombatant")) continue;
      let apCurrent = 0;
      if (actor.type === "npc") {
        const r = await new Roll("2d10").evaluate();
        apCurrent = r.total;
        await r.toMessage({ flavor: `${actor.name} — Initiative: ${r.total}` });
      } else {
        const apMod = actor.system.stats?.AP?.mod ?? 0;
        const numDice = Math.max(1, 1 + apMod);
        const r = await new Roll(`${numDice}d10`).evaluate();
        apCurrent = r.total;
        await r.toMessage({ flavor: `${actor.name} — Initiative (${numDice}d10): ${r.total}` });
      }
      const tokenActor = canvas.tokens.placeables.find(t => t.document.id === tokenDoc.id)?.actor ?? actor;
      await tokenActor.update({ "system.ctbAP": apCurrent });
      combatants.push({ actorId: actor.id, tokenId: tokenDoc.id, name: actor.name, img: tokenDoc.texture?.src ?? actor.img, isNPC: actor.type === "npc", apCurrent, apTotal: CTB.getAPTotal(actor), turnDone: false, conditions: actor.system.conditions ?? [] });
    }
    await CTB.setState({ phase: "ticking", combatants, round: 1 });
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:6px;padding:10px;font-family:sans-serif;text-align:center;color:#d4d8e0;"><div style="font-size:16px;font-weight:700;color:#e8c86a;text-transform:uppercase;letter-spacing:2px;">⚔ Combat Begin ⚔</div></div>` });
    // Reset per-combat flags for all tokens
    for (const tokenDoc of tokens) {
      const actor = tokenDoc.actor;
      if (!actor) continue;
      await actor.unsetFlag("dawnbreaker-trials", "ambushUsed");
      await actor.unsetFlag("dawnbreaker-trials", "tendonTargets");
      await actor.unsetFlag("dawnbreaker-trials", "blessingOfLight");
      await actor.unsetFlag("dawnbreaker-trials", "tailwindStacks");
      await actor.setFlag("dawnbreaker-trials", "bleedStacks", 0);
      await actor.unsetFlag("dawnbreaker-trials", "myrBandageUsed");
      const wilBonus = actor.getFlag("dawnbreaker-trials", "myrWILBonus");
      if (wilBonus?.active) {
        const curBonus = actor.system.stats?.WIL?.bonus ?? 0;
        await actor.update({ "system.stats.WIL.bonus": Math.max(0, curBonus - wilBonus.amount) });
        await actor.unsetFlag("dawnbreaker-trials", "myrWILBonus");
      }
    }
    // Open CTB display on all clients
    game.socket.emit("system.dawnbreaker-trials", { type: "ctbOpen" });
    await CTBDisplay.show();
    await new Promise(r => setTimeout(r, 200));
    await CTBEngine.tick();
  },
  async tick() {
    if (!game.user.isGM) return;
    const state = CTB.getState();
    if (!state.combatants) return;
    let combatants = foundry.utils.deepClone(state.combatants);
    for (const c of combatants) {
      const token = canvas.tokens.placeables.find(t => t.document?.id === c.tokenId || t.id === c.tokenId);
      const actor = token?.actor ?? game.actors.get(c.actorId);
      if (actor) c.apCurrent = actor.system.ctbAP ?? c.apCurrent;
    }
    const alreadyActive = combatants.filter(c => c.apCurrent >= 100 && !c.turnDone);
    if (alreadyActive.length) {
      // Guard: only one actor should ever be at 100. If somehow multiple are, cap the extras at 99.
      if (alreadyActive.length > 1) {
        alreadyActive.sort((a, b) => b.apCurrent - a.apCurrent || b.apTotal - a.apTotal);
        const winner = alreadyActive[0];
        combatants = combatants.map(c => (c.apCurrent >= 100 && !c.turnDone && c.tokenId !== winner.tokenId) ? { ...c, apCurrent: 99 } : c);
      }
      await CTB.setState({ ...state, phase: "active", combatants }); CTBDisplay.refresh(); _dbUpdateHeartbeat(); return;
    }

    // Fractional tick — advance AP until exactly one actor hits 100, no overshooting
    const tickEligible = combatants.filter(c => !c.turnDone && (c.apTotal ?? 0) > 0 && c.apCurrent < 100);
    if (!tickEligible.length) return;

    // Sort to find single leader: smallest fraction-to-100, tiebreak by highest AP then highest tick gain
    tickEligible.sort((a, b) => {
      const fa = (100 - a.apCurrent) / a.apTotal;
      const fb = (100 - b.apCurrent) / b.apTotal;
      if (Math.abs(fa - fb) > 0.0001) return fa - fb;
      if (b.apCurrent !== a.apCurrent) return b.apCurrent - a.apCurrent;
      return b.apTotal - a.apTotal;
    });
    const leader      = tickEligible[0];
    const minFraction = (100 - leader.apCurrent) / leader.apTotal;

    // Apply proportional gain — leader lands exactly at 100, all others capped at 99
    combatants = combatants.map(c => {
      if (c.turnDone || (c.apTotal ?? 0) <= 0) return c;
      if (c.tokenId === leader.tokenId) return { ...c, apCurrent: 100 };
      return { ...c, apCurrent: Math.min(99, Math.floor(c.apCurrent + (c.apTotal * minFraction))) };
    });

    const leaderTokenId = leader.tokenId;
    const atTurn        = combatants.filter(c => c.tokenId === leaderTokenId);
    const minTicks      = minFraction; // pass fraction to CastQueue.tickAll (it uses as multiplier)
    for (const c of combatants) {
      const token = canvas.tokens.placeables.find(t => t.document?.id === c.tokenId || t.id === c.tokenId);
      const actor = token?.actor ?? game.actors.get(c.actorId);
      if (!actor) continue;
      try { await actor.update({ "system.ctbAP": c.apCurrent }); actor.sheet?.render(false); }
      catch(e) {}
    }
    await CTB.setState({ ...state, phase: "active", combatants });
    const resolvedCasts = await CastQueue.tickAll(minTicks);
    for (const cast of resolvedCasts) await CastQueue.resolve(cast);
    const names = atTurn.map(c => `<b>${c.name}</b>`).join(", ");
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ It is now ${names}'s turn!</div>` });
    // Turn-order audio cue — broadcast to every client so nobody misses their turn
    try {
      (foundry.audio?.AudioHelper ?? AudioHelper).play(
        { src: "sounds/combat/epic-turn-1hit.ogg", volume: 0.6, autoplay: true, loop: false }, true);
    } catch(e) {}
    // Re-evaluate heartbeat now that combat is active (ally may already be critical)
    _dbUpdateHeartbeat();
    // "Your Turn" spotlight banner — broadcast to all clients + show locally
    const bannerEntries = atTurn.map(c => ({ actorId: c.actorId, name: c.name }));
    game.socket.emit("system.dawnbreaker-trials", { type: "turnBanner", entries: bannerEntries });
    _dbShowTurnBanner(bannerEntries);
    for (const c of combatants) {
      const token = canvas.tokens.placeables.find(t => t.document?.id === c.tokenId || t.id === c.tokenId);
      if (!token) continue;
      const isActive = atTurn.some(a => a.tokenId === c.tokenId);
      await _highlightToken(token, isActive);
      if (isActive) {
        await _showMovementRange(token);
        game.socket.emit("system.dawnbreaker-trials", { type: "showMovementRange", tokenId: c.tokenId });
      }
    }
    for (const entry of atTurn) {
      const canvasToken = canvas.tokens.placeables.find(t => t.document?.id === entry.tokenId || t.id === entry.tokenId);
      const actor = canvasToken?.actor ?? game.actors.get(entry.actorId);
      if (actor) {
        if (actor.type === "character") {
          await actor.update({ "system.turnPhase.active": true, "system.turnPhase.moved": false, "system.turnPhase.acted": false, "system.turnPhase.startX": canvasToken?.document?.x ?? 0, "system.turnPhase.startY": canvasToken?.document?.y ?? 0 });
        }
        await CTBEngine._onTurnStart(actor, combatants, entry.tokenId);
      }
    }
    CTBDisplay.refresh();
  },
  async endTurn(actorId, tokenId = null) {
    if (!actorId) { ui.notifications.warn("No actor selected!"); return; }
    if (!game.user.isGM) { game.socket.emit("system.dawnbreaker-trials", { type: "ctbEndTurn", actorId, tokenId }); return; }
    const state = CTB.getState();
    if (!state.combatants) return;
    let combatants = foundry.utils.deepClone(state.combatants);
    // Match by tokenId first (handles multiple unlinked tokens from same world actor)
    const idx = tokenId
      ? combatants.findIndex(c => c.tokenId === tokenId)
      : combatants.findIndex(c => c.actorId === actorId && c.apCurrent >= 100) !== -1
        ? combatants.findIndex(c => c.actorId === actorId && c.apCurrent >= 100)
        : combatants.findIndex(c => c.actorId === actorId);
    if (idx < 0) return;
    const token = canvas.tokens.placeables.find(t => t.document?.id === combatants[idx].tokenId || t.id === combatants[idx].tokenId);
    const actor = token?.actor ?? game.actors.get(actorId);
    if (actor) {
      const currentAP = actor.system.ctbAP ?? 0;
      combatants[idx].apCurrent = currentAP;
      if (actor.type === "character") {
        await actor.update({ "system.turnPhase.active": false, "system.turnPhase.moved": false, "system.turnPhase.acted": false });
      }
      const hasBattlecraze = actor.items?.some(i => i.type === "ability" && i.name?.toLowerCase().includes("battlecraze"))
        || Object.values(actor.system?.abilities ?? {}).some(arr => Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("battlecraze")));
      if (hasBattlecraze) {
        await actor.setFlag("dawnbreaker-trials", "battlecrazeHits", { active: true, hits: 0 });
      }
    }
    if (combatants[idx].apCurrent >= 100) {
      const deducted = combatants[idx].apCurrent - 100;
      combatants[idx].apCurrent = deducted;
      if (actor) await actor.update({ "system.ctbAP": deducted });
    }
    combatants[idx].turnDone = false;
    for (const c of combatants) {
      const cToken = canvas.tokens.placeables.find(t => t.document?.id === c.tokenId || t.id === c.tokenId);
      const cActor = cToken?.actor ?? game.actors.get(c.actorId);
      if (cActor) c.conditions = cActor.system.conditions ?? [];
    }
    const stillActive = combatants.filter((c, i) => i !== idx && c.apCurrent >= 100);
    await CTB.setState({ ...state, combatants, phase: stillActive.length ? "active" : "ticking" });
    CTBDisplay.refresh();
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #3a3f4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">✓ <b>${combatants[idx].name}</b> ended their turn.</div>` });
    const endingToken = canvas.tokens.placeables.find(t => t.document?.id === combatants[idx].tokenId || t.id === combatants[idx].tokenId);
    if (endingToken) await _highlightToken(endingToken, false);
    await _clearMovementRange();
    if (!stillActive.length) await CTBEngine.tick();
  },
  async _onTurnStart(actor, combatants, callerTokenId = null) {
    // Healing Beacon — must check BEFORE conditions early return since beacon has no conditions
    const beaconData = actor.getFlag("dawnbreaker-trials", "healingBeacon");
    if (beaconData?.active) {
      // Animation data stored in flag from macro at deploy time
      const BEACON_ANIM_FILE  = beaconData.healAnimFile  ?? "";
      const BEACON_ANIM_SCALE = beaconData.healAnimScale ?? 1.0;
      const BEACON_ANIM_SOUND = beaconData.healAnimSound ?? "";
      const turnsUsed   = (beaconData.turns ?? 0) + 1;
      const beaconToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
      const size        = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
      const BEACON_RANGE = 7;
      const beaconDisp  = beaconToken?.document?.disposition ?? 1;

      // Heal all friendly tokens within range 7 — skip Down actors
      const healed = [];
      const ignored = [];
      const healedTokens = [];
      for (const t of canvas.tokens.placeables) {
        if (!t.actor || t.document.disposition !== beaconDisp) continue;
        if (t.actor.id === actor.id) continue;
        const dist = Math.abs(Math.round(t.document.x/size) - Math.round(beaconToken.document.x/size))
                   + Math.abs(Math.round(t.document.y/size) - Math.round(beaconToken.document.y/size));
        if (dist > BEACON_RANGE) continue;
        const tActor = t.actor;
        const isDown = (tActor.system.conditions ?? []).some(c => c.name?.toLowerCase() === "down" || c.label === "down");
        if (isDown) { ignored.push(tActor.name); continue; }
        const curHP = tActor.system.hp?.current ?? 0;
        const maxHP = tActor.system.hp?.max ?? curHP;
        const curAR = tActor.system.ar?.current ?? 0;
        const maxAR = tActor.system.ar?.max ?? curAR;
        const newHP = Math.min(maxHP, curHP + 2);
        const newAR = Math.min(maxAR, curAR + 1);
        await tActor.update({ "system.hp.current": newHP, "system.ar.current": newAR });
        healed.push(`${tActor.name} (+2 HP, +1 AR)`);
        healedTokens.push(t);
      }

      // Play heal animation on every healed token
      if (BEACON_ANIM_FILE && window._playHitAnimation) {
        for (const ht of healedTokens) {
          await window._playHitAnimation(ht, BEACON_ANIM_FILE, BEACON_ANIM_SCALE, BEACON_ANIM_SOUND, beaconToken);
        }
      }

      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;">
        <div style="font-size:13px;font-weight:700;color:#81c784;border-bottom:1px solid #3a3f4a;padding-bottom:4px;margin-bottom:8px;">💊 Healing Beacon — Turn ${turnsUsed}/3</div>
        ${healed.length ? `<div style="font-size:12px;">Healed: ${healed.join(", ")}</div>` : `<div style="font-size:12px;color:#7a8090;">No allies in range.</div>`}
        ${ignored.length ? `<div style="font-size:11px;color:#e05555;margin-top:4px;">☠ Ignored (Down): ${ignored.join(", ")}</div>` : ""}
        ${turnsUsed >= 3 ? `<div style="font-size:11px;color:#e05555;margin-top:4px;">⚠ Beacon self-destructing!</div>` : ""}
      </div>` });

      if (turnsUsed >= 3) {
        const ctbState = CTB.getState();
        const beaconTokenId = beaconToken?.document?.id ?? beaconToken?.id;
        const newCombatants = (ctbState.combatants ?? []).filter(c => c.tokenId !== beaconTokenId);
        await CTB.setState({ ...ctbState, combatants: newCombatants });
        await beaconToken?.document?.delete();
      } else {
        await actor.setFlag("dawnbreaker-trials", "healingBeacon", { ...beaconData, turns: turnsUsed });
        const beaconTokenId = beaconToken?.document?.id ?? beaconToken?.id;
        await CTBEngine.endTurn(actor.id, beaconTokenId);
      }
      return;
    }

    // Crystal Burrower — auto-surface at turn start if burrowed flag is active
    const burrowedFlag = actor.getFlag("dawnbreaker-trials", "burrowed");
    if (burrowedFlag) {
      await actor.unsetFlag("dawnbreaker-trials", "burrowed");
      await actor.setFlag("dawnbreaker-trials", "tunnelAmbush", true);
      const bToken = (callerTokenId ? canvas.tokens.placeables.find(t => (t.document?.id ?? t.id) === callerTokenId) : null)
        ?? canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
      if (bToken) {
        const size       = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
        const bx         = Math.round(bToken.document.x / size);
        const by         = Math.round(bToken.document.y / size);
        const nearTokens = canvas.tokens.placeables.filter(t => {
          if (!t.actor || t.id === bToken.id) return false;
          const tx = Math.round(t.document.x / size);
          const ty = Math.round(t.document.y / size);
          return Math.abs(tx - bx) <= 1 && Math.abs(ty - by) <= 1;
        });
        for (const t of nearTokens) {
          const curHP = t.actor.system.hp?.current ?? 0;
          const newHP = Math.max(0, curHP - 8);
          await window._dbApplyDamage({ type: "applyDamage", actorId: t.actor.id, tokenId: t.document?.id ?? t.id, newHP, attackType: "physical", sourceActorId: actor.id });
          const eConds = foundry.utils.deepClone(t.actor.system.conditions ?? []);
          if (!eConds.some(c => c.name === "prone")) {
            eConds.push({ name: "prone", label: "prone", duration: 2, instance: 0, effect: "" });
            await t.actor.update({ "system.conditions": eConds });
            await _applyStatusEffect(t.actor, "prone", true);
          }
        }
        const hitList = nearTokens.map(t => t.actor.name).join(", ") || "none";
        // Surface animation (slot: "surface")
        const surfaceSlot = _getNPCAnimSlot(actor, "surface");
        if (surfaceSlot?.file) await window._playHitAnimation(bToken, surfaceSlot.file, surfaceSlot.scale ?? 1.0, surfaceSlot.sound ?? "");
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e57373;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:13px;font-weight:700;color:#e57373;border-bottom:1px solid #3a3f4a;padding-bottom:4px;margin-bottom:8px;">🪨 ${actor.name} — Surfaces from below!</div><div style="font-size:12px;">Emergence shockwave: adjacent tokens take <b>8 flat HP</b> + <b>Prone (2t)</b>.</div><div style="font-size:12px;color:#7a8090;">Hit: ${hitList}</div><div style="font-size:11px;color:#e57373;margin-top:4px;">⚡ Tunnel Ambush active — next attack ignores Avoid and Guard.</div></div>` });
      }
      // Continue to condition tick processing — don't return early
    }

    const conditions = foundry.utils.deepClone(actor.system.conditions ?? []);
    if (!conditions.length) return;
    const expired  = [];
    const remaining = [];
    for (const c of conditions) {
      // Permanent: duration 0/null AND instance 0 — never expires
      if (!(c.duration > 0) && !(c.instance > 0)) { remaining.push(c); continue; }
      // Instance-based: expires on hit, not on turn
      if (!(c.duration > 0) && (c.instance > 0)) { remaining.push(c); continue; }
      // Turn-based: decrement and expire when it reaches 0
      const newDur = (c.duration ?? 0) - 1;
      if (newDur <= 0) { expired.push(c); } else { remaining.push({ ...c, duration: newDur }); }
    }
    await actor.update({ "system.conditions": remaining });
    for (const c of expired) { if (c.label) await _applyStatusEffect(actor, c.label, false); }
    if (expired.length) {
      const names = expired.map(c => c.name).join(", ");
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #3a3f4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⏱ <b>${actor.name}</b> — Expired: <span style="color:#e07a30;font-weight:700;">${names}</span></div>` });
      const downExpired = expired.find(c => c.name?.toLowerCase() === "down");
      if (downExpired && game.user.isGM) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;text-align:center;">☠ <b style="color:#e05555;">${actor.name}</b> has been <span style="color:#e05555;font-weight:700;">removed from combat</span> — Down timer elapsed.</div>` });
        const state = CTB.getState();
        if (state.combatants) {
          const downActorToken = canvas.tokens.placeables.find(t => t.document?.id === callerTokenId || t.id === callerTokenId || t.actor?.id === actor.id);
          const downTokenId    = callerTokenId ?? downActorToken?.document?.id ?? downActorToken?.id;
          const newCombatants  = downTokenId
            ? state.combatants.filter(c => c.tokenId !== downTokenId)
            : state.combatants.filter(c => c.actorId !== actor.id);
          await CTB.setState({ ...state, combatants: newCombatants });
          CTBDisplay.refresh();
        }
        const dToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
        if (dToken) await _highlightToken(dToken, false);
      }
    }
    const idx = combatants?.findIndex(c => c.actorId === actor.id);
    if (idx >= 0) combatants[idx].conditions = remaining;

    // DoT processing — fire any "dot:type:amount" effects on remaining conditions
    for (const c of remaining) {
      if (!c.effect?.startsWith("dot:")) continue;
      const parts  = c.effect.split(":");
      const dotType = parts[1]; // "ar" or "hp"
      const dotAmt  = parseInt(parts[2]) || 0;
      if (dotAmt <= 0) continue;

      if (dotType === "ar") {
        const curAR = actor.system.ar?.current ?? 0;
        const newAR = Math.max(0, curAR - dotAmt);
        if (game.user.isGM) await actor.update({ "system.ar.current": newAR });
        else game.socket.emit("system.dawnbreaker-trials", { type: "throwApply", actorId: actor.id, tokenId: callerTokenId ?? undefined, updates: { "system.ar.current": newAR } });
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🌿 <b>${c.name}</b> — <b>${actor.name}</b> 🛡 AR: <span style="color:#64b5f6;">${curAR}</span> → <span style="color:${newAR<=0?"#e05555":"#81c784"};font-weight:700;">${newAR}</span> (−${dotAmt})</div>` });
      } else if (dotType === "hp") {
        const curHP = actor.system.hp?.current ?? 0;
        const newHP = Math.max(0, curHP - dotAmt);
        const data  = { type: "applyDamage", actorId: actor.id, tokenId: callerTokenId ?? undefined, newHP, attackType: "magical" };
        if (game.user.isGM) await window._dbApplyDamage(data);
        else game.socket.emit("system.dawnbreaker-trials", data);
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🌿 <b>${c.name}</b> — <b>${actor.name}</b> ❤ HP: <span style="color:#e57373;">${curHP}</span> → <span style="color:${newHP<=0?"#e05555":"#81c784"};font-weight:700;">${newHP}</span> (−${dotAmt})</div>` });
      }
    }

    // Rememberance — when haunt expires, apply accumulated damage back to haunted actor
    const hauntExpired = expired.find(c => c.name?.toLowerCase() === "haunted");
    if (hauntExpired && game.user.isGM) {
      const haunt = actor.getFlag("dawnbreaker-trials", "hauntData");
      if (haunt && (haunt.hp > 0 || haunt.ar > 0)) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #a080ff;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;">
          <div style="font-size:13px;font-weight:700;color:#a080ff;border-bottom:1px solid #3a3f4a;padding-bottom:4px;margin-bottom:8px;">👻 Rememberance — Haunt Expires on ${actor.name}</div>
          <div style="font-size:12px;">Damage dealt while haunted: ❤ <b>${haunt.hp}</b> HP | 🛡 <b>${haunt.ar}</b> AR</div>
          <div style="font-size:11px;color:#7a8090;margin-top:4px;">Now applying that damage back!</div>
        </div>` });
        if (haunt.hp > 0) {
          const curHP = actor.system.hp?.current ?? 0;
          const newHP = Math.max(0, curHP - haunt.hp);
          await window._dbApplyDamage({ type: "applyDamage", actorId: actor.id, tokenId: callerTokenId ?? undefined, newHP, attackType: "magical" });
        }
        if (haunt.ar > 0) {
          const curAR = actor.system.ar?.current ?? 0;
          const newAR = Math.max(0, curAR - haunt.ar);
          await window._dbApplyDamage({ type: "applyARDamage", actorId: actor.id, tokenId: callerTokenId ?? undefined, newAR, attackType: "magical" });
        }
        await actor.unsetFlag("dawnbreaker-trials", "hauntData");
      }
    }

    // Bleeder — tick bleeding stacks, deal HP damage, then reduce by 1
    const bleedStacks = actor.getFlag("dawnbreaker-trials", "bleedStacks") ?? 0;
    if (bleedStacks > 0) {
      const curHP  = actor.system.hp?.current ?? 0;
      const newHP  = Math.max(0, curHP - bleedStacks);
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🩸 <b>${actor.name}</b> is Bleeding — <span style="color:#e05555;font-weight:700;">${bleedStacks} stacks</span> deal ${bleedStacks} HP damage. Stacks: ${bleedStacks} → ${bleedStacks - 1}</div>` });
      await window._dbApplyDamage({ type: "applyDamage", actorId: actor.id, tokenId: callerTokenId ?? undefined, newHP, attackType: "physical", noBleed: true });
      await actor.setFlag("dawnbreaker-trials", "bleedStacks", bleedStacks - 1);
    }

    // Aim — clear bonus at start of turn (it applied last turn)
    const aimData = actor.getFlag("dawnbreaker-trials", "aimBonus");
    if (aimData?.active) {
      await actor.unsetFlag("dawnbreaker-trials", "aimBonus");
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🎯 <b>Aim</b> — ${actor.name}'s Aim bonus has expired.</div>` });
    }

    // Light Aura — caster's turn: deduct 1 KI, re-apply glow, heal allies, refresh AURA conditions
    const laData = actor.getFlag("dawnbreaker-trials", "lightAura");
    if (laData?.active && game.user.isGM) {
      if (laData.skipFirstKI) {
        await actor.setFlag("dawnbreaker-trials", "lightAura", { ...laData, skipFirstKI: false });
      } else {
        const curKI = actor.system.ki?.current ?? 0;
        if (curKI <= 0) {
          await _cancelLightAura(actor, "ran out of KI");
        } else {
          await actor.update({ "system.ki.current": curKI - 1 });
          await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #a080ff;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">✨ <b>Light Aura</b> — ${actor.name} maintains the aura. KI: ${curKI} → ${curKI - 1}</div>` });
          // Re-apply glow (Crystal Fungus style) in case it was wiped
          if (laData.tokenId) {
            const laTok = canvas.tokens.placeables.find(t => (t.document?.id ?? t.id) === laData.tokenId);
            if (laTok) await laTok.document.update({ "light.bright": 2, "light.dim": 7, "light.color": "#c8a820", "light.alpha": 0.45, "light.animation": { type: "emanation", speed: 2, intensity: 3 } });
          }
          // Refresh which allies are in range and heal them
          await _lightAuraUpdateAllyConditions(actor, laData.tokenId, laData.prMRBonus ?? 0);
          const casterTok = canvas.tokens.placeables.find(t => (t.document?.id ?? t.id) === laData.tokenId);
          const gridSla = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
          const cx2 = casterTok ? Math.round(casterTok.document.x / gridSla) : null;
          const cy2 = casterTok ? Math.round(casterTok.document.y / gridSla) : null;
          for (const tok of canvas.tokens.placeables) {
            const a2 = tok.actor;
            if (!a2 || a2.id === actor.id) continue;
            if (tok.document.disposition !== casterTok?.document?.disposition) continue;
            if (cx2 !== null) {
              const d2 = Math.abs(Math.round(tok.document.x / gridSla) - cx2) + Math.abs(Math.round(tok.document.y / gridSla) - cy2);
              if (d2 > 5) continue;
            }
            const curHP2 = a2.system.hp?.current ?? 0, maxHP2 = a2.system.hp?.max ?? curHP2;
            const curAR2 = a2.system.ar?.current ?? 0, maxAR2 = a2.system.ar?.max ?? curAR2;
            const healHP = curHP2 < maxHP2, healAR = curAR2 < maxAR2;
            const upd = {};
            if (healHP) upd["system.hp.current"] = Math.min(maxHP2, curHP2 + 1);
            if (healAR) upd["system.ar.current"] = Math.min(maxAR2, curAR2 + 1);
            if (healHP || healAR) {
              await a2.update(upd);
              await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #a080ff;border-radius:4px;padding:4px 10px;font-family:sans-serif;font-size:11px;color:#d4d8e0;">✨ <b>Light Aura</b> — ${a2.name}${healHP ? " ❤ +1 HP" : ""}${healAR ? " 🛡 +1 AR" : ""}</div>` });
            }
          }
        }
      }
    }

    // Light Aura — if this actor has the AURA condition but no allied caster is active, strip it
    if (game.user.isGM) {
      const hasAuraCond = (actor.system.conditions ?? []).some(c => c.label === "aura");
      if (hasAuraCond) {
        const anyActiveCaster = canvas.tokens.placeables.some(t => {
          if (!t.actor || t.actor.id === actor.id) return false;
          return t.actor.getFlag("dawnbreaker-trials", "lightAura")?.active;
        });
        if (!anyActiveCaster) {
          const stripped = (actor.system.conditions ?? []).filter(c => c.label !== "aura");
          await actor.update({ "system.conditions": stripped });
        }
      }
    }

    // Battlecraze — ensure tracking is active at turn start if actor has ability
    const hasBattlecraze = actor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("battlecraze"))
      || Object.values(actor.system.abilities ?? {}).some(arr => Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("battlecraze")));
    if (hasBattlecraze) {
      const prev = await actor.getFlag("dawnbreaker-trials", "battlecrazeHits") ?? { active: true, hits: 0 };
      if (!prev?.active) {
        await actor.setFlag("dawnbreaker-trials", "battlecrazeHits", { active: true, hits: 0 });
      }
      // Show current battlecraze status in chat
      const hits = prev?.hits ?? 0;
      if (hits > 0) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e07a30;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">💢 <b>Battlecraze</b> — <b>${actor.name}</b> has <span style="color:#c8a84b;font-weight:700;">${hits} hit${hits!==1?"s":""}</span> stored — BRK <span style="color:#e07a30;font-weight:700;">+${hits * 2}</span> on next BRK attack.</div>` });
      }
    }
  },
  async endCombat() {
    if (!game.user.isGM) return;
    const state = CTB.getState();
    for (const c of (state.combatants ?? [])) {
      const token = canvas.tokens.placeables.find(t => t.document?.id === c.tokenId || t.id === c.tokenId) ?? canvas.tokens.placeables.find(t => t.actor?.id === c.actorId);
      const actor = token?.actor ?? game.actors.get(c.actorId);
      if (actor) await actor.update({ "system.ctbAP": 0 });
      if (token) await _highlightToken(token, false);
    }

    // Abandon any unanswered reaction prompts so their timers can't fire later
    for (const h of _dbPendingReactions.values()) clearTimeout(h);
    _dbPendingReactions.clear();

    // Clear the turn-timer chip on every client
    game.socket.emit("system.dawnbreaker-trials", { type: "turnBannerClear" });
    _dbClearTurnTimer();

    // Stop the low-HP heartbeat loop on every client
    _dbStopHeartbeat();

    // ── Clear combat-scoped flags on every token so nothing carries into the
    //    next fight (boss breakpoints re-arm, Ambush refreshes, stacks reset) ──
    await _clearCombatFlags();

    // Strip stale conditions left behind by ticks/reactions (orphaned haunts,
    // lingering Down on revived units, duplicates) — silent, no dialog.
    try { await _dbCleanupStaleSilent(); } catch (e) { console.warn("DBT | stale cleanup failed", e); }

    await _clearMovementRange();
    await CTB.setState({ phase: "idle", combatants: [] });
    CTBDisplay.refresh();
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:6px;padding:10px;font-family:sans-serif;text-align:center;color:#d4d8e0;"><div style="font-size:16px;font-weight:700;color:#e8c86a;text-transform:uppercase;letter-spacing:2px;">🏳 Combat Ended</div></div>` });

    // Victory sting (one-shot, broadcast to all)
    _dbAudioSting("audioVictorySrc", 0.8);

    // ── End-of-combat recap ──
    await _postCombatRecap();

    // Clear Myr WIL bonus
    await window._myrWILCleanup();

    // Stop all currently playing playlists (combat music etc)
    for (const pl of game.playlists.filter(p => p.playing)) {
      await pl.stopAll();
    }

    // Resume scene playlist if assigned
    const scenePlaylist = canvas.scene?.playlist instanceof Playlist
      ? canvas.scene.playlist
      : (canvas.scene?.playlist ? game.playlists.get(canvas.scene.playlist) : null);
    if (scenePlaylist && !scenePlaylist.playing) {
      const soundId = canvas.scene?.playlistSound?.id ?? canvas.scene?.playlistSound;
      if (soundId) {
        const sound = scenePlaylist.sounds.get(soundId);
        if (sound) await scenePlaylist.playSound(sound);
        else await scenePlaylist.playAll();
      } else {
        await scenePlaylist.playAll();
      }
    }
  },
};

// ═══════════════════════════════════════════════════════════
//  TARGET SELECTOR
// ═══════════════════════════════════════════════════════════
class TargetSelector extends foundry.appv1.api.Application {
  constructor(options = {}) {
    super(options);
    this._abilityName = options.abilityName ?? "Attack";
    this._abilityDesc = options.abilityDesc ?? "";
    this._abilityIcon = options.abilityIcon ?? "⚔";
    this._targetType  = options.targetType  ?? "enemy";
    this._onSelect    = options.onSelect    ?? null;
    this._attacker    = options.attacker    ?? null;
    this._attackerToken = options.attackerToken ?? null;
    this._reach       = options.reach       ?? 99;
    this._minReach    = options.minReach    ?? 0;
    this._range       = options.range       ?? 0;
    this._shape       = options.shape       ?? "circle";
    this._archingShot = options.archingShot ?? false;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { id: "db-target-selector", title: "Select Target", template: "systems/dawnbreaker-trials/templates/target-selector.html", width: "auto", height: "auto", resizable: false, popOut: true, classes: ["db-target-selector"], left: 10, top: 60 });
  }
  async _render(force, options) {
    await super._render(force, options);
    if (force) {
      // Append to the right of the rightmost visible DBT HUD column
      // (party bar → action menu → submenu), top-aligned with it. Settle
      // delay so the window's own auto-sizing doesn't override the position.
      setTimeout(() => {
        // NOTE: the HUD columns are position:fixed — offsetParent is always
        // null for those, so visibility must be checked via rect + computed
        // style instead.
        const hudEls = ["dbt-hud-sub", "dbt-hud-root", "dbt-party-root"]
          .map(id => document.getElementById(id))
          .filter(el => {
            if (!el) return false;
            const r = el.getBoundingClientRect();
            const cs = window.getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
          });
        if (hudEls.length) {
          const rects = hudEls.map(el => el.getBoundingClientRect());
          const rightmost = rects.reduce((a, b) => (b.right > a.right ? b : a));
          this.setPosition({ left: rightmost.right + 8, top: rightmost.top });
        } else {
          const ctb = CTBDisplay.getInstance();
          if (ctb?.rendered) {
            const { left, top, width } = ctb.position;
            this.setPosition({ left: left + width + 4, top });
          }
        }
      }, 50);
    }
  }
  _tileDistance(tokenA, tokenB) {
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    const ax = Math.round(tokenA.document.x / size);
    const ay = Math.round(tokenA.document.y / size);
    const wA = Math.max(1, Math.round(tokenA.document.width  ?? 1));
    const hA = Math.max(1, Math.round(tokenA.document.height ?? 1));
    const bx = Math.round(tokenB.document.x / size);
    const by = Math.round(tokenB.document.y / size);
    const wB = Math.max(1, Math.round(tokenB.document.width  ?? 1));
    const hB = Math.max(1, Math.round(tokenB.document.height ?? 1));
    // Minimum Manhattan distance between the two tile-rectangles
    const dx = Math.max(0, bx - (ax + wA - 1), ax - (bx + wB - 1));
    const dy = Math.max(0, by - (ay + hA - 1), ay - (by + hB - 1));
    return dx + dy;
  }
  _getAoETiles(centerToken, attackerToken) {
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    const cx = Math.round(centerToken.document.x/size), cy = Math.round(centerToken.document.y/size);
    const ax = attackerToken ? Math.round(attackerToken.document.x/size) : cx;
    const ay = attackerToken ? Math.round(attackerToken.document.y/size) : cy;
    const tiles = new Set([`${cx},${cy}`]);
    if (this._range <= 0) return tiles;
    const shape = this._shape.toLowerCase();
    if (shape === "circle" || shape === "diamond") {
      for (let dx = -this._range; dx <= this._range; dx++)
        for (let dy = -this._range; dy <= this._range; dy++)
          if (Math.abs(dx) + Math.abs(dy) <= this._range) tiles.add(`${cx+dx},${cy+dy}`);
    } else if (shape.startsWith("line")) {
      const len = parseInt(shape.split(":")[1] ?? this._range);
      const dx = cx-ax, dy = cy-ay, dist = Math.abs(dx)+Math.abs(dy);
      const stepX = dist>0?Math.round(dx/dist):0, stepY = dist>0?Math.round(dy/dist):0;
      for (let i = 1; i <= len; i++) tiles.add(`${cx+stepX*i},${cy+stepY*i}`);
    } else if (shape === "cross") {
      for (let i = 1; i <= this._range; i++) { tiles.add(`${cx+i},${cy}`); tiles.add(`${cx-i},${cy}`); tiles.add(`${cx},${cy+i}`); tiles.add(`${cx},${cy-i}`); }
    } else if (shape === "t") {
      const dx = cx-ax, dy = cy-ay, dist = Math.abs(dx)+Math.abs(dy);
      const fwdX = dist>0?Math.round(dx/dist):0, fwdY = dist>0?Math.round(dy/dist):0;
      tiles.add(`${cx+fwdX},${cy+fwdY}`);
      for (let i = 1; i <= this._range; i++) { tiles.add(`${cx+fwdY*i},${cy+fwdX*i}`); tiles.add(`${cx-fwdY*i},${cy-fwdX*i}`); }
    } else if (shape === "cone") {
      const dx = cx-ax, dy = cy-ay, dist = Math.abs(dx)+Math.abs(dy);
      const fwdX = dist>0?Math.round(dx/dist):0, fwdY = dist>0?Math.round(dy/dist):0;
      for (let f = 1; f <= this._range; f++)
        for (let p = -f; p <= f; p++) tiles.add(`${cx+fwdX*f+fwdY*p},${cy+fwdY*f+fwdX*p}`);
    }
    return tiles;
  }
  // Every tile a token's footprint occupies (large tokens span multiple tiles).
  _footprintTiles(token) {
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    const x0 = Math.round(token.document.x/size), y0 = Math.round(token.document.y/size);
    const w  = Math.max(1, Math.round(token.document.width  ?? 1));
    const h  = Math.max(1, Math.round(token.document.height ?? 1));
    const s = new Set();
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) s.add(`${x0+dx},${y0+dy}`);
    return s;
  }
  _getAffectedTokens(centerToken, allTokens) {
    if (this._range <= 0) return [centerToken];
    const attackerToken = this._attackerToken ?? canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
    const aoeTiles = this._getAoETiles(centerToken, attackerToken);
    // A token is caught if ANY tile of its footprint intersects the blast.
    return allTokens.filter(t => {
      for (const key of this._footprintTiles(t)) if (aoeTiles.has(key)) return true;
      return false;
    });
  }
  _showAoEPreview(centerToken) {
    canvas.interface.grid.clearHighlightLayer("crucible.aoe");
    canvas.interface.grid.addHighlightLayer("crucible.aoe");
    if (this._range <= 0) return;
    const attackerToken = this._attackerToken ?? canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
    const aoeTiles = this._getAoETiles(centerToken, attackerToken);
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    for (const tile of aoeTiles) {
      const [tx, ty] = tile.split(",").map(Number);
      canvas.interface.grid.highlightPosition("crucible.aoe", { x: tx*size, y: ty*size, color: 0xffaa00, border: 0xcc7700, alpha: 0.3 });
    }
  }
  _clearAoEPreview() { canvas.interface?.grid?.clearHighlightLayer("crucible.aoe"); }
  // Live "caught in the blast" readout — a floating list of every token the
  // AoE currently covers, color-coded ally (green) / enemy (red) / self (gold),
  // so you can confirm the hit before committing instead of eyeballing tiles.
  _showAoEReadout(centerToken) {
    this._clearAoEReadout();
    if (this._range <= 0) return;
    const affected = this._getAffectedTokens(centerToken, canvas.tokens.placeables);
    if (!affected.length) return;
    const attackerToken = this._attackerToken ?? canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
    const attackerDisp  = attackerToken?.document?.disposition ?? 1;
    const esc = (s) => String(s ?? "").replace(/</g, "&lt;");
    const chips = affected.map(t => {
      const isSelf = attackerToken && t.id === attackerToken.id;
      const foe    = t.document.disposition !== attackerDisp;
      const color  = isSelf ? "#c8a84b" : foe ? "#e57373" : "#81c784";
      const dot    = isSelf ? "◆" : foe ? "▲" : "●";
      return `<span style="color:${color};font-weight:600;white-space:nowrap;">${dot} ${esc(t.name)}</span>`;
    }).join('<span style="color:#3a3f4a;">·</span> ');
    const shapeLabel = String(this._shape).split(":")[0].toUpperCase();
    const el = document.createElement("div");
    el.id = "dbt-aoe-readout";
    el.innerHTML = `<span style="color:#ffaa00;font-weight:700;margin-right:8px;">💥 ${shapeLabel} — hits ${affected.length}</span>${chips}`;
    Object.assign(el.style, {
      position: "fixed", top: "64px", left: "50%", transform: "translateX(-50%)",
      zIndex: "9999", background: "rgba(18,20,24,0.94)", border: "1px solid #ffaa00",
      borderRadius: "6px", padding: "7px 14px", fontFamily: "sans-serif", fontSize: "13px",
      color: "#d4d8e0", pointerEvents: "none", maxWidth: "76vw", display: "flex",
      flexWrap: "wrap", gap: "6px", alignItems: "center", boxShadow: "0 3px 12px rgba(0,0,0,0.5)",
    });
    (document.getElementById("interface") ?? document.body).appendChild(el);
  }
  _clearAoEReadout() { document.getElementById("dbt-aoe-readout")?.remove(); }
  _showRangeHighlight() {
    if (!canvas.interface?.grid) return;
    canvas.interface.grid.clearHighlightLayer("crucible.range");
    canvas.interface.grid.addHighlightLayer("crucible.range");
    if (this._reach >= 99) return;
    const attackerToken = this._attackerToken ?? canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
    if (!attackerToken) return;
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    const origX = Math.round(attackerToken.document.x/size), origY = Math.round(attackerToken.document.y/size);
    const visited = new Set(), queue = [{ x: origX, y: origY, dist: 0 }];
    visited.add(`${origX},${origY}`);
    const allTokens = canvas.tokens.placeables;
    while (queue.length) {
      const { x, y, dist } = queue.shift();
      if (dist > 0) canvas.interface.grid.highlightPosition("crucible.range", { x: x*size, y: y*size, color: 0xff2222, border: 0xcc0000, alpha: 0.18 });
      if (dist >= this._reach) continue;
      for (const n of [{ x: x+1, y }, { x: x-1, y }, { x, y: y+1 }, { x, y: y-1 }]) {
        const k = `${n.x},${n.y}`;
        if (visited.has(k)) continue;
        // Wall check
        let wallBlocked = false;
        try {
          const from = { x: x*size + size/2, y: y*size + size/2 };
          const to   = { x: n.x*size + size/2, y: n.y*size + size/2 };
          wallBlocked = CONFIG.Canvas.polygonBackends.move.testCollision(from, to, { type: "move", mode: "any" });
        } catch(e) {
          try { wallBlocked = canvas.walls.checkCollision(new Ray({ x: x*size+size/2, y: y*size+size/2 }, { x: n.x*size+size/2, y: n.y*size+size/2 }), { type: "move" }); } catch(e2) {}
        }
        if (wallBlocked) continue;
        // Enemy token blocks further expansion
        const tokenBlocked = allTokens.some(t => {
          if (t.id === attackerToken.id) return false;
          if (t.document.disposition === attackerToken.document.disposition) return false;
          return Math.round(t.document.x/size) === n.x && Math.round(t.document.y/size) === n.y;
        });
        visited.add(k);
        queue.push({ ...n, dist: dist + 1 });
        if (tokenBlocked) continue; // highlight tile but don't expand past enemy
      }
    }
  }
  _clearRangeHighlight() { canvas.interface?.grid?.clearHighlightLayer("crucible.range"); this._clearTargetLines(); }
  // Draws a line from the attacker to each candidate target: green = in range
  // & clear LOS, orange = in range but line of sight blocked, grey = out of range.
  _showTargetLines() {
    this._clearTargetLines();
    const attackerToken = this._attackerToken ?? canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
    if (!attackerToken?.center) return;
    const ax = attackerToken.center.x, ay = attackerToken.center.y;
    const attackerDisp = attackerToken.document.disposition;
    const g = new PIXI.Graphics();
    g.zIndex = 60;
    g.eventMode = "none";
    let drew = false;
    for (const t of canvas.tokens.placeables) {
      if (!t.actor || t.id === attackerToken.id || !t.center) continue;
      const isEnemy = t.document.disposition !== attackerDisp;
      if (this._targetType === "enemy" && !isEnemy) continue;
      if (this._targetType === "ally"  &&  isEnemy) continue;
      const dist = this._tileDistance(attackerToken, t);
      const inRange = dist <= this._reach && dist >= this._minReach;
      if (!inRange && this._reach >= 99) continue; // unlimited reach — don't draw to everyone
      let losBlocked = false;
      if (inRange && this._reach > 1 && !this._archingShot && window._checkRangedLOS) {
        losBlocked = !!window._checkRangedLOS(attackerToken, t, false).blocked;
      }
      let color, alpha;
      if (!inRange)        { color = 0x6a6f78; alpha = 0.28; }
      else if (losBlocked) { color = 0xe07a30; alpha = 0.75; }
      else                 { color = 0x3de89a; alpha = 0.85; }
      g.lineStyle(2.5, color, alpha);
      g.moveTo(ax, ay);
      g.lineTo(t.center.x, t.center.y);
      g.beginFill(color, Math.min(1, alpha + 0.1));
      g.drawCircle(t.center.x, t.center.y, 5);
      g.endFill();
      drew = true;
    }
    if (drew) { canvas.interface.addChild(g); this._targetLines = g; }
    else { g.destroy(); }
  }
  _clearTargetLines() {
    if (this._targetLines) { try { this._targetLines.destroy(); } catch(e) {} this._targetLines = null; }
  }
  getData() {
    const attacker = this._attacker, allTokens = canvas.tokens.placeables;
    const attackerToken = this._attackerToken ?? allTokens.find(t => t.actor?.id === attacker?.id);
    const attackerDisp  = attackerToken?.document?.disposition ?? attacker?.prototypeToken?.disposition ?? 1;

    // Check if attacker is threatened — if so, only show the threatening actor as a target
    const attackerConditions = attacker?.system?.conditions ?? [];
    const threatenedCond = attackerConditions.find(c => c.label === "threatened" || c.name.toLowerCase() === "threatened");
    const threatenedByActorId = threatenedCond?.effect ?? null; // effect stores the threatening actor's id

    const buildEntry = (t) => {
      const actor = t.actor, scanned = actor?.system?.conditions?.some(c => c.name.toLowerCase() === "scan");
      const showStats = !(actor?.type === "npc") || scanned || game.user.isGM;
      const dist = attackerToken ? this._tileDistance(attackerToken, t) : 0;
      // LOS check for ranged attacks (reach > 1) — straight line blocked by tokens/walls unless archingShot
      let losBlocked = false;
      if (attackerToken && this._reach > 1 && !this._archingShot && window._checkRangedLOS) {
        const los = window._checkRangedLOS(attackerToken, t, false);
        losBlocked = los.blocked;
      }
      return { tokenId: t.id, name: t.name, img: t.document.texture?.src ?? actor?.img, disposition: t.document.disposition, showStats, inRange: dist <= this._reach && dist >= this._minReach && !losBlocked, dist, losBlocked, hp: showStats ? actor?.system?.hp : null, ar: showStats ? actor?.system?.ar : null, ki: showStats ? actor?.system?.ki : null, conditions: actor?.system?.conditions ?? [] };
    };
    const enemies = [], allies = [];
    for (const t of allTokens) {
      if (!t.actor) continue;
      // Exclude the attacker's own token by token identity, not actor id —
      // unlinked duplicate tokens (e.g. multiple Golem Sentries) share the
      // same actor id and must remain individually targetable. Self stays
      // targetable for ally/any abilities (heals, buffs) — only excluded
      // from enemy-targeting attacks.
      const isSelf = attackerToken ? t.id === attackerToken.id : t.actor.id === attacker?.id;
      if (isSelf && this._targetType === "enemy") continue;

      // If attacker is threatened, only show the threatening actor regardless of range/type
      if (threatenedByActorId) {
        if (t.actor.id !== threatenedByActorId) continue;
        const entry = buildEntry(t);
        entry.inRange = true; // always show as in range
        enemies.push(entry);
        continue;
      }

      const isEnemy = t.document.disposition !== attackerDisp;
      const entry = buildEntry(t);
      if (this._targetType === "enemy" && isEnemy) enemies.push(entry);
      else if (this._targetType === "ally" && !isEnemy) allies.push(entry);
      else if (this._targetType === "any") { if (isEnemy) enemies.push(entry); else allies.push(entry); }
    }
    const inRangeEnemies = enemies.filter(e => e.inRange), inRangeAllies = allies.filter(a => a.inRange);
    return { abilityName: this._abilityName, abilityDesc: this._abilityDesc, abilityIcon: this._abilityIcon, reach: this._reach < 99 ? this._reach : null, range: this._range, shape: this._shape, enemies, allies, anyInRange: inRangeEnemies.length > 0 || inRangeAllies.length > 0 };
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".db-target-btn").click(async (ev) => {
      const tokenId = ev.currentTarget.dataset.tokenId;
      const token   = canvas.tokens.placeables.find(t => t.document?.id === tokenId || t.id === tokenId);
      if (!token) return;
      const attackerToken = this._attackerToken ?? canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
      if (attackerToken) {
        const selDist = this._tileDistance(attackerToken, token);
        if (selDist > this._reach) { ui.notifications.warn(`Out of range!`); return; }
        if (selDist < this._minReach) { ui.notifications.warn(`Target is too close!`); return; }
      }
      const affectedTokens = this._getAffectedTokens(token, canvas.tokens.placeables);
      this._clearAoEPreview(); this._clearAoEReadout(); this._clearRangeHighlight();
      // Face attacker toward selected target (skip on self-target — the
      // zero-length vector would snap facing to East)
      if (attackerToken && token.id !== attackerToken.id) {
        const dx = token.document.x - attackerToken.document.x;
        const dy = token.document.y - attackerToken.document.y;
        const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI); // −180..180, 0=East
        // Snap to nearest cardinal: E=0, S=90, W=180, N=270 (About Face convention)
        const cardinals = [0, 90, 180, 270];
        const normalised = ((angleDeg % 360) + 360) % 360;
        const facing = cardinals.reduce((best, c) => {
          const diff = Math.abs(((normalised - c + 180 + 360) % 360) - 180);
          return diff < Math.abs(((normalised - best + 180 + 360) % 360) - 180) ? c : best;
        }, cardinals[0]);
        await attackerToken.document.update({ "flags.about-face.direction": facing });
      }
      if (this._onSelect) await this._onSelect(token, affectedTokens);
      this._skipResolve = true;
      await Application.prototype.close.call(this);
    });
    html.find(".db-target-row").hover(
      (ev) => { const t = canvas.tokens.placeables.find(t => t.id === ev.currentTarget.dataset.tokenId); if (t) { t._onHoverIn?.(ev); if (this._range > 0) { this._showAoEPreview(t); this._showAoEReadout(t); } } },
      (ev) => { const t = canvas.tokens.placeables.find(t => t.id === ev.currentTarget.dataset.tokenId); t?._onHoverOut?.(ev); this._clearAoEPreview(); this._clearAoEReadout(); }
    );
    setTimeout(() => { canvas.interface?.grid?.clearHighlightLayer("crucible.movement"); this._showRangeHighlight(); this._showTargetLines(); }, 150);
  }
  async close(...args) { this._clearAoEPreview(); this._clearAoEReadout(); this._clearRangeHighlight(); this._clearTargetLines(); return super.close(...args); }
  static select({ abilityName, abilityDesc, abilityIcon, targetType, attacker, attackerToken, tokenDoc, reach, minReach, range, shape, archingShot }) {
    return new Promise((resolve) => {
      // Resolve the specific canvas token placeable for the attacker.
      // Priority: explicit attackerToken → tokenDoc (TokenDocument from HUD scope) →
      //   canvas.tokens.controlled[0] if it matches the attacker (handles duplicate NPC tokens for GMs) →
      //   first token by actorId (fallback)
      const controlled = canvas.tokens.controlled[0];
      const resolvedAttackerToken = attackerToken
        ?? (tokenDoc ? canvas.tokens.placeables.find(t => (t.document?.id ?? t.id) === tokenDoc?.id) : null)
        ?? (controlled?.actor?.id === attacker?.id ? controlled : null);
      const app = new TargetSelector({ abilityName, abilityDesc, abilityIcon, targetType: targetType ?? "enemy", attacker, attackerToken: resolvedAttackerToken, reach: reach ?? 99, minReach: minReach ?? 0, range: range ?? 0, shape: shape ?? "circle", archingShot: archingShot ?? false, onSelect: (token, affectedTokens) => resolve({ token, affectedTokens }) });
      app.render(true);
      const origClose = app.close.bind(app);
      app.close = async (...args) => { if (!app._skipResolve) resolve(null); return origClose(...args); };
    });
  }
}

// ═══════════════════════════════════════════════════════════
//  HIT ANIMATION HELPER
// ═══════════════════════════════════════════════════════════
window._playHitAnimation = async (targetToken, animationFile, animationScale = 1.0, animationSound = "", sourceToken = null) => {
  if (!animationFile) return;
  if (!window.Sequence) { console.warn("Dawnbreaker | Sequencer not installed"); return; }
  try {
    let target = targetToken;
    if (targetToken?.document && !targetToken.x) target = canvas.tokens.placeables.find(t => t.document.id === targetToken.document.id) ?? targetToken;
    else if (targetToken?.actor && !targetToken.x) target = canvas.tokens.placeables.find(t => t.actor?.id === targetToken.actor?.id) ?? targetToken;
    let source = null;
    if (sourceToken) {
      source = sourceToken;
      if (sourceToken?.document && !sourceToken.x) source = canvas.tokens.placeables.find(t => t.document.id === sourceToken.document.id) ?? sourceToken;
    }
    const seq = new Sequence().effect().file(animationFile).scale(animationScale ?? 1.0);
    if (source) seq.atLocation(source).stretchTo(target);
    else seq.atLocation(target);
    if (animationSound) seq.sound().file(animationSound).volume(0.8);
    seq.play();
  } catch(e) { console.warn("Dawnbreaker | Animation failed:", e); }
};

// ═══════════════════════════════════════════════════════════
//  THROW SYSTEM
// ═══════════════════════════════════════════════════════════
window._resolveThrow = async ({ thrower, targetActor, targetTokenId = null, item, distance, hasThrowAbility }) => {
  const str = thrower.system.stats?.STR?.total ?? 10, dex = thrower.system.stats?.DEX?.total ?? 10;
  const maxRange = 4 + Math.floor(str / 3);
  if (distance > maxRange) { ui.notifications.warn(`Out of throw range! Max: ${maxRange} tiles`); return; }
  const speaker = ChatMessage.getSpeaker({ actor: thrower });
  let hit = true, accuracyMsg = "";
  if (!hasThrowAbility) {
    const dc = distance * 3, dexMod = Math.floor(dex / 3);
    const roll = await new Roll("1d20").evaluate();
    const result = roll.total + dexMod;
    hit = result >= dc;
    await roll.toMessage({ speaker, flavor: `Throw Accuracy (DC ${dc}) — DEX mod ${dexMod >= 0 ? "+" : ""}${dexMod}` });
    accuracyMsg = hit ? `<div style="color:#81c784;font-weight:700;">✓ Hit! (${result} vs DC ${dc})</div>` : `<div style="color:#e05555;font-weight:700;">✗ Miss! (${result} vs DC ${dc}) — item lost.</div>`;
  } else { accuracyMsg = `<div style="color:#64d4ff;">⚡ Auto-hit (Throw ability)</div>`; }
  const currentQty = item.system.qty ?? 1;
  await item.update({ "system.qty": Math.max(0, currentQty - 1) });
  await ChatMessage.create({ speaker, content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:14px;font-weight:700;color:#e8c86a;border-bottom:1px solid #3a3f4a;padding-bottom:5px;margin-bottom:8px;">🪃 Throw — ${thrower.name} → ${targetActor.name}</div><table style="width:100%;font-size:12px;border-collapse:collapse;"><tr><td style="color:#7a8090;padding:2px 4px;">Item</td><td style="text-align:right;">${item.name} (${currentQty - 1} remaining)</td></tr><tr><td style="color:#7a8090;padding:2px 4px;">Distance</td><td style="text-align:right;">${distance} / ${maxRange} tiles</td></tr></table><div style="margin-top:8px;">${accuracyMsg}</div></div>` });
  if (!hit) return;
  const effectStr = (item.system.effect ?? "").toLowerCase();
  const tokens    = effectStr.match(/(\w+):(\w+):(\d+)/g) ?? [];
  const updates = {}, resultLines = [];
  for (const token of tokens) {
    const [action, stat, valStr] = token.split(":");
    const val = parseInt(valStr);
    if (!val) continue;
    if (action === "restore") {
      if (stat === "hp") { const cur = targetActor.system.hp?.current ?? 0, max = targetActor.system.hp?.max ?? 0; updates["system.hp.current"] = Math.min(max, (updates["system.hp.current"] ?? cur) + val); resultLines.push(`❤ HP +${val}`); }
      else if (stat === "ki") { const cur = targetActor.system.ki?.current ?? 0, max = targetActor.system.ki?.max ?? 0; updates["system.ki.current"] = Math.min(max, (updates["system.ki.current"] ?? cur) + val); resultLines.push(`✨ KI +${val}`); }
      else if (stat === "ar") { const cur = targetActor.system.ar?.current ?? 0, max = targetActor.system.ar?.max ?? 0; updates["system.ar.current"] = Math.min(max, (updates["system.ar.current"] ?? cur) + val); resultLines.push(`🛡 AR +${val}`); }
    } else if (action === "damage") {
      if (stat === "hp") { const cur = targetActor.system.hp?.current ?? 0; const newHP = Math.max(0, cur - val); const dmgData = { type: "applyDamage", actorId: targetActor.id, tokenId: targetTokenId ?? undefined, newHP, attackType: "physical" }; if (game.user.isGM) await window._dbApplyDamage(dmgData); else game.socket.emit("system.dawnbreaker-trials", dmgData); resultLines.push(`❤ HP -${val}`); }
      else if (stat === "ar") { const cur = targetActor.system.ar?.current ?? 0; const newAR = Math.max(0, cur - val); const dmgData = { type: "applyARDamage", actorId: targetActor.id, tokenId: targetTokenId ?? undefined, newAR, attackType: "physical" }; if (game.user.isGM) await window._dbApplyDamage(dmgData); else game.socket.emit("system.dawnbreaker-trials", dmgData); resultLines.push(`🛡 AR -${val}`); }
    }
  }
  if (Object.keys(updates).length > 0) {
    if (game.user.isGM) await targetActor.update(updates);
    else game.socket.emit("system.dawnbreaker-trials", { type: "throwApply", actorId: targetActor.id, updates });
  }
  if (resultLines.length > 0) await ChatMessage.create({ speaker, content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🪃 <b>${targetActor.name}</b> hit by <b>${item.name}</b><br/>${resultLines.join("<br/>")}</div>` });
  else await ChatMessage.create({ speaker, content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🪃 <b>${item.name}</b> hit <b>${targetActor.name}</b>${effectStr ? " — " + item.system.effect : " — no effect defined."}</div>` });
};

// ═══════════════════════════════════════════════════════════
//  ABILITY CHECK PANEL
//  Floating panel for quick d20 + stat rolls.
//  Toggled by the "Ability Check" macro.
// ═══════════════════════════════════════════════════════════
class AbilityCheckPanel extends foundry.appv1.api.Application {
  static _instance = null;

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        "db-ability-check-panel",
      title:     "Ability Checks",
      width:     270,
      height:    "auto",
      resizable: false,
      popOut:    true,
      classes:   ["dawnbreaker", "db-ability-check-panel"],
    });
  }

  static toggle() {
    if (!AbilityCheckPanel._instance) AbilityCheckPanel._instance = new AbilityCheckPanel();
    if (AbilityCheckPanel._instance.rendered) AbilityCheckPanel._instance.close();
    else AbilityCheckPanel._instance.render(true);
  }

  static refresh() {
    if (AbilityCheckPanel._instance?.rendered) AbilityCheckPanel._instance.render(false);
  }

  getData() {
    const actor = canvas.tokens.controlled[0]?.actor ?? null;
    if (!actor) return { actor: null };
    const STATS = [
      { key: "STR", label: "Strength"     },
      { key: "CON", label: "Constitution" },
      { key: "AGI", label: "Agility"      },
      { key: "DEX", label: "Dexterity"    },
      { key: "INT", label: "Intelligence" },
      { key: "SPR", label: "Spirit"       },
    ];
    return {
      actor,
      actorName: actor.name,
      actorImg:  actor.img,
      stats: STATS.map(s => ({
        key:   s.key,
        label: s.label,
        mod:   actor.type === "npc"
          ? (actor.system.stats?.[s.key] ?? 0)
          : (actor.system.stats?.[s.key]?.mod ?? 0),
      })),
    };
  }

  async _renderInner(data) {
    let inner;
    if (!data.actor) {
      inner = `<div class="db-acp-empty">Select a token to roll ability checks.</div>`;
    } else {
      const rows = data.stats.map(s => `
        <div class="db-acp-row" data-stat="${s.key}" title="${s.label} check (d20 ${s.mod >= 0 ? "+" : ""}${s.mod})">
          <span class="db-acp-badge">${s.key}</span>
          <span class="db-acp-stat-name">${s.label.toUpperCase()}.</span>
          <span class="db-acp-mod">${s.mod >= 0 ? "+" : ""}${s.mod}</span>
          <span class="db-acp-arrow">◆</span>
        </div>`).join("");
      inner = `
        <div class="db-acp-header">
          <img src="${data.actorImg}" class="db-acp-portrait"/>
          <div class="db-acp-header-info">
            <div class="db-acp-actor-name">${data.actorName.toUpperCase()}.</div>
            <div class="db-acp-actor-sub">ABILITY CHECKS</div>
          </div>
        </div>
        <div class="db-acp-rows">${rows}</div>`;
    }
    return $(`<div class="db-acp-body">${inner}</div>`);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".db-acp-row").click(async (ev) => {
      const stat  = ev.currentTarget.dataset.stat;
      const actor = canvas.tokens.controlled[0]?.actor ?? null;
      if (!actor) { ui.notifications.warn("Select a token first!"); return; }
      const mod = actor.type === "npc"
        ? (actor.system.stats?.[stat] ?? 0)
        : (actor.system.stats?.[stat]?.mod ?? 0);
      const LABELS = { STR:"Strength", CON:"Constitution", AGI:"Agility", DEX:"Dexterity", INT:"Intelligence", SPR:"Spirit" };
      const roll = await new Roll("1d20 + @v", { v: mod }).evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor:  `<b>${actor.name}</b> — ${LABELS[stat] ?? stat} Check (${stat} MOD ${mod >= 0 ? "+" : ""}${mod})`,
        rollMode: "publicroll",
      });
    });
  }
}

window.AbilityCheckPanel = AbilityCheckPanel;
Hooks.on("controlToken", () => AbilityCheckPanel.refresh());
Hooks.on("updateActor",  () => AbilityCheckPanel.refresh());

// ═══════════════════════════════════════════════════════════
//  NAT 20 / CRITICAL FAIL CHAT BANNER
// ═══════════════════════════════════════════════════════════
Hooks.on("renderChatMessage", (message, html) => {
  if (!message.rolls?.length) return;
  const totalEl = html.find(".dice-total");
  if (!totalEl.length) return;

  let nat20 = false, nat1 = false;
  for (const roll of message.rolls) {
    for (const term of (roll.terms ?? [])) {
      if (term.faces !== 20) continue;
      for (const r of (term.results ?? [])) {
        if (r.result === 20 && r.active !== false) nat20 = true;
        if (r.result === 1  && r.active !== false) nat1  = true;
      }
    }
  }

  if (nat20) {
    totalEl.addClass("db-nat20");
    totalEl.html(`<span class="db-nat-label">CRITICAL SUCCESS</span>`);
  } else if (nat1) {
    totalEl.addClass("db-nat1");
    totalEl.html(`<span class="db-nat-label">CRITICAL FAIL</span>`);
  }
});


// ═══════════════════════════════════════════════════════════
//  RARITY HELPERS
// ═══════════════════════════════════════════════════════════
const RARITY_ORDER = ["basic","rare","arcane","unique","legendary","ethereal"];

function _rarityFromLevel(upgradeLevel) {
  if (upgradeLevel <= 1) return "basic";
  if (upgradeLevel <= 4) return "rare";
  return "arcane";
}

function _rarityRollRange(rarity) {
  return { basic:[1,2], rare:[2,4], arcane:[3,5], unique:[4,6], legendary:[5,7], ethereal:[6,8] }[rarity] ?? [1,2];
}

function _rarityColor(rarity) {
  return { basic:"#8a8f9a", rare:"#4a9eff", arcane:"#9b59b6", unique:"#ff69b4", legendary:"#ff8c00", ethereal:"#ff3333" }[rarity] ?? "#8a8f9a";
}

function _rarityLabel(rarity) {
  return (rarity ?? "basic").charAt(0).toUpperCase() + (rarity ?? "basic").slice(1);
}

// ═══════════════════════════════════════════════════════════
//  INVENTORY LOG
// ═══════════════════════════════════════════════════════════
const CRAFTING_JOURNAL_NAME = "Crafting Log";

async function _craftingLogAdd(entry) {
  if (!game.user.isGM) {
    game.socket.emit("system.dawnbreaker-trials", { type: "craftingLogAdd", entry });
    return;
  }
  const raw = game.settings.get("dawnbreaker-trials", "craftingLog") ?? "[]";
  let log = [];
  try { log = JSON.parse(raw); } catch(e) { log = []; }
  entry.date = new Date().toISOString().slice(0,10);
  log.unshift(entry);
  if (log.length > 500) log = log.slice(0, 500);
  await game.settings.set("dawnbreaker-trials", "craftingLog", JSON.stringify(log));
  await _craftingJournalAppend(entry);
}

async function _craftingJournalAppend(entry) {
  let journal = game.journal.getName(CRAFTING_JOURNAL_NAME);
  if (!journal) journal = await JournalEntry.create({ name: CRAFTING_JOURNAL_NAME, ownership: { default: 0 } });
  let page = journal.pages.contents[0];
  const line = `[${entry.date}] ${entry.actorName} — ${entry.action.toUpperCase()} — ${entry.itemName} (${_rarityLabel(entry.rarity)}) — ${entry.detail}`;
  if (!page) {
    await journal.createEmbeddedDocuments("JournalEntryPage", [{ name: "Log", type: "text", text: { content: `<p>${line}</p>` } }]);
  } else {
    const existing = page.text?.content ?? "";
    await page.update({ "text.content": `<p>${line}</p>${existing}` });
  }
}

function _craftingLogGet() {
  try { return JSON.parse(game.settings.get("dawnbreaker-trials", "craftingLog") ?? "[]"); }
  catch(e) { return []; }
}

Hooks.on("preDeleteItem", (item, options) => {
  const rarity = item.system?.rarity ?? "basic";
  if (rarity === "basic") return true;
  if (options._confirmedDelete) return true;
  const color = _rarityColor(rarity);
  const enhancements = item.getFlag("dawnbreaker-trials","enhancements") ?? [];
  const enhLines = enhancements.map(e =>
    `<li style="color:${color}">${(e.label ?? e.stat?.toUpperCase() ?? "?")} +${e.value}${e.essence ? ` [${e.essence}]` : ""}</li>`
  ).join("");
  const _dlg = new (foundry.appv1?.applications?.Dialog ?? Dialog)({
    title: "DELETE ENHANCED ITEM",
    content: `<div style="font-family:'Bebas Neue',monospace;padding:12px;">
      <div style="font-size:22px;color:${color};margin-bottom:8px;">⚠ ${item.name}</div>
      <div style="font-size:14px;color:#8a8f9a;margin-bottom:8px;">${_rarityLabel(rarity)} — Upgrade Level +${item.system?.upgradeLevel ?? 0}</div>
      ${enhLines ? `<ul style="margin:8px 0;padding-left:16px;font-size:14px;">${enhLines}</ul>` : ""}
      <div style="color:#c0392b;font-size:16px;margin-top:10px;">This item cannot be recovered. Are you sure?</div>
    </div>`,
    buttons: {
      cancel: { label: "CANCEL", callback: () => {} },
      confirm: {
        label: `<span style="color:#c0392b;">DELETE</span>`,
        callback: async () => {
          options._confirmedDelete = true;
          await item.delete(options);
          _craftingLogAdd({ actorName: item.parent?.name ?? "Unknown", action: "delete", itemName: item.name, rarity, detail: `Deleted +${item.system?.upgradeLevel ?? 0} item` });
        }
      }
    },
    default: "cancel"
  });
  _dlg.render(true);
  const _sheetEl = item.parent?.sheet?.element?.[0];
  if (_sheetEl) { const _r = _sheetEl.getBoundingClientRect(); setTimeout(() => _dlg.setPosition({ left: _r.right + 10, top: _r.top }), 50); }
  return false;
});

// ═══════════════════════════════════════════════════════════
//  UPGRADE COST TABLES
// ═══════════════════════════════════════════════════════════
const UPGRADE_COSTS = [
  { primary:3,  carmine:0, rune:0 },
  { primary:5,  carmine:1, rune:0 },
  { primary:8,  carmine:1, rune:0 },
  { primary:13, carmine:2, rune:0 },
  { primary:20, carmine:2, rune:1 },
  { primary:32, carmine:3, rune:2 },
  { primary:50, carmine:4, rune:3 },
];
const UPGRADE_COSTS_CHEST = [
  { primary:4,  carmine:0, rune:0 },
  { primary:7,  carmine:1, rune:0 },
  { primary:11, carmine:1, rune:0 },
  { primary:17, carmine:2, rune:0 },
  { primary:26, carmine:2, rune:1 },
  { primary:40, carmine:3, rune:2 },
  { primary:62, carmine:4, rune:3 },
];
const UPGRADE_COSTS_MELEE2 = [
  { primary:4,  carmine:0, rune:0 },
  { primary:6,  carmine:1, rune:0 },
  { primary:10, carmine:1, rune:0 },
  { primary:16, carmine:2, rune:0 },
  { primary:26, carmine:2, rune:1 },
  { primary:42, carmine:3, rune:2 },
  { primary:65, carmine:4, rune:3 },
];

function _getUpgradeCost(item, targetLevel) {
  const is2H = item.system?.isTwoHanded ?? false;
  if (is2H) return UPGRADE_COSTS_MELEE2[targetLevel - 1] ?? null;
  const isChest = ["chest","body"].includes(item.system?.slot ?? item.system?.armorSlot ?? "");
  if (isChest) return UPGRADE_COSTS_CHEST[targetLevel - 1] ?? null;
  return UPGRADE_COSTS[targetLevel - 1] ?? null;
}

function _matFromPath(path) {
  if (path === "fabric")  return "Fabric";
  if (path === "leather") return "Leather";
  if (path === "wood")    return "Wood";
  if (path === "ore" || path === "melee2") return "Ore";
  return null;
}

function _getPrimaryMaterial(item) {
  const m = _matFromPath(item.system?.forgePath ?? "");
  if (m) return m;
  // Legacy fallback: guess from name/subtype
  const gt = (item.system?.gearType ?? item.system?.subtype ?? item.name ?? "").toLowerCase();
  if (gt.includes("cloth") || gt.includes("fabric") || gt.includes("robe") || gt.includes("hood")) return "Fabric";
  if (gt.includes("leather")) return "Leather";
  if (gt.includes("wood") || gt.includes("staff") || gt.includes("wooden") || gt.includes("bow")) return "Wood";
  return "Ore";
}

function _getSecondaryMaterial(item) {
  return _matFromPath(item.system?.forgePathSecondary ?? "") ?? null;
}

function _splitCost(total) {
  const main = Math.round(total * 0.75);
  return { main, secondary: total - main };
}

// ═══════════════════════════════════════════════════════════
//  ENHANCEMENT TABLES
// ═══════════════════════════════════════════════════════════
const WEAPON_ENHANCE_HIGH = ["str","agi","dex","int","spr"];
const WEAPON_ENHANCE_LOW  = ["brk","for","cha","ass","wil","dam"];
const ARMOR_ENHANCE_HIGH  = ["con","wil","for","mr","pr","ar","hp"];
const ARMOR_ENHANCE_LOW   = ["brk","mv","ass","ki","ap","cha"];
const ESSENCE_BIAS = {
  fire:   ["str","brk","dam","for"],
  water:  ["spr","wil","ki","mr","int"],
  earth:  ["con","ar","for","hp"],
  air:    ["agi","mv","dex","ap"],
  spirit: ["cha","brk","mr","pr","ki"],
};
const ENHANCE_HIGH_WEIGHT = 3;
const ENHANCE_LOW_WEIGHT  = 1;
const ENHANCE_ESSENCE_BOOST_PCT = 0.02; // +2% chance per essence consumed, added to each related stat

function _rollEnhancement(item, essenceType = null, essenceQty = 0) {
  const rarity = item.system?.rarity ?? "basic";
  const [minVal, maxVal] = _rarityRollRange(rarity);
  const isWeapon = item.system?.isWeapon ?? (item.system?.itemType === "weapon");
  const highPool = isWeapon ? WEAPON_ENHANCE_HIGH : ARMOR_ENHANCE_HIGH;
  const lowPool  = isWeapon ? WEAPON_ENHANCE_LOW  : ARMOR_ENHANCE_LOW;
  const allStats = [...highPool, ...lowPool];

  const baseTotal = highPool.length * ENHANCE_HIGH_WEIGHT + lowPool.length * ENHANCE_LOW_WEIGHT;
  const weights = {};
  for (const s of highPool) weights[s] = ENHANCE_HIGH_WEIGHT / baseTotal;
  for (const s of lowPool)  weights[s] = ENHANCE_LOW_WEIGHT  / baseTotal;

  if (essenceType && essenceQty > 0 && ESSENCE_BIAS[essenceType]) {
    const biased = ESSENCE_BIAS[essenceType].filter(s => allStats.includes(s));
    for (const s of biased) weights[s] += ENHANCE_ESSENCE_BOOST_PCT * essenceQty;
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let stat = allStats[allStats.length - 1];
  for (const s of allStats) {
    roll -= weights[s];
    if (roll <= 0) { stat = s; break; }
  }

  const value = minVal + Math.floor(Math.random() * (maxVal - minVal + 1));
  return { stat, value, essence: essenceType ?? null, essenceQty: essenceType ? essenceQty : 0, label: stat.toUpperCase(), rerollCount: 0 };
}

function _getRerollCost(rarity, rerollCount) {
  const base = { basic:1, rare:2, arcane:3, unique:4, legendary:5, ethereal:6 }[rarity] ?? 1;
  return base + rerollCount;
}

// ═══════════════════════════════════════════════════════════
//  ENHANCEMENT TABLES — REFERENCE JOURNAL (GM-editable copy)
// ═══════════════════════════════════════════════════════════
const ENHANCEMENT_TABLES_JOURNAL_NAME = "Enhancement Tables Reference";

function _buildEnhancementTablesHTML() {
  const rarityRows = RARITY_ORDER.map(r => {
    const [lo, hi] = _rarityRollRange(r);
    return `<tr><td style="color:${_rarityColor(r)};">${_rarityLabel(r)}</td><td>${lo}–${hi}</td><td>${_getRerollCost(r, 0)}</td></tr>`;
  }).join("");

  const upRows = (table) => table.map((row, i) =>
    `<tr><td>+${i + 1}</td><td>${row.primary}</td><td>${row.carmine}</td><td>${row.rune}</td></tr>`
  ).join("");

  const essenceRows = Object.entries(ESSENCE_BIAS).map(([essence, stats]) =>
    `<tr><td>${essence.charAt(0).toUpperCase() + essence.slice(1)}</td><td>${stats.join(", ").toUpperCase()}</td></tr>`
  ).join("");

  return `
<p><em>This page is regenerated from the system code on world load. Edits here are for reference only and will be overwritten — to change these values, edit the tables in dawnbreaker.mjs (WEAPON_ENHANCE_HIGH/LOW, ARMOR_ENHANCE_HIGH/LOW, ESSENCE_BIAS, _rarityRollRange, UPGRADE_COSTS).</em></p>

<h2>Enhancement Stat Pools</h2>
<p><b>Weapon — high chance:</b> ${WEAPON_ENHANCE_HIGH.join(", ").toUpperCase()}<br/><b>Weapon — low chance:</b> ${WEAPON_ENHANCE_LOW.join(", ").toUpperCase()}</p>
<p><b>Armor — high chance:</b> ${ARMOR_ENHANCE_HIGH.join(", ").toUpperCase()}<br/><b>Armor — low chance:</b> ${ARMOR_ENHANCE_LOW.join(", ").toUpperCase()}</p>
<p><em>Base weighting: high chance stats are ${ENHANCE_HIGH_WEIGHT}x as likely as low chance stats within their pool.</em></p>

<h2>Essence Bias (+${ENHANCE_ESSENCE_BOOST_PCT * 100}% chance per essence consumed, additive, to each related stat)</h2>
<table><thead><tr><th>Essence</th><th>Biased Stats</th></tr></thead><tbody>${essenceRows}</tbody></table>

<h2>Rarity — Roll Range &amp; Base Reroll Cost</h2>
<table><thead><tr><th>Rarity</th><th>Roll Range</th><th>Base Carmine Cost</th></tr></thead><tbody>${rarityRows}</tbody></table>
<p><em>Reroll cost = base cost + number of prior rerolls on that slot.</em></p>
<p><em>Rarity is derived from upgrade level: level 0–1 = Basic, 2–4 = Rare, 5+ = Arcane.</em></p>

<h2>Upgrade Costs — 1H Weapons / Armor</h2>
<table><thead><tr><th>Level</th><th>Primary Mat.</th><th>Carmine Shard</th><th>Rune</th></tr></thead><tbody>${upRows(UPGRADE_COSTS)}</tbody></table>

<h2>Upgrade Costs — 2H Melee Weapons</h2>
<table><thead><tr><th>Level</th><th>Primary Mat.</th><th>Carmine Shard</th><th>Rune</th></tr></thead><tbody>${upRows(UPGRADE_COSTS_MELEE2)}</tbody></table>
`.trim();
}

async function _ensureEnhancementTablesJournal() {
  if (!game.user.isGM) return;
  const html = _buildEnhancementTablesHTML();
  let journal = game.journal.getName(ENHANCEMENT_TABLES_JOURNAL_NAME);
  if (!journal) {
    journal = await JournalEntry.create({
      name: ENHANCEMENT_TABLES_JOURNAL_NAME,
      pages: [{ name: "Tables", type: "text", text: { content: html } }],
    });
  } else {
    const page = journal.pages.contents[0];
    if (page) await page.update({ "text.content": html });
    else await journal.createEmbeddedDocuments("JournalEntryPage", [{ name: "Tables", type: "text", text: { content: html } }]);
  }
}

function _getShoeUpgradeBonuses(level) {
  const t = { mv:0, ap:0, ar:0, hp:0 };
  if (level >= 1) t.mv += 1;
  if (level >= 2) t.ap += 1;
  if (level >= 3) t.ar += 3;
  if (level >= 4) t.mv += 1;
  if (level >= 5) t.ap += 1;
  if (level >= 6) t.hp += 5;
  if (level >= 7) { t.ap += 1; t.mv += 1; }
  return t;
}

// Growth helpers: 0.5 = floor(n/2), 1 = n, 1.5 = ceil(n*1.5), 2 = 2n, 3 = 3n
function _grow(level, rate) {
  if (rate === 0.5) return Math.floor(level / 2);
  if (rate === 1.5) return Math.ceil(level * 1.5);
  return Math.round(level * rate);
}

const BUILTIN_GROWTH_PATHS = [
  { id: "builtin:ore:head",      name: "Base Plate Head",    slot: "head",  rates: { pr:1.5, mr:0.5, hp:2   }, base: { pr:2, mr:0, hp:1 } },
  { id: "builtin:ore:chest",     name: "Base Plate Chest",   slot: "body",  rates: { pr:1.5, mr:0.5, ar:1.5 }, base: { pr:3, mr:1, ar:2 } },
  { id: "builtin:ore:feet",      name: "Base Plate Feet",    slot: "legs",  rates: { pr:1.5, mr:0.5         }, base: { pr:2, mr:0 } },
  { id: "builtin:leather:head",  name: "Base Leather Head",  slot: "head",  rates: { pr:1,   mr:1,   hp:2   }, base: { pr:1, mr:1, hp:1 } },
  { id: "builtin:leather:chest", name: "Base Leather Chest", slot: "body",  rates: { pr:1,   mr:1,   ar:1   }, base: { pr:2, mr:2, ar:1 } },
  { id: "builtin:leather:feet",  name: "Base Leather Feet",  slot: "legs",  rates: { pr:1,   mr:1            }, base: { pr:1, mr:1 } },
  { id: "builtin:fabric:head",   name: "Base Cloth Head",    slot: "head",  rates: { mr:1.5, pr:0.5, hp:3   }, base: { mr:2, pr:0, hp:1 } },
  { id: "builtin:fabric:chest",  name: "Base Cloth Chest",   slot: "body",  rates: { mr:1.5, pr:0.5, ar:0.5 }, base: { mr:3, pr:1, ar:0 } },
  { id: "builtin:fabric:feet",   name: "Base Cloth Feet",    slot: "legs",  rates: { mr:1.5, pr:0.5         }, base: { mr:2, pr:0 } },
];

function _autoBuiltinPathId(forgePath, slot) {
  const fp = forgePath === "melee2" ? "ore" : (forgePath || "ore");
  const s = slot === "body" ? "chest" : slot === "legs" ? "feet" : slot;
  return `builtin:${fp}:${s}`;
}

function _getGrowthPathRates(pathId, forgePath, slot) {
  if (pathId) {
    const b = BUILTIN_GROWTH_PATHS.find(p => p.id === pathId);
    if (b) return b.rates;
    try {
      const customs = game?.settings?.get("dawnbreaker-trials", "growthPaths") ?? [];
      const c = customs.find(p => p.id === pathId);
      if (c) return c.rates;
    } catch(e) {}
  }
  const autoId = _autoBuiltinPathId(forgePath, slot);
  return BUILTIN_GROWTH_PATHS.find(p => p.id === autoId)?.rates ?? {};
}

function _formatGrowthRates(rates) {
  return Object.entries(rates).filter(([,v]) => v).map(([k,v]) => `+${v}${k.toUpperCase()}/lvl`).join(" ");
}

// Returns cumulative PR/MR/HP/AR bonus from forge upgrades for armor (excluding base item stats)
// Generic per-level growth from an explicit path id (used for weapon custom paths, no armor slot extras)
function _getPathLevelGrowth(pathId, level) {
  if (!level || !pathId) return {};
  let path = BUILTIN_GROWTH_PATHS.find(p => p.id === pathId);
  if (!path) {
    try {
      const customs = game?.settings?.get("dawnbreaker-trials", "growthPaths") ?? [];
      path = customs.find(p => p.id === pathId);
    } catch(e) {}
  }
  if (!path?.rates) return {};
  const t = {};
  for (const [k, v] of Object.entries(path.rates)) {
    const bonus = _grow(level, v);
    if (bonus) t[k] = bonus;
  }
  return t;
}

function _getArmorUpgradeBonuses(forgePath, slot, level, pathId = null) {
  if (!level) return {};
  const rates = _getGrowthPathRates(pathId, forgePath, slot);
  const t = {};
  for (const [k, v] of Object.entries(rates)) {
    const bonus = _grow(level, v);
    if (bonus) t[k] = (t[k] ?? 0) + bonus;
  }
  // All feet pieces also get the standard shoe table bonuses
  if (slot === "feet" || slot === "legs") {
    const shoe = _getShoeUpgradeBonuses(level);
    for (const [k, v] of Object.entries(shoe)) t[k] = (t[k] ?? 0) + v;
  }
  return t;
}

// ── GROWTH PATH EDITOR ──────────────────────────────────────────────────────
class GrowthPathEditor extends foundry.appv1.api.Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "db-growth-path-editor", title: "Custom Growth Paths", template: null,
      width: 620, height: 480, resizable: true,
    });
  }

  async getData() {
    let customs = [];
    try { customs = game.settings.get("dawnbreaker-trials", "growthPaths") ?? []; } catch(e) {}
    return { builtins: BUILTIN_GROWTH_PATHS, customs };
  }

  async _renderInner(data) {
    const statKeys = ["dam","pr","mr","hp","ar","mv","ap","str","con","agi","dex","int","spr","wil","for","cha","brk","ki","ass"];
    const rateOpts = [0, 0.5, 1, 1.5, 2, 2.5, 3].map(v => `<option value="${v}">${v}</option>`).join("");

    const builtinRows = data.builtins.map(p => {
      const rStr = Object.entries(p.rates).filter(([,v])=>v).map(([k,v])=>`+${v} ${k.toUpperCase()}/lvl`).join(", ");
      return `<tr class="db-gp-row db-gp-builtin"><td>${p.name}</td><td class="db-gp-rates">${rStr}</td><td><em style="color:#888">Built-in</em></td></tr>`;
    }).join("");

    const customRows = data.customs.map(p => {
      const bStr = Object.entries(p.base ?? {}).filter(([,v])=>v).map(([k,v])=>`+${v}${k.toUpperCase()}`).join(" ") || "—";
      const rStr = Object.entries(p.rates ?? {}).filter(([,v])=>v).map(([k,v])=>`+${v} ${k.toUpperCase()}/lvl`).join(", ") || "—";
      return `<tr class="db-gp-row" data-id="${p.id}">
        <td><span class="db-gp-name-display">${p.name}</span></td>
        <td class="db-gp-rates" style="color:var(--db-gold);font-size:11px">${bStr}</td>
        <td class="db-gp-rates"><span class="db-gp-rates-display">${rStr}</span></td>
        <td>
          <button type="button" class="db-gp-edit" data-id="${p.id}">Edit</button>
          <button type="button" class="db-gp-delete" data-id="${p.id}">✕</button>
        </td>
      </tr>`;
    }).join("");

    const rateInputs = statKeys.map(k =>
      `<label style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0">
        <span style="width:28px;text-align:right;font-weight:bold;color:var(--db-gold)">${k.toUpperCase()}</span>
        <select class="db-gp-rate-input" data-stat="${k}" style="width:52px;padding:2px">
          ${[0,0.5,1,1.5,2,2.5,3].map(v=>`<option value="${v}">${v}</option>`).join("")}
        </select>
      </label>`
    ).join("");

    const baseInputs = statKeys.map(k =>
      `<label style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0">
        <span style="width:28px;text-align:right;font-weight:bold;color:var(--db-gold)">${k.toUpperCase()}</span>
        <input class="db-gp-base-input" data-stat="${k}" type="number" value="0" min="0" style="width:44px;padding:2px"/>
      </label>`
    ).join("");

    const html = `<div class="dawnbreaker" style="padding:12px;display:flex;flex-direction:column;gap:10px;height:100%;box-sizing:border-box;overflow-y:auto">
      <h3 style="margin:0;color:var(--db-gold)">Built-in Paths</h3>
      <table class="db-gp-table" style="font-size:12px">
        <thead><tr><th>Name</th><th>Growth</th><th></th></tr></thead>
        <tbody>${builtinRows}</tbody>
      </table>
      <h3 style="margin:0;color:var(--db-gold)">Custom Paths</h3>
      <table class="db-gp-table" style="font-size:12px">
        <thead><tr><th>Name</th><th>Base</th><th>Growth</th><th></th></tr></thead>
        <tbody id="db-gp-custom-rows">${customRows || '<tr><td colspan="4" style="color:#888;text-align:center">No custom paths yet</td></tr>'}</tbody>
      </table>
      <div id="db-gp-add-form" style="border:1px solid #444;border-radius:4px;padding:10px;display:none;flex-direction:column;gap:8px">
        <div style="display:flex;gap:8px;align-items:center">
          <label style="color:var(--db-gold);font-weight:bold">Name:</label>
          <input id="db-gp-new-name" type="text" placeholder="e.g. Battlemage Chest" style="flex:1;padding:4px"/>
          <input id="db-gp-new-id" type="hidden" value=""/>
        </div>
        <div style="color:var(--db-gold);font-size:11px;font-weight:bold;margin-bottom:2px">BASE STATS (level 0)</div>
        <div style="display:flex;flex-wrap:wrap">${baseInputs}</div>
        <div style="color:var(--db-gold);font-size:11px;font-weight:bold;margin-bottom:2px">GROWTH RATES (per level)</div>
        <div style="display:flex;flex-wrap:wrap">${rateInputs}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" id="db-gp-save-btn" style="padding:4px 14px">Save</button>
          <button type="button" id="db-gp-cancel-btn" style="padding:4px 14px">Cancel</button>
        </div>
      </div>
      <button type="button" id="db-gp-add-btn" style="align-self:flex-start;padding:4px 14px">+ Add Custom Path</button>
    </div>`;

    const el = document.createElement("div");
    el.innerHTML = html;
    return $(el.firstElementChild);
  }

  activateListeners(html) {
    super.activateListeners(html);
    const showForm = (path = null) => {
      const form = html.find("#db-gp-add-form")[0];
      form.style.display = "flex";
      html.find("#db-gp-add-btn").hide();
      html.find("#db-gp-new-name").val(path?.name ?? "");
      html.find("#db-gp-new-id").val(path?.id ?? "");
      html.find(".db-gp-rate-input").each(function() {
        this.value = path?.rates?.[this.dataset.stat] ?? 0;
      });
      html.find(".db-gp-base-input").each(function() {
        this.value = path?.base?.[this.dataset.stat] ?? 0;
      });
    };
    html.find("#db-gp-add-btn").click(() => showForm());
    html.find("#db-gp-cancel-btn").click(() => {
      html.find("#db-gp-add-form")[0].style.display = "none";
      html.find("#db-gp-add-btn").show();
    });
    html.find("#db-gp-save-btn").click(async () => {
      const name = html.find("#db-gp-new-name").val().trim();
      if (!name) return ui.notifications.warn("Path name required.");
      const rates = {}, base = {};
      html.find(".db-gp-rate-input").each(function() {
        const v = parseFloat(this.value);
        if (v) rates[this.dataset.stat] = v;
      });
      html.find(".db-gp-base-input").each(function() {
        const v = parseInt(this.value) || 0;
        if (v) base[this.dataset.stat] = v;
      });
      let customs = [];
      try { customs = foundry.utils.deepClone(game.settings.get("dawnbreaker-trials", "growthPaths") ?? []); } catch(e) {}
      const existingId = html.find("#db-gp-new-id").val();
      if (existingId) {
        const idx = customs.findIndex(p => p.id === existingId);
        if (idx >= 0) customs[idx] = { id: existingId, name, rates, base };
        else customs.push({ id: existingId, name, rates, base });
      } else {
        customs.push({ id: `custom:${Date.now()}`, name, rates, base });
      }
      await game.settings.set("dawnbreaker-trials", "growthPaths", customs);
      this.render(true);
    });
    html.on("click", ".db-gp-edit", async (ev) => {
      const id = ev.currentTarget.dataset.id;
      let customs = [];
      try { customs = game.settings.get("dawnbreaker-trials", "growthPaths") ?? []; } catch(e) {}
      const path = customs.find(p => p.id === id);
      if (path) showForm(path);
    });
    html.on("click", ".db-gp-delete", async (ev) => {
      const id = ev.currentTarget.dataset.id;
      let customs = [];
      try { customs = foundry.utils.deepClone(game.settings.get("dawnbreaker-trials", "growthPaths") ?? []); } catch(e) {}
      await game.settings.set("dawnbreaker-trials", "growthPaths", customs.filter(p => p.id !== id));
      this.render(true);
    });
  }
}
window._openGrowthPathEditor = () => new GrowthPathEditor().render(true);

async function _applyEnhancements(item) {
  // Bonuses are now calculated live in prepareData — nothing to write here.
  // Kept as a stub so existing forge/enhance callers don't error.
}

function _craftingField(name) {
  const n = name.toLowerCase();
  if (n.includes("ephi"))    return "ephi";
  if (n.includes("amynti"))  return "amynti";
  if (n.includes("carmine")) return "carmine";
  if (n.includes("fire"))    return "essenceFire";
  if (n.includes("water"))   return "essenceWater";
  if (n.includes("earth"))   return "essenceEarth";
  if (n.includes("air"))     return "essenceAir";
  if (n.includes("spirit"))  return "essenceSpirit";
  if (n.includes("rune"))    return "runes";
  if (n.includes("leather")) return "leather";
  if (n.includes("fabric"))  return "fabric";
  if (n.includes("wood"))    return "wood";
  if (n.includes("scrap"))   return "scrap";
  if (n.includes("ration"))  return "rations";
  if (n.includes("ore"))     return "ore";
  return null;
}

function _craftingQty(actor, name) {
  const field = _craftingField(name);
  return field ? (actor.system?.crafting?.[field] ?? 0) : 0;
}

async function _consumeStoredMaterial(actor, materialName, qty) {
  const field = _craftingField(materialName);
  if (!field) return;
  const current = actor.system?.crafting?.[field] ?? 0;
  await actor.update({ [`system.crafting.${field}`]: Math.max(0, current - qty) });
}

// ═══════════════════════════════════════════════════════════
//  BLACKSMITH APPLICATION
// ═══════════════════════════════════════════════════════════
class DawnbreakerBlacksmithApp extends foundry.appv1.api.Application {
  constructor(actor, options = {}) { super(options); this.actor = actor; this._selectedItemId = null; }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "db-blacksmith", classes: ["dawnbreaker","db-smith-app"],
      template: "systems/dawnbreaker-trials/templates/blacksmith.html",
      title: "BLACKSMITH",
      width: Math.round(window.innerWidth * 0.7),
      height: Math.round(window.innerHeight * 0.75),
      resizable: false,
    });
  }

  get title() { return `BLACKSMITH — ${this.actor?.name ?? ""}`; }

  getData() {
    const actor = this.actor;
    const items = actor.items.filter(i =>
      ["weapon","armor","offhand"].includes(i.system?.itemType ?? "") || ["weapon","armor"].includes(i.type)
    );
    const upgradeableItems = items.map(item => {
      const level = item.system?.upgradeLevel ?? 0;
      const rarity = item.system?.rarity ?? "basic";
      return { id:item.id, name:item.name, img:item.img, level, rarity, rarityLabel:_rarityLabel(rarity), rarityColor:_rarityColor(rarity), isSelected:item.id===this._selectedItemId, atMax:level>=7 };
    });

    let selectedItem = null, costRows = [], canAfford = false, slotRows = [];
    if (this._selectedItemId) {
      const item = actor.items.get(this._selectedItemId);
      if (item) {
        const level = item.system?.upgradeLevel ?? 0;
        const rarity = item.system?.rarity ?? _rarityFromLevel(level);
        const nextLevel = level + 1;
        const cost = _getUpgradeCost(item, nextLevel);
        const mat = _getPrimaryMaterial(item);
        const _qty = (name) => _craftingQty(actor, name);
        if (cost && level < 7) {
          const hO = _qty(mat), hC = _qty("Carmine Shard"), hR = _qty("Rune");
          costRows = [
            { label:mat,             need:cost.primary, have:hO, canAfford:hO>=cost.primary },
            { label:"Carmine Shard", need:cost.carmine, have:hC, canAfford:hC>=cost.carmine, skip:cost.carmine===0 },
            { label:"Rune",          need:cost.rune,    have:hR, canAfford:hR>=cost.rune,    skip:cost.rune===0 },
          ].filter(r => !r.skip);
          canAfford = costRows.every(r => r.canAfford);
        }
        const enhancements = item.getFlag("dawnbreaker-trials","enhancements") ?? [];
        const totalSlots = 1 + level;
        const isWeapon = item.system?.isWeapon ?? (item.system?.itemType === "weapon");
        slotRows = [{ slotIndex:0, isFixed:true, label:isWeapon?`DAM +${2+level}`:"FIXED", badge:"FIXED", type:"fixed" }];
        for (let s = 1; s < totalSlots; s++) {
          const enh = enhancements[s-1];
          slotRows.push(enh
            ? { slotIndex:s, isFixed:false, isFilled:true, label:`${enh.label??enh.stat?.toUpperCase()} +${enh.value}`, badge:enh.essence?enh.essence.toUpperCase():(isWeapon?"EPHI":"AMYNTI"), type:enh.essence?"elemental":"filled" }
            : { slotIndex:s, isFixed:false, isFilled:false, isEmpty:true, label:"EMPTY", badge:"", type:"empty" }
          );
        }
        selectedItem = { id:item.id, name:item.name, img:item.img, level, nextLevel, rarity, rarityLabel:_rarityLabel(rarity), rarityColor:_rarityColor(rarity), atMax:level>=7, nextRarity:level<7?_rarityLabel(_rarityFromLevel(nextLevel)):null, crossesRarityBoundary:level<7&&_rarityFromLevel(nextLevel)!==rarity };
      }
    }
    return { actor, upgradeableItems, selectedItem, costRows, canAfford, slotRows };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".db-smith-item-row").click(ev => { this._selectedItemId = ev.currentTarget.dataset.itemId; this.render(); });
    html.find(".db-smith-forge-btn").click(async () => {
      const item = this.actor.items.get(this._selectedItemId);
      if (!item) return;
      const level = item.system?.upgradeLevel ?? 0;
      if (level >= 7) return;
      const nextLevel = level + 1;
      const cost = _getUpgradeCost(item, nextLevel);
      const mat = _getPrimaryMaterial(item);
      await _consumeStoredMaterial(this.actor, mat, cost.primary);
      if (cost.carmine > 0) await _consumeStoredMaterial(this.actor, "Carmine Shard", cost.carmine);
      if (cost.rune > 0)    await _consumeStoredMaterial(this.actor, "Rune", cost.rune);
      const newRarity = _rarityFromLevel(nextLevel);
      await item.update({ "system.upgradeLevel": nextLevel, "system.rarity": newRarity });
      await _applyEnhancements(item);
      _craftingLogAdd({ actorName:this.actor.name, action:"upgrade", itemName:item.name, rarity:newRarity, detail:`Upgraded to +${nextLevel} (${_rarityLabel(newRarity)}) — consumed ${cost.primary}x ${mat}${cost.carmine?`, ${cost.carmine}x Carmine`:""}${cost.rune?`, ${cost.rune}x Rune`:""}` });
      ui.notifications.info(`${item.name} upgraded to +${nextLevel}!`);
      this.render();
    });
  }
}

// ═══════════════════════════════════════════════════════════
//  SHARD ENHANCER APPLICATION
// ═══════════════════════════════════════════════════════════
class DawnbreakerEnhancerApp extends foundry.appv1.api.Application {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this._selectedItemId = null;
    this._selectedSlot = null;
    this._selectedEssence = null;
    this._selectedEssenceQty = 1;
    this._lastResult = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "db-enhancer", classes: ["dawnbreaker","db-enhance-app"],
      template: "systems/dawnbreaker-trials/templates/enhancer.html",
      title: "SHARD ENHANCER",
      width: Math.round(window.innerWidth * 0.65),
      height: Math.round(window.innerHeight * 0.7),
      resizable: false,
    });
  }

  get title() { return `SHARD ENHANCER — ${this.actor?.name ?? ""}`; }

  getData() {
    const actor = this.actor;
    const enhanceable = actor.items.filter(i =>
      ["weapon","armor","offhand"].includes(i.system?.itemType ?? "") || ["weapon","armor"].includes(i.type)
    );
    const _qty = (name) => _craftingQty(actor, name);
    const itemList = enhanceable.map(item => {
      const level = item.system?.upgradeLevel ?? 0;
      const enhs = item.getFlag("dawnbreaker-trials","enhancements") ?? [];
      return { id:item.id, name:item.name, img:item.img, level, rarity:item.system?.rarity??"basic", rarityLabel:_rarityLabel(item.system?.rarity??"basic"), rarityColor:_rarityColor(item.system?.rarity??"basic"), isSelected:item.id===this._selectedItemId, slotsLabel:`${enhs.length}/${level} SLOTS` };
    });

    let selectedItem = null, slotRows = [], canApply = false, rerollCost = 0;
    const essenceOptions = [
      { value:"",      label:"None (standard roll)" },
      { value:"fire",  label:`Fire Essence (${_qty("Fire Essence")} owned)` },
      { value:"water", label:`Water Essence (${_qty("Water Essence")} owned)` },
      { value:"earth", label:`Earth Essence (${_qty("Earth Essence")} owned)` },
      { value:"air",   label:`Air Essence (${_qty("Air Essence")} owned)` },
      { value:"spirit",label:`Spirit Essence (${_qty("Spirit Essence")} owned)` },
    ];

    if (this._selectedItemId) {
      const item = actor.items.get(this._selectedItemId);
      if (item) {
        const level = item.system?.upgradeLevel ?? 0;
        const rarity = item.system?.rarity ?? "basic";
        const enhancements = item.getFlag("dawnbreaker-trials","enhancements") ?? [];
        const totalSlots = 1 + level;
        const isWeapon = item.system?.isWeapon ?? (item.system?.itemType === "weapon");
        slotRows = [{ slotIndex:0, isFixed:true, label:isWeapon?`DAM +${2+level}`:"FIXED", badge:"FIXED", type:"fixed" }];
        for (let s = 1; s < totalSlots; s++) {
          const enh = enhancements[s-1];
          const rerolls = enh?.rerollCount ?? 0;
          const rc = _getRerollCost(rarity, rerolls);
          slotRows.push(enh
            ? { slotIndex:s, isFixed:false, isFilled:true, label:`${enh.label??enh.stat?.toUpperCase()} +${enh.value}`, badge:enh.essence?enh.essence.toUpperCase():(isWeapon?"EPHI":"AMYNTI"), type:enh.essence?"elemental":"filled", canReroll:true, rerollCost:rc, rerollCount:rerolls, isSelected:this._selectedSlot===s }
            : { slotIndex:s, isFixed:false, isFilled:false, isEmpty:true, label:"EMPTY", badge:"", type:"empty", isSelected:this._selectedSlot===s }
          );
        }
        if (this._selectedSlot !== null) {
          const sel = slotRows.find(r => r.slotIndex === this._selectedSlot);
          if (sel?.isFilled) { rerollCost = sel.rerollCost; canApply = _qty("Carmine Shard") >= rerollCost; }
          else if (sel?.isEmpty) { canApply = isWeapon ? _qty("Ephi Shard") > 0 : _qty("Amynti Shard") > 0; }
        }
        selectedItem = { id:item.id, name:item.name, img:item.img, level, rarity, rarityLabel:_rarityLabel(rarity), rarityColor:_rarityColor(rarity), isWeapon };
      }
    }
    const essenceQtyOwned = this._selectedEssence ? _qty(`${this._selectedEssence.charAt(0).toUpperCase()}${this._selectedEssence.slice(1)} Essence`) : 0;
    const selectedEssenceQty = this._selectedEssence ? Math.max(1, Math.min(this._selectedEssenceQty ?? 1, essenceQtyOwned || 1)) : 0;
    if (this._selectedEssence && (selectedEssenceQty < 1 || selectedEssenceQty > essenceQtyOwned)) canApply = false;
    return { actor, itemList, selectedItem, slotRows, essenceOptions, canApply, rerollCost, selectedSlot:this._selectedSlot, selectedEssence:this._selectedEssence, selectedEssenceQty, essenceQtyOwned, essenceBiasPct: selectedEssenceQty * ENHANCE_ESSENCE_BOOST_PCT * 100, lastResult:this._lastResult };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".db-enhance-item-row").click(ev => { this._selectedItemId = ev.currentTarget.dataset.itemId; this._selectedSlot = null; this._lastResult = null; this.render(); });
    html.find(".db-enh-slot-select").click(ev => { this._selectedSlot = parseInt(ev.currentTarget.dataset.slot); this.render(); });
    html.find(".db-enhance-essence-select").change(ev => { this._selectedEssence = ev.currentTarget.value || null; this._selectedEssenceQty = 1; this.render(); });
    html.find(".db-enhance-essence-qty").change(ev => { this._selectedEssenceQty = Math.max(1, parseInt(ev.currentTarget.value) || 1); this.render(); });
    html.find(".db-enhance-apply-btn").click(async () => {
      const item = this.actor.items.get(this._selectedItemId);
      if (!item || this._selectedSlot === null) return;
      const rarity = item.system?.rarity ?? "basic";
      const isWeapon = item.system?.isWeapon ?? (item.system?.itemType === "weapon");
      const enhancements = foundry.utils.deepClone(item.getFlag("dawnbreaker-trials","enhancements") ?? []);
      const slotIdx = this._selectedSlot - 1;
      const existing = enhancements[slotIdx];
      const rerollCount = existing?.rerollCount ?? 0;
      const _qty = (name) => _craftingQty(this.actor, name);
      const essenceQty = this._selectedEssence ? Math.max(1, this._selectedEssenceQty ?? 1) : 0;

      if (existing) {
        const cost = _getRerollCost(rarity, rerollCount);
        await _consumeStoredMaterial(this.actor, "Carmine Shard", cost);
        if (this._selectedEssence) {
          const en = this._selectedEssence.charAt(0).toUpperCase() + this._selectedEssence.slice(1);
          await _consumeStoredMaterial(this.actor, `${en} Essence`, essenceQty);
        }
      } else {
        await _consumeStoredMaterial(this.actor, isWeapon ? "Ephi Shard" : "Amynti Shard", 1);
        if (this._selectedEssence) {
          const en = this._selectedEssence.charAt(0).toUpperCase() + this._selectedEssence.slice(1);
          await _consumeStoredMaterial(this.actor, `${en} Essence`, essenceQty);
        }
      }

      const result = _rollEnhancement(item, this._selectedEssence, essenceQty);
      result.rerollCount = existing ? rerollCount + 1 : 0;
      enhancements[slotIdx] = result;
      await item.setFlag("dawnbreaker-trials","enhancements", enhancements);
      await _applyEnhancements(item);
      _craftingLogAdd({ actorName:this.actor.name, action:existing?"reroll":"enhance", itemName:item.name, rarity, detail:`Slot ${this._selectedSlot}: ${result.label} +${result.value}${result.essence?` [${result.essence} x${essenceQty}]`:""}` });
      this._lastResult = result;
      this._selectedSlot = null;
      this._selectedEssence = null;
      this._selectedEssenceQty = 1;
      this.render();
    });
  }
}

// ═══════════════════════════════════════════════════════════
//  GM LOG VIEWER
// ═══════════════════════════════════════════════════════════
class DawnbreakerLogViewer extends foundry.appv1.api.Application {
  constructor(options = {}) { super(options); this._filters = { actor:"", item:"", rarity:"", action:"" }; }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "db-log-viewer", classes: ["dawnbreaker","db-log-app"],
      template: "systems/dawnbreaker-trials/templates/log-viewer.html",
      title: "INVENTORY LOG", width: 860, height: 600, resizable: true,
    });
  }

  getData() {
    let log = _craftingLogGet();
    const f = this._filters;
    if (f.actor)  log = log.filter(e => e.actorName?.toLowerCase().includes(f.actor.toLowerCase()));
    if (f.item)   log = log.filter(e => e.itemName?.toLowerCase().includes(f.item.toLowerCase()));
    if (f.rarity) log = log.filter(e => e.rarity === f.rarity);
    if (f.action) log = log.filter(e => e.action === f.action);
    return {
      log: log.map(e => ({ ...e, rarityColor:_rarityColor(e.rarity), rarityLabel:_rarityLabel(e.rarity) })),
      filters:this._filters, isEmpty:log.length===0, rarities:RARITY_ORDER,
      actions:["upgrade","enhance","reroll","delete","purchase","sell","equip","unequip"],
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".db-log-filter-input, .db-log-filter-select").on("input change", ev => {
      this._filters[ev.currentTarget.dataset.filter] = ev.currentTarget.value;
      this.render();
    });
    html.find(".db-log-clear-btn").click(() => { this._filters = { actor:"", item:"", rarity:"", action:"" }; this.render(); });
  }
}

window.DawnbreakerBlacksmithApp = DawnbreakerBlacksmithApp;
window.DawnbreakerEnhancerApp   = DawnbreakerEnhancerApp;
window.DawnbreakerLogViewer     = DawnbreakerLogViewer;

// ═══════════════════════════════════════════════════════════
//  INIT HOOK
// ═══════════════════════════════════════════════════════════
Hooks.once("init", () => {
  console.log("Dawnbreaker Trials | Initialising system");
  CONFIG.sounds.dice = "";
  delete CONFIG.ui.combat;
  window.CTB                 = CTB;
  window.CTBEngine           = CTBEngine;
  window.CTBDisplay          = CTBDisplay;
  window.TargetSelector      = TargetSelector;
  window.CastQueue           = CastQueue;
  window._showMovementRange  = _showMovementRange;
  window._applyDownCondition = _applyDownCondition;
  window._clearMovementRange = _clearMovementRange;
  // _getAssistBonus already exported above DB_REACTIONS

  // ── Journal enricher: @Cutscene[img|caption|sound]{Button Label} ──
  CONFIG.TextEditor.enrichers.push({
    id: "db-cutscene",
    pattern: /@Cutscene\[([^\]]+)\](?:\{([^}]+)\})?/g,
    enricher: async (match) => {
      const parts   = match[1].split("|").map(s => s.trim());
      const [img, caption = "", sound = ""] = parts;
      const label = match[2] ?? "Play Cutscene";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "db-cutscene-trigger-btn";
      btn.dataset.img = img ?? "";
      btn.dataset.caption = caption;
      btn.dataset.sound = sound;
      btn.textContent = label;
      return btn;
    },
  });

  // ── "Add Cutscene" builder — injected as a real ProseMirror menu item ──
  // V14 journal editors are a <prose-mirror> web component with fully
  // private internals (#editor, #activateEditor) — no DOM toolbar to append
  // a plain button to, and no public way to reach the live EditorView from
  // outside. The supported extension point is patching the menu item list
  // that ProseMirrorMenu builds; cmd receives (state, dispatch, view)
  // directly, so no private access is needed at all.
  try {
    const PMMenu = foundry.prosemirror?.ProseMirrorMenu;
    if (PMMenu && !PMMenu.prototype._dbPatched) {
      const original = PMMenu.prototype._getMenuItems;
      PMMenu.prototype._getMenuItems = function () {
        const items = original.call(this);
        if (game.user.isGM) {
          items.push({
            action: "db-add-cutscene",
            title: "Add Cutscene",
            icon: '<i class="fa-solid fa-clapperboard fa-fw"></i>',
            weight: 500,
            menu: "insert",
            scope: this.constructor._MENU_ITEM_SCOPES.TEXT,
            cmd: (state, dispatch, view) => _openAddCutsceneDialog(view),
          });
        }
        return items;
      };
      PMMenu.prototype._dbPatched = true;
    }
  } catch(e) { console.warn("Dawnbreaker | Could not patch ProseMirror menu:", e); }

  CONFIG.statusEffects = [
    { id: "down",       label: "Down",       icon: "icons/svg/skull.svg"      },
    { id: "guard",      label: "Guard",      icon: "icons/svg/shield.svg"     },
    { id: "scan",       label: "Scan",       icon: "icons/svg/eye.svg"        },
    { id: "poison",     label: "Poison",     icon: "icons/svg/poison.svg"     },
    { id: "stun",       label: "Stun",       icon: "icons/svg/stun.svg"       },
    { id: "blind",      label: "Blind",      icon: "icons/svg/blind.svg"      },
    { id: "sleep",      label: "Sleep",      icon: "icons/svg/sleep.svg"      },
    { id: "burning",    label: "Burning",    icon: "icons/svg/fire.svg"       },
    { id: "frozen",     label: "Frozen",     icon: "icons/svg/frozen.svg"     },
    { id: "bleeding",   label: "Bleeding",   icon: "icons/svg/blood.svg"      },
    { id: "invisible",  label: "Invisible",  icon: "icons/svg/invisible.svg"  },
    { id: "prone",      label: "Prone",      icon: "icons/svg/falling.svg"    },
    { id: "paralysis",  label: "Paralysis",  icon: "icons/svg/paralysis.svg"  },
    { id: "fly",        label: "Flying",     icon: "icons/svg/wing.svg"       },
    { id: "curse",      label: "Cursed",     icon: "icons/svg/curse.svg"      },
    { id: "regen",      label: "Regen",      icon: "icons/svg/regen.svg"      },
    { id: "disabled",   label: "Disabled",   icon: "icons/svg/degen.svg"      },
    { id: "crippled",   label: "Crippled",   icon: "icons/svg/falling.svg"    },
    { id: "immovable",  label: "Immovable",  icon: "icons/svg/statue.svg"     },
    { id: "threatened", label: "Threatened", icon: "icons/svg/target.svg"     },
    { id: "weakened",   label: "Weakened",   icon: "icons/svg/downgrade.svg"  },
    { id: "hasted",     label: "Hasted",     icon: "icons/svg/upgrade.svg"    },
    { id: "slowed",     label: "Slowed",     icon: "icons/svg/sleep.svg"      },
    { id: "hpguard",    label: "HP Guard",   icon: "icons/svg/shield.svg"     },
    { id: "arguard",    label: "AR Guard",   icon: "icons/svg/tankard.svg"    },
  ];

  Handlebars.registerHelper("addOne", (val) => val + 1);
  Handlebars.registerHelper("gte", (a, b) => a >= b);
  Handlebars.registerHelper("eq", (a, b) => a === b);

  CONFIG.Actor.dataModels.character = DawnbreakerCharacterData;
  CONFIG.Actor.dataModels.npc       = DawnbreakerNPCData;
  CONFIG.Actor.dataModels.companion = DawnbreakerCharacterData;
  CONFIG.Actor.documentClass        = DawnbreakerActor;
  CONFIG.Item.dataModels.weapon     = DawnbreakerItemData;
  CONFIG.Item.dataModels.armor      = DawnbreakerItemData;
  CONFIG.Item.dataModels.offhand    = DawnbreakerItemData;
  CONFIG.Item.dataModels.consumable = DawnbreakerItemData;
  CONFIG.Item.dataModels.common     = DawnbreakerItemData;
  CONFIG.Item.dataModels.special    = DawnbreakerItemData;
  CONFIG.Item.dataModels.craft      = DawnbreakerItemData;
  CONFIG.Item.dataModels.ability    = DawnbreakerAbilityData;

  try { foundry.applications.apps.DocumentSheetConfig.unregisterSheet(Actor, "core", ActorSheet); } catch(e) {}
  try { foundry.applications.apps.DocumentSheetConfig.unregisterSheet(Item, "core", ItemSheet); } catch(e) {}
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, "dawnbreaker-trials", DawnbreakerActorSheet, { types: ["character"], makeDefault: true, label: "Dawnbreaker Character Sheet" });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, "dawnbreaker-trials", DawnbreakerNPCSheet, { types: ["npc"], makeDefault: true, label: "Dawnbreaker NPC Sheet" });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, "dawnbreaker-trials", DawnbreakerCompanionSheet, { types: ["companion"], makeDefault: true, label: "Dawnbreaker Companion Sheet" });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, "dawnbreaker-trials", DawnbreakerItemSheet, { types: ["weapon","armor","offhand","consumable","common","special","craft"], makeDefault: true, label: "Dawnbreaker Item Sheet" });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, "dawnbreaker-trials", DawnbreakerAbilitySheet, { types: ["ability"], makeDefault: true, label: "Dawnbreaker Ability Sheet" });
  console.log("Dawnbreaker Trials | Sheets registered");
});

// ═══════════════════════════════════════════════════════════
//  READY HOOK
// ═══════════════════════════════════════════════════════════
// Shared by every popup/window render: always stack one z-index above whatever
// else is currently open, instead of any fixed/hardcoded z-index value.
function _bumpZIndexAboveOthers(app) {
  // V14 keeps ONE shared z counter for both AppV1 and AppV2 windows:
  // foundry.applications.api.ApplicationV2._maxZ. Core assigns
  // ++_maxZ on render/bring-to-front for both frameworks. Writing arbitrary
  // inflated style values breaks that ordering (core windows can never catch
  // up) and AppV2 overwrites style z from its own position object anyway.
  // So: advance the CORE counter and assign through it.
  const el = app.element?.[0] ?? (app.element instanceof HTMLElement ? app.element : null);
  if (!el) return;
  try {
    const AppV2 = foundry.applications?.api?.ApplicationV2;
    const current = parseInt(el.style.zIndex, 10) || 0;
    let z;
    if (AppV2 && typeof AppV2._maxZ === "number") {
      z = ++AppV2._maxZ;
      if (z <= current) return; // already on top
    } else {
      z = current + 1;
    }
    // AppV2 windows re-apply z from their position object — keep it in sync
    if (app.position && typeof app.position === "object") {
      try { app.position.zIndex = z; } catch(e) {}
    }
    el.style.zIndex = String(z);
  } catch(e) {}
}

Hooks.on("renderApplication", (app, html) => {
  // Dialogs: anchor beside the rightmost currently-open window (unchanged behavior)
  const DialogClass = foundry.appv1?.applications?.Dialog ?? (typeof Dialog !== "undefined" ? Dialog : null);
  if (DialogClass && app instanceof DialogClass) {
    const openApps = Object.values(ui.windows ?? {}).filter(w => w.rendered && w.id !== app.id);
    if (openApps.length) {
      const rightmost = openApps.reduce((best, w) => {
        const r = (w.position?.left ?? 0) + (w.position?.width ?? 0);
        const b = (best.position?.left ?? 0) + (best.position?.width ?? 0);
        return r > b ? w : best;
      });
      const { left, top, width } = rightmost.position ?? {};
      if (left != null) app.setPosition({ left: left + width + 8, top });
    }
  }

  // All windows/dialogs: always render one z-index above whatever else is open
  _bumpZIndexAboveOthers(app);
});

// AppV2 windows (FilePicker, core config apps, etc.) fire a different render
// hook and were never bumped — they'd open UNDER recently-opened v1 sheets.
// Only framed windows: frameless overlays (ESC menu, notifications) manage
// their own fullscreen layout and touching their position collapses them.
Hooks.on("renderApplicationV2", (app) => {
  if (app.hasFrame) _bumpZIndexAboveOthers(app);
});

Hooks.once("ready", () => {
  game.settings.register("dawnbreaker-trials", "ctbState", { scope: "world", config: false, type: Object, default: {} });
  game.settings.register("dawnbreaker-trials", "castQueueState", { scope: "world", config: false, type: Array, default: [] });
  game.settings.register("dawnbreaker-trials", "trapState", { scope: "world", config: false, type: Array, default: [] });
  game.settings.register("dawnbreaker-trials", "undoStack", { scope: "world", config: false, type: Array, default: [] });
  game.settings.register("dawnbreaker-trials", "craftingLog", { scope: "world", config: false, type: String, default: "[]" });
  game.settings.register("dawnbreaker-trials", "growthPaths", { scope: "world", config: false, type: Array, default: [] });

  // ── Audio atmosphere automation ──
  game.settings.register("dawnbreaker-trials", "audioAtmosphere", {
    name: "Audio Atmosphere Automation",
    hint: "Reactive combat audio: low-HP heartbeat, boss-phase sting, and a victory sting on combat end.",
    scope: "world", config: true, type: Boolean, default: true,
  });
  game.settings.register("dawnbreaker-trials", "audioHeartbeatSrc", {
    name: "Low-HP Heartbeat Sound",
    hint: "Looping sound played while a living ally is at or below the critical HP %. Leave blank to disable the heartbeat.",
    scope: "world", config: true, type: String, default: "", filePicker: "audio",
  });
  game.settings.register("dawnbreaker-trials", "audioHeartbeatPct", {
    name: "Heartbeat HP Threshold (%)",
    hint: "A living ally at or below this % of max HP triggers the heartbeat.",
    scope: "world", config: true, type: Number, default: 25,
  });
  game.settings.register("dawnbreaker-trials", "audioBossStingSrc", {
    name: "Boss Phase Sting",
    hint: "One-shot played when a boss breakpoint banner fires (Shard Burst, Frenzy, grip break, etc.). Blank to disable.",
    scope: "world", config: true, type: String, default: "sounds/combat/epic-start-horn.ogg", filePicker: "audio",
  });
  game.settings.register("dawnbreaker-trials", "audioVictorySrc", {
    name: "Victory Sting",
    hint: "One-shot played when combat ends. Blank to disable.",
    scope: "world", config: true, type: String, default: "sounds/combat/epic-next-horn.ogg", filePicker: "audio",
  });

  _ensureEnhancementTablesJournal();

  game.socket.on("system.dawnbreaker-trials", async (data) => {
    // Prefer resolving via tokenId — unlinked duplicate tokens share actorId,
    // so game.actors.get(actorId) alone can't distinguish between them.
    const actorToken = data.tokenId ? canvas.tokens?.placeables?.find(t => t.document.id === data.tokenId) : null;
    const actor = actorToken?.actor ?? (data.actorId ? game.actors.get(data.actorId) : null);

    // CTB display commands — handle on ALL clients regardless of GM status
    if (data.type === "ctbOpen") {
      await CTBDisplay.show();
      return;
    }
    if (data.type === "ctbUpdate" || data.type === "castQueueUpdate") {
      CTBDisplay.refresh();
      return;
    }

    // ── Cast onResolve callback — runs on whichever client queued the cast ──
    if (data.type === "castResolvedCallback") {
      const cb = CastQueue._localCallbacks.get(data.callbackId);
      if (cb) {
        CastQueue._localCallbacks.delete(data.callbackId);
        const cbCasterToken = data.casterTokenId ? canvas.tokens?.placeables?.find(t => t.document.id === data.casterTokenId) : null;
        const cbCaster = cbCasterToken?.actor ?? game.actors.get(data.actorId);
        try { await cb(cbCaster); } catch(e) { console.warn("CastQueue | onResolve failed:", e); }
      }
      return;
    }

    // ── Turn spotlight banner — broadcast to ALL clients ──
    if (data.type === "turnBanner") {
      _dbShowTurnBanner(data.entries ?? []);
      return;
    }
    if (data.type === "turnBannerClear") {
      _dbClearTurnTimer();
      return;
    }
    if (data.type === "bossBanner") {
      _dbShowBossBanner(data.title, data.sub, data.color);
      return;
    }

    // ── Looping ambience (heartbeat) — start/stop on ALL clients so each
    //    holds its own Sound handle and can stop it locally ──
    if (data.type === "audioLoop") {
      if (data.action === "start") _dbAudioLoopStart(data.key, data.src, data.volume ?? 0.5);
      else                         _dbAudioLoopStop(data.key);
      return;
    }

    // ── Cutscene viewer — broadcast to ALL clients ──
    if (data.type === "cutsceneShow") {
      CutsceneViewer.show({ img: data.img, caption: data.caption, sound: data.sound });
      return;
    }
    if (data.type === "cutsceneHide") {
      CutsceneViewer.hide();
      return;
    }

    // ── Cast queue add — players route through GM ──
    if (data.type === "craftingLogAdd" && game.user.isGM) { await _craftingLogAdd(data.entry); return; }

    if (data.type === "castQueueAdd" && game.user.isGM) {
      await CastQueue.queue(data);
      return;
    }

    // ── Light Aura manual cancel by player ──
    if (data.type === "cancelLightAura" && game.user.isGM) {
      const laActor = game.actors.get(data.actorId);
      if (laActor) await _cancelLightAura(laActor, "deactivated");
      return;
    }

    // ── Shop system ──
    if (data.type === "itemTransfer" && game.user.isGM) {
      await _processItemTransfer(data);
      return;
    }
    if (data.type === "shopBuy" && game.user.isGM) {
      await _processShopPurchase(data);
      return;
    }
    if (data.type === "shopSell" && game.user.isGM) {
      await _processShopSell(data);
      return;
    }
    if (data.type === "shopStockUpdate") {
      for (const app of Object.values(ui.windows ?? {})) {
        if (app instanceof DawnbreakerShopApp && app.npcActorId === data.npcActorId) app.render(false);
      }
      return;
    }
    if (data.type === "shopTablesUpdate") {
      for (const app of Object.values(ui.windows ?? {})) {
        if (app instanceof DawnbreakerShopApp || app instanceof DawnbreakerShopTablesApp) app.render(false);
      }
      return;
    }
    if (data.type === "shopOpen" && game.user.isGM) {
      await _handleShopOpen(data);
      return;
    }
    if (data.type === "shopClose" && game.user.isGM) {
      _handleShopClose(data);
      return;
    }
    if (data.type === "shopPurchaseFailed") {
      const buyer = game.actors.get(data.buyerActorId);
      if (buyer?.isOwner) {
        const msg = data.reason === "insufficient_credits" ? "Not enough Credits!" : "That item is out of stock.";
        ui.notifications.warn(`🛒 ${msg}`);
      }
      return;
    }

    if (data.type === "showMovementRange") {
      const token = canvas.tokens.placeables.find(t => t.document?.id === data.tokenId || t.id === data.tokenId);
      if (token) await _showMovementRange(token);
      return;
    }

    // ── Ki Shield prompt — fires on target's owner client ──
    if (data.type === "kiShieldPrompt" && !game.user.isGM) {
      if (!actor?.isOwner) return;
      const currentKI = actor.system.ki?.current ?? 0;
      const incomingDmg = data.incomingDamage;
      new (foundry.appv1?.applications?.Dialog ?? Dialog)({
        title: "⚡ Ki Shield — Reaction",
        content: `
          <style>
            .ki-shield-form { font-family:sans-serif; font-size:13px; padding:4px; }
            .ki-info { background:#1a2030; border:1px solid #64b5f6; border-radius:4px; padding:8px 10px; margin-bottom:8px; color:#d4d8e0; }
            .ki-row { display:grid; grid-template-columns:1fr 80px; align-items:center; gap:6px; margin-top:8px; }
            .ki-row label { color:#d4d8e0; }
            .ki-row input { background:#2a2d33; border:1px solid #3a3f4a; color:#d4d8e0; border-radius:3px; padding:3px 6px; width:100%; box-sizing:border-box; text-align:center; }
          </style>
          <form class="ki-shield-form">
            <div class="ki-info">
              ⚡ <b style="color:#64d4ff;">Ki Shield</b> — Reaction<br/>
              <div style="margin-top:4px;font-size:12px;color:#7a8090;">
                Incoming damage: <b style="color:#e57373;">${incomingDmg} HP</b><br/>
                Your KI: <b style="color:#81c784;">${currentKI}</b><br/>
                Each KI spent reduces damage by 1.
              </div>
            </div>
            <div class="ki-row">
              <label>KI to spend (max ${Math.min(currentKI, incomingDmg)})</label>
              <input id="ki-spend" type="number" value="${Math.min(currentKI, incomingDmg)}" min="0" max="${Math.min(currentKI, incomingDmg)}"/>
            </div>
          </form>
        `,
        buttons: {
          use: {
            icon: '<i class="fas fa-shield-alt"></i>',
            label: "Use Ki Shield",
            callback: async (html) => {
              const kiSpend    = Math.min(Math.max(0, parseInt(html.find("#ki-spend").val()) || 0), Math.min(currentKI, incomingDmg));
              const newKI      = Math.max(0, currentKI - kiSpend);
              const reducedDmg = Math.max(0, incomingDmg - kiSpend);
              await actor.update({ "system.ki.current": newKI });
              await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>${actor.name}</b> used Ki Shield — spent <span style="color:#64d4ff;font-weight:700;">${kiSpend} KI</span>. Damage: <span style="color:#e57373;">${incomingDmg}</span> → <span style="color:#81c784;font-weight:700;">${reducedDmg}</span></div>` });
              game.socket.emit("system.dawnbreaker-trials", { type: "kiShieldResolved", actorId: data.actorId, tokenId: data.tokenId, reducedDamage: reducedDmg, attackType: data.attackType, requestId: data.requestId });
            }
          },
          skip: {
            label: "Don't Use",
            callback: () => {
              game.socket.emit("system.dawnbreaker-trials", { type: "kiShieldResolved", actorId: data.actorId, tokenId: data.tokenId, reducedDamage: incomingDmg, attackType: data.attackType, requestId: data.requestId });
            }
          }
        },
        default: "use",
      }).render(true);
      return;
    }

    // ── Ki Shield resolved — GM applies final damage ────────
    if (data.type === "kiShieldResolved" && game.user.isGM) {
      if (!actor) return;
      // Ignore a late reply if the safety timeout already applied full damage
      if (!_dbClearReactionTimeout(data.requestId)) return;
      const currentHP = actor.system.hp?.current ?? 0;
      const newHP     = Math.max(0, currentHP - data.reducedDamage);
      await actor.update({ "system.hp.current": newHP });
      if (newHP <= 0) { await CastQueue.cancelForActor(actor.id, "was downed", actor.isToken ? actor.token?.id : (data?.tokenId ?? null)); await _applyDownCondition(actor); }
      if (data.attackType) await _checkReactiveItems(actor, data.attackType);
      return;
    }

    if (data.type === "sacrificialLambPrompt" && !game.user.isGM) {
      const lambActor  = game.actors.get(data.actorId);
      const targetActor = game.actors.get(data.targetActorId);
      if (!lambActor?.isOwner) return;
      const maxKI = data.maxKI ?? lambActor.system.ki?.current ?? 0;
      new (foundry.appv1?.applications?.Dialog ?? Dialog)({
        title: `🐑 Sacrificial Lamb — ${lambActor.name}`,
        content: `<div style="font-family:sans-serif;font-size:13px;padding:8px;color:#d4d8e0;">
          <p><b>${lambActor.name}</b> can spend KI to revive <b>${targetActor?.name ?? "ally"}</b>.</p>
          <p>Available KI: <b>${maxKI}</b></p>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <label style="color:#d4d8e0;">KI to spend:</label>
            <input id="ki-spend" type="number" min="1" max="${maxKI}" value="${Math.min(5, maxKI)}" style="background:#2a2d33;border:1px solid #3a3f4a;color:#d4d8e0;border-radius:3px;padding:3px 6px;width:60px;"/>
          </div>
        </div>`,
        buttons: {
          spend: { label: "Spend KI", callback: (html) => {
            const kiSpent = Math.min(parseInt(html.find("#ki-spend").val()) || 0, maxKI);
            game.socket.emit("system.dawnbreaker-trials", { type: "sacrificialLambResolved", actorId: data.actorId, targetActorId: data.targetActorId, kiSpent, requestId: data.requestId });
          }},
          skip: { label: "Skip", callback: () => {} }
        }, default: "spend"
      }).render(true);
      return;
    }

    if (data.type === "sacrificialLambResolved" && game.user.isGM) {
      const lambActor   = game.actors.get(data.actorId);
      const targetActor = game.actors.get(data.targetActorId);
      if (!lambActor || !targetActor || data.kiSpent <= 0) return;
      const lambKI  = lambActor.system.ki?.current ?? 0;
      const kiSpent = Math.min(data.kiSpent, lambKI);
      const curHP   = targetActor.system.hp?.current ?? 0;
      const maxHP   = targetActor.system.hp?.max ?? curHP;
      const newHP   = Math.min(maxHP, curHP + kiSpent);
      const conds2  = foundry.utils.deepClone(targetActor.system.conditions ?? []).filter(c => c.label !== "down");
      await targetActor.update({ "system.hp.current": newHP, "system.conditions": conds2 });
      await lambActor.update({ "system.ki.current": Math.max(0, lambKI - kiSpent) });
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #f5c518;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🐑 <b>Sacrificial Lamb</b> — <b>${lambActor.name}</b> spends ${kiSpent} KI to revive <b>${targetActor.name}</b> with ${kiSpent} HP!</div>` });
      return;
    }

    // Soulbound Gale prompt — sent to owner
    if (data.type === "soulboundGalePrompt" && !game.user.isGM) {
      const sgActor = game.actors.get(data.actorId);
      if (!sgActor?.isOwner) return;
      const maxKI = sgActor.system.ki?.current ?? 0;
      const maxReduce = Math.floor(maxKI) * 2; // 1 KI = 2 damage reduced
      new (foundry.appv1?.applications?.Dialog ?? Dialog)({
        title: `💨 Soulbound Gale — ${sgActor.name}`,
        content: `<div style="font-family:sans-serif;font-size:13px;padding:8px;color:#d4d8e0;">
          <p>Incoming damage: <b style="color:#e05555;">${data.incomingDamage}</b></p>
          <p>KI available: <b>${maxKI}</b> (each KI reduces damage by 2, max reduction: ${maxReduce})</p>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <label>KI to spend:</label>
            <input id="ki-spend" type="number" min="0" max="${maxKI}" value="0" style="background:#2a2d33;border:1px solid #3a3f4a;color:#d4d8e0;border-radius:3px;padding:3px 6px;width:60px;"/>
          </div>
        </div>`,
        buttons: {
          spend: { label: "Spend KI", callback: (html) => {
            const kiSpent   = Math.min(parseInt(html.find("#ki-spend").val()) || 0, maxKI);
            const reduction = kiSpent * 2;
            const reduced   = Math.max(1, data.incomingDamage - reduction);
            game.socket.emit("system.dawnbreaker-trials", { type: "soulboundGaleResolved", actorId: data.actorId, tokenId: data.tokenId, kiSpent, reducedDamage: reduced, attackType: data.attackType, requestId: data.requestId });
          }},
          skip: { label: "Take Full Damage", callback: () => {
            game.socket.emit("system.dawnbreaker-trials", { type: "soulboundGaleResolved", actorId: data.actorId, tokenId: data.tokenId, kiSpent: 0, reducedDamage: data.incomingDamage, attackType: data.attackType, requestId: data.requestId });
          }}
        }, default: "spend"
      }).render(true);
      return;
    }

    if (data.type === "soulboundGaleResolved" && game.user.isGM) {
      const sgActor = game.actors.get(data.actorId);
      if (!sgActor) return;
      // Ignore a late reply if the safety timeout already applied full damage
      if (!_dbClearReactionTimeout(data.requestId)) return;
      if (data.kiSpent > 0) {
        await sgActor.update({ "system.ki.current": Math.max(0, (sgActor.system.ki?.current ?? 0) - data.kiSpent) });
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">💨 <b>Soulbound Gale</b> — ${sgActor.name} spends ${data.kiSpent} KI to reduce damage by ${data.kiSpent * 2}! (${data.incomingDamage || "?"} → ${data.reducedDamage})</div>` });
      }
      const curHP = sgActor.system.hp?.current ?? 0;
      const newHP = Math.max(0, curHP - data.reducedDamage);
      await sgActor.update({ "system.hp.current": newHP });
      if (newHP <= 0) { await CastQueue.cancelForActor(sgActor.id, "was downed", sgActor.isToken ? sgActor.token?.id : null); await _applyDownCondition(sgActor); }
      return;
    }

    // GM-only handlers that don't require an actor
    if (game.user.isGM) {
      if (data.type === "myrBandageApply") {
        const tActor = game.actors.get(data.targetActorId);
        const mActor = game.actors.get(data.myrActorId);
        if (tActor) {
          const curBonus = tActor.system.stats?.WIL?.bonus ?? 0;
          await tActor.update({ "system.stats.WIL.bonus": curBonus + 2 });
          await tActor.setFlag("dawnbreaker-trials", "myrWILBonus", { active: true, amount: 2 });
        }
        if (mActor) await mActor.setFlag("dawnbreaker-trials", "myrBandageUsed", true);
        return;
      }
      if (data.type === "myrWILCleanup") {
        for (const actor of game.actors.contents) {
          const wilBonus = actor.getFlag("dawnbreaker-trials", "myrWILBonus");
          if (wilBonus?.active) {
            const curBonus = actor.system.stats?.WIL?.bonus ?? 0;
            await actor.update({ "system.stats.WIL.bonus": Math.max(0, curBonus - wilBonus.amount) });
            await actor.unsetFlag("dawnbreaker-trials", "myrWILBonus");
          }
          await actor.unsetFlag("dawnbreaker-trials", "myrBandageUsed");
        }
        return;
      }
      if (data.type === "deployHealingBeacon") {
        const scene = game.scenes.active;
        if (!scene) return;
        const [createdToken] = await scene.createEmbeddedDocuments("Token", [data.tokenData]);
        await new Promise(r => setTimeout(r, 300));
        const beaconCanvasToken = canvas.tokens.placeables.find(t => t.document.id === createdToken.id);
        const beaconActor = beaconCanvasToken?.actor;
        if (beaconActor) {
          if (data.spawnAnimFile && window._playHitAnimation && beaconCanvasToken)
            await window._playHitAnimation(beaconCanvasToken, data.spawnAnimFile, data.spawnAnimScale, data.spawnAnimSound, null);
          await beaconActor.setFlag("dawnbreaker-trials", "healingBeacon", {
            active: true, turns: 0,
            animFile: data.spawnAnimFile, animScale: data.spawnAnimScale, animSound: data.spawnAnimSound,
            healAnimFile: data.healAnimFile, healAnimScale: data.healAnimScale, healAnimSound: data.healAnimSound,
          });
          await beaconActor.update({ "system.hp.current": 3, "system.hp.max": 3 });
          const ctbState   = window.CTB.getState();
          const combatants = ctbState.combatants ?? [];
          combatants.push({
            tokenId: createdToken.id, actorId: beaconActor.id,
            name: "Healing Beacon", img: data.tokenData.texture?.src ?? beaconActor.img,
            apCurrent: data.initAP, apTotal: data.wil,
            isNPC: true, conditions: [], turnDone: false,
          });
          await window.CTB.setState({ ...ctbState, combatants });
        }
        const casterActor = game.actors.get(data.casterId);
        if (casterActor) {
          const beaconItem = casterActor.items.get(data.beaconItemId);
          if (beaconItem) await beaconItem.update({ "system.qty": Math.max(0, (beaconItem.system.qty ?? 1) - 1) });
          await casterActor.update({ "system.ctbAP": Math.max(-100, (casterActor.system.ctbAP ?? 0) - 100) });
        }
        return;
      }
      if (data.type === "moveToken") {
        const scene = game.scenes.active;
        if (!scene) return;
        const td = scene.tokens.get(data.tokenId);
        if (td) await td.update({ x: data.x, y: data.y });
        return;
      }
      if (data.type === "createToken") {
        const scene = game.scenes.active;
        if (!scene) return;
        await scene.createEmbeddedDocuments("Token", [data.tokenData]);
        return;
      }
      if (data.type === "deleteToken") {
        const scene = game.scenes.active;
        if (!scene) return;
        const td = scene.tokens.get(data.tokenId);
        if (td) await td.delete();
        return;
      }
    }

    if (!game.user.isGM && !actor?.isOwner) return;
    if (game.user.isGM || !game.users.find(u => u.isGM && u.active)) {
      if (!actor) return;
      if (data.type === "applyDamage") {
        await window._dbApplyDamage(data);
      } else if (data.type === "applyARDamage") {
        await window._dbApplyDamage(data);
      } else if (data.type === "throwApply") {
        await actor.update(data.updates);
      } else if (data.type === "applyCondition") {
        await actor.update({ "system.conditions": data.conditions });
      } else if (data.type === "trapUpdate" && game.user.isGM) {
        await game.settings.set("dawnbreaker-trials", "trapState", data.traps);
        if (window.TrapSystem) TrapSystem.drawTraps();
      } else if (data.type === "ctbEndTurn") {
        await CTBEngine.endTurn(data.actorId, data.tokenId ?? null);
      }
    }
  });

  // Expose socket helpers so macros can request GM token ops without ownership
  window._gmMoveToken = function(tokenId, x, y) {
    if (game.user.isGM) {
      const td = game.scenes.active?.tokens.get(tokenId);
      return td ? td.update({ x, y }) : Promise.resolve();
    }
    game.socket.emit("system.dawnbreaker-trials", { type: "moveToken", tokenId, x, y });
    return Promise.resolve();
  };

  window._gmCreateToken = function(tokenData) {
    if (game.user.isGM) {
      return game.scenes.active?.createEmbeddedDocuments("Token", [tokenData]) ?? Promise.resolve();
    }
    game.socket.emit("system.dawnbreaker-trials", { type: "createToken", tokenData });
    return Promise.resolve();
  };

  window._gmDeleteToken = function(tokenId) {
    if (game.user.isGM) {
      const td = game.scenes.active?.tokens.get(tokenId);
      return td ? td.delete() : Promise.resolve();
    }
    game.socket.emit("system.dawnbreaker-trials", { type: "deleteToken", tokenId });
    return Promise.resolve();
  };

  // Cleanup Myr WIL bonus — call at end of combat
  window._myrWILCleanup = async function() {
    if (game.user.isGM) {
      for (const actor of game.actors.contents) {
        const wilBonus = actor.getFlag("dawnbreaker-trials", "myrWILBonus");
        if (wilBonus?.active) {
          const curBonus = actor.system.stats?.WIL?.bonus ?? 0;
          await actor.update({ "system.stats.WIL.bonus": Math.max(0, curBonus - wilBonus.amount) });
          await actor.unsetFlag("dawnbreaker-trials", "myrWILBonus");
        }
        await actor.unsetFlag("dawnbreaker-trials", "myrBandageUsed");
      }
      ui.notifications.info("Myr WIL bonuses cleared.");
    } else {
      game.socket.emit("system.dawnbreaker-trials", { type: "myrWILCleanup" });
    }
  };

  // ── E key — interact with nearest interactable NPC ──────────
  window.addEventListener("keydown", async (ev) => {
    if (ev.key !== "e" && ev.key !== "E") return;
    // Ignore if focus is on any typeable element
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (document.activeElement?.isContentEditable) return;
    if (document.activeElement?.closest(".ProseMirror, .editor-content, [contenteditable]")) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    // Selected token is always the interacting party
    const controlledToken = canvas?.tokens?.controlled?.[0];
    const myActor = game.user.character ?? game.actors.find(a => a.isOwner && a.type === "character");
    const buyerActor = controlledToken?.actor ?? myActor ?? null;
    const sourceToken = controlledToken ?? canvas?.tokens?.placeables?.find(t => t.actor?.id === myActor?.id) ?? null;

    if (!sourceToken && !game.user.isGM) {
      ui.notifications.warn("You need a character token on the scene to interact.");
      return;
    }

    // Find all interactable NPCs on the scene
    const interactables = canvas.tokens.placeables.filter(t =>
      t.actor?.getFlag("dawnbreaker-trials", "isInteractable") && t.actor?.id !== buyerActor?.id
    );
    if (!interactables.length) return;

    // Pick the closest one
    const gridSize = canvas.grid.size;
    let nearest = null, nearestDist = Infinity;
    for (const t of interactables) {
      if (!sourceToken) { nearest = t; break; } // GM with no token — just open first one
      const dx = Math.abs(t.document.x - sourceToken.document.x) / gridSize;
      const dy = Math.abs(t.document.y - sourceToken.document.y) / gridSize;
      const d  = Math.max(dx, dy);
      if (d < nearestDist) { nearestDist = d; nearest = t; }
    }
    if (!nearest) return;

    // Proximity check (skip for GM)
    if (!game.user.isGM && nearestDist > 1.5) {
      ui.notifications.warn(`${nearest.actor.name} is too far away to interact with.`);
      return;
    }

    // Show SHOPPING label above player's token
    if (sourceToken) {
      const payload = { type: "shopOpen", tokenId: sourceToken.document.id };
      if (game.user.isGM) await _handleShopOpen(payload);
      else game.socket.emit("system.dawnbreaker-trials", payload);
    }

    _playGreetingSound(nearest.actor);
    new DawnbreakerShopApp(nearest.actor.id, buyerActor?.id ?? null, {}, sourceToken?.document?.id ?? null).render(true);
  }, { capture: true });

  // Refresh open shop windows when the buyer's credits change
  Hooks.on("updateActor", (actor, changes) => {
    if (!foundry.utils.hasProperty(changes, "system.bio.credits")) return;
    for (const app of Object.values(ui.windows ?? {})) {
      if (app instanceof DawnbreakerShopApp && app.buyerActorId === actor.id) app.render(false);
    }
  });

  // Refresh CTB on resource changes
  Hooks.on("updateActor", async (actor, changes) => {
    if (!game.user.isGM) return;
    const hpChanged         = foundry.utils.getProperty(changes, "system.hp.current") !== undefined;
    const arChanged         = foundry.utils.getProperty(changes, "system.ar.current") !== undefined;
    const kiChanged         = foundry.utils.getProperty(changes, "system.ki.current") !== undefined;
    const conditionsChanged = foundry.utils.getProperty(changes, "system.conditions") !== undefined;
    if (hpChanged || arChanged || kiChanged || conditionsChanged) window.DawnbreakerPartyHUD?.render?.();

    // Sync conditions and AP into CTB state
    const state = CTB.getState();
    if (!state.combatants?.length) return;
    const combatants = foundry.utils.deepClone(state.combatants);
    const idx = combatants.findIndex(c => c.actorId === actor.id);
    if (idx < 0) return;

    let dirty = false;
    const newAP = foundry.utils.getProperty(changes, "system.ctbAP");
    if (newAP !== undefined) { combatants[idx].apCurrent = newAP; dirty = true; }
    if (conditionsChanged) { combatants[idx].conditions = actor.system.conditions ?? []; dirty = true; }
    if (dirty) {
      await CTB.setState({ ...state, combatants });
      CTBDisplay.refresh();
    }
  });

  // ── Journal cutscene trigger buttons ───────────────────────
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".db-cutscene-trigger-btn");
    if (!btn) return;
    ev.preventDefault();
    if (!game.user.isGM) { ui.notifications.warn("Only the GM can trigger cutscenes."); return; }
    const img     = btn.dataset.img;
    const caption = btn.dataset.caption ?? "";
    const sound   = btn.dataset.sound ?? "";
    if (!img) { ui.notifications.warn("This cutscene button has no data-img set."); return; }
    window._showCutscene(img, { caption, sound });
  });

  // ── Chat log: style + inline dice display ─────────────────
  Hooks.on("renderChatMessage", _dbtStyleChatMessage);
  Hooks.on("renderChatLog",     (app, html) => _dbtStyleChatLog(html));

  // ── DBT-own dialogs only — Foundry native UI left untouched ──
  _dbtInjectDialogStyles();

});

function _dbtStyleChatLog(html) {
  const el = html instanceof jQuery ? html[0] : html;
  // Walk up to find the actual scrollable chat container and style it
  const log = el.querySelector?.("#chat-log") ?? (el.id === "chat-log" ? el : null);
  if (!log) return;
  Object.assign(log.style, {
    background: "#07080c", border: "none", padding: "4px 0"
  });
}

function _dbtStyleChatMessage(msg, html) {
  const root = html instanceof jQuery ? html[0] : html;
  if (!root) return;

  // ── Message card ──
  Object.assign(root.style, {
    background: "#0d0f14",
    border: "none",
    borderLeft: "3px solid rgba(200,168,75,0.35)",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    borderRadius: "0",
    margin: "0 0 3px",
    padding: "6px 8px 6px 10px",
    boxShadow: "none",
  });

  // ── Header ──
  const header = root.querySelector(".message-header, header");
  if (header) Object.assign(header.style, {
    display: "flex", alignItems: "center", gap: "6px",
    marginBottom: "4px", paddingBottom: "4px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    background: "transparent",
  });

  // Sender name
  const sender = root.querySelector(".message-sender, .name");
  if (sender) Object.assign(sender.style, {
    fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif",
    fontSize: "13px", letterSpacing: "2px",
    color: "#c8a84b", textTransform: "uppercase", flex: "1",
  });

  // Timestamp
  const ts = root.querySelector(".message-timestamp, time");
  if (ts) Object.assign(ts.style, {
    fontFamily: "'Courier New', monospace",
    fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "1px",
  });

  // Portrait
  const img = root.querySelector(".message-header img");
  if (img) Object.assign(img.style, {
    width: "28px", height: "28px",
    border: "1px solid rgba(200,168,75,0.4)", borderRadius: "0",
    objectFit: "cover", flexShrink: "0",
    clipPath: "polygon(0 0, 88% 0, 100% 12%, 100% 100%, 12% 100%, 0 88%)",
  });

  // ── Message content ──
  const content = root.querySelector(".message-content");
  if (content) Object.assign(content.style, {
    fontSize: "12px", color: "#b0b8c8", lineHeight: "1.5",
  });

  // Flavor
  const flavor = root.querySelector(".flavor-text, .flavor");
  if (flavor) Object.assign(flavor.style, {
    fontStyle: "italic", color: "rgba(200,168,75,0.6)",
    fontSize: "11px", letterSpacing: "0.5px", marginBottom: "4px",
  });

  // ── Inline dice rewrite ──
  _dbtRewriteDice(msg, root);
}

function _dbtRewriteDice(msg, root) {
  if (!msg.rolls?.length) return;

  // Remove existing dice-roll sections
  root.querySelectorAll(".dice-roll").forEach(el => el.remove());

  for (const roll of msg.rolls) {
    // Build inline dice string: [d1, d2, d3] + modifiers = TOTAL
    const diceGroups = [];
    for (const term of (roll.terms ?? [])) {
      if (term.results) {
        // Die term — show each face value
        const faces = term.results.map(r => {
          const isMax = r.result === term.faces;
          const isMin = r.result === 1;
          const color = isMax ? "#2ecc71" : isMin ? "#e05555" : "#d4d8e0";
          return `<span style="color:${color};font-weight:700">${r.result}</span>`;
        });
        diceGroups.push(`<span style="font-family:'Courier New',monospace;font-size:11px;color:#8090a8">${term.number}d${term.faces}[</span>${faces.join('<span style="color:#555">,</span>')}<span style="font-family:'Courier New',monospace;font-size:11px;color:#8090a8">]</span>`);
      } else if (typeof term.operator === "string") {
        diceGroups.push(`<span style="color:rgba(200,168,75,0.6);font-family:'Courier New',monospace">${term.operator}</span>`);
      } else if (term.number !== undefined && !term.results) {
        diceGroups.push(`<span style="color:#8090a8;font-family:'Courier New',monospace">${term.number}</span>`);
      }
    }

    const total = roll.total;
    const isNat20 = roll.terms?.[0]?.faces === 20 && roll.terms?.[0]?.results?.[0]?.result === 20;
    const isNat1  = roll.terms?.[0]?.faces === 20 && roll.terms?.[0]?.results?.[0]?.result === 1;
    const totalColor = isNat20 ? "#2ecc71" : isNat1 ? "#e05555" : "#e8c86a";
    const totalGlow  = isNat20 ? "0 0 12px rgba(46,204,113,0.7)" : isNat1 ? "0 0 12px rgba(224,80,80,0.7)" : "0 0 10px rgba(200,168,75,0.5)";

    const div = document.createElement("div");
    div.style.cssText = `
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(200,168,75,0.15);
      border-top: 2px solid rgba(200,168,75,0.5);
      padding: 6px 8px; margin-top: 4px;
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    `;
    div.innerHTML = `
      ${diceGroups.join(" ")}
      <span style="color:rgba(200,168,75,0.4);font-family:'Courier New',monospace;font-size:13px">=</span>
      <span style="
        font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:2px;
        color:${totalColor}; text-shadow:${totalGlow};
      ">${total}</span>
    `;
    const content = root.querySelector(".message-content");
    if (content) content.appendChild(div);
    else root.appendChild(div);
  }
}

// ═══════════════════════════════════════════════════════════
//  DIALOG / WINDOW STYLING
// ═══════════════════════════════════════════════════════════

function _dbtInjectDialogStyles() {
  if (document.getElementById("dbt-dialog-styles")) return;
  const style = document.createElement("style");
  style.id = "dbt-dialog-styles";
  style.textContent = `
    /* ── DBT-own popups only (shop, ability check, etc.) ── */
    .db-shop-app .window-header,
    .db-ability-check-panel .window-header,
    .db-shop-tables-app .window-header {
      background: linear-gradient(90deg, rgba(200,168,75,0.12) 0%, transparent 60%) !important;
      border-bottom: 2px solid rgba(200,168,75,0.4) !important;
    }
    /* ── Notifications only ── */
    #notifications .notification {
      background: #0d0f14 !important;
      border-left: 3px solid rgba(200,168,75,0.6) !important;
      border-radius: 0 !important;
      color: #b0b8c8 !important;
      font-family: 'Bebas Neue', 'Arial Narrow', sans-serif !important;
      letter-spacing: 1px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important;
    }
    #notifications .notification.error   { border-left-color: rgba(192,57,43,0.9) !important; }
    #notifications .notification.warning { border-left-color: rgba(230,126,34,0.9) !important; }
    #notifications .notification.info    { border-left-color: rgba(52,152,219,0.9) !important; }
  `;
  document.head.appendChild(style);
}

