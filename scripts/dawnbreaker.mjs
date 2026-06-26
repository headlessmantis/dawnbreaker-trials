// ═══════════════════════════════════════════════════════════
//  DAWNBREAKER TRIALS — Foundry VTT System
// ═══════════════════════════════════════════════════════════

// ── STAT CALCULATION HELPERS ─────────────────────────────────
function statMod(base) {
  return Math.floor(base / 3) - 3;
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
        shortbow:   new fields.NumberField({ ...req, initial: 0, integer: true, min: 0 }),
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
    // Inject equipped item bonuses into system data before derived data runs
    if (this.type === "character" && this.system) {
      const eb = { dam:0, str:0, con:0, agi:0, dex:0, int:0, spr:0,
                   for:0, wil:0, cha:0, mv:0,  ap:0,  ass:0, pr:0,
                   brk:0, mr:0,  ar:0,  hp:0,  ki:0 };
      for (const item of this.items) {
        const s = item.system;
        if (!s?.equipped || !s?.bonuses) continue;
        for (const key of Object.keys(eb)) eb[key] += (s.bonuses[key] ?? 0);
      }
      this.system._equippedBonuses = eb;

      // Resolve primary equipped weapon (weapon > offhand) for macros to read
      const pw = this.items.find(i => i.type === "weapon" && i.system?.equipped)
              ?? this.items.find(i => i.type === "offhand" && i.system?.equipped)
              ?? null;
      this.system._equippedWeapon = pw ? {
        id:             pw.id,
        name:           pw.name,
        weaponType:     pw.system.weaponType ?? "",
        attackStat:     pw.system.attackStat ?? "STR",
        reach:          pw.system.reach      ?? 1,
        dam:            pw.system.bonuses?.dam ?? 0,
        animationFile:  pw.system.animationFile  ?? "",
        animationScale: pw.system.animationScale ?? 1.0,
        animationSound: pw.system.animationSound ?? "",
      } : null;
    }
    super.prepareData();

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

    // Sync status effects whenever conditions change
    const newConditions = foundry.utils.getProperty(data, "system.conditions");
    if (!newConditions) return;

    const token = canvas.tokens?.placeables?.find(t => t.actor?.id === this.id);
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

    if (this.type !== "character") return data;

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

    // ── Equipped weapon info ──
    const equippedWeapon = this.items.find(i => i.type === "weapon" && i.system?.equipped)
                        ?? this.items.find(i => i.type === "offhand" && i.system?.equipped);
    if (equippedWeapon) {
      const wt  = equippedWeapon.system.weaponType ?? "";
      const atk = equippedWeapon.system.attackStat ?? "STR";
      const dam = equippedWeapon.system.bonuses?.dam ?? 0;
      const profLevel = s.weaponProf?.[wt] ?? 0;
      data.weapon = {
        name:            equippedWeapon.name,
        type:            wt,
        attackStat:      atk,
        dam:             dam,
        profLevel:       profLevel,
        profBonus:       profLevel,       // ATK/DMG +1 per level
        atkBonus:        profLevel,
        dmgBonus:        dam + profLevel, // base DAM + prof DMG bonus
        hpDmgBonus:      profLevel,       // final HP damage +1 per level
        attackStatTotal: data[atk.toLowerCase()]?.total ?? 0,
      };
    } else {
      data.weapon = { name:"", type:"", attackStat:"", dam:0, profLevel:0, profBonus:0, atkBonus:0, dmgBonus:0, hpDmgBonus:0, attackStatTotal:0 };
    }

    return data;
  }
}


class DawnbreakerActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dawnbreaker", "sheet", "actor"],
      template: "systems/dawnbreaker-trials/templates/actor-sheet.html",
      width: 750,
      height: 950,
      tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "core" }],
      scrollY: [".sheet-body.active"],
    });
  }

  getData() {
    const context = super.getData();
    const actor = this.actor;
    context.system = actor.system;
    context.theme  = actor.system.theme ?? "default";

    // Pass owned items sorted by type for the equipment tab
    const allItems = actor.items.contents.map((i, idx) => ({
      id:        i.id,
      name:      i.name,
      img:       i.img,
      type:      i.type,
      equipped:  i.system.equipped ?? false,
      qty:       i.system.qty ?? 1,
      weaponType: i.system.weaponType ?? "",
      attackStat: i.system.attackStat ?? "",
      dam:        i.system.bonuses?.dam ?? 0,
      effect:     i.system.effect ?? i.system.desc ?? "",
      armorSlot:  i.system.slot ?? i.system.armorSlot ?? "",
      isWeapon:   ["weapon","offhand"].includes(i.type),
      isArmor:    i.type === "armor",
      isAbility:  i.type === "ability",
      globalIndex: idx + 1,
    }));
    context.ownedItems = allItems;
    context.weapons    = allItems.filter(i => i.isWeapon);
    context.armors     = allItems.filter(i => i.isArmor);
    context.abilities  = allItems.filter(i => i.isAbility);
    context.otherItems = allItems.filter(i => !i.isWeapon && !i.isArmor && !i.isAbility);

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
      const b = item.system.bonuses ?? {};
      for (const [k, v] of Object.entries(b)) { if (v && v !== 0) bonusLines.push(`${k.toUpperCase()} +${v}`); }
      if (!paperdoll[key]) {
        paperdoll[key] = { id: item.id, name: item.name, img: item.img, bonuses: bonusLines.join(" | ") };
      }
    }
    context.paperdoll = paperdoll;

    return context;
  }

  get template() {
    return "systems/dawnbreaker-trials/templates/actor-sheet.html";
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
      item?.sheet.render(true);
    });

    // Equip toggle
    html.find(".item-equip-toggle").change(ev => {
      const id      = ev.currentTarget.closest("[data-item-id]").dataset.itemId;
      const equipped = ev.currentTarget.checked;
      this.actor.items.get(id)?.update({ "system.equipped": equipped });
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
    html.find(".roll-btn").click(ev => {
      const type  = ev.currentTarget.dataset.type;
      const index = parseInt(ev.currentTarget.dataset.index);
      const path  = this._typePath(type);
      const list  = foundry.utils.getProperty(this.actor.system, path) ?? [];
      const entry = list[index];
      if (!entry) return;
      _executeMacroOrRoll(entry.macroName ?? entry.name, entry.rollFormula ?? "", this.actor, { name: entry.name });
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
      if ($(ev.target).hasClass("pd-unequip")) return;
      const itemId = ev.currentTarget.dataset.itemId;
      if (!itemId) return;
      const item = this.actor.items.get(itemId);
      item?.sheet?.render(true);
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

      // Named animation slots — keyed by event name (e.g. "burrow", "surface", "shell-shatter")
      animationSlots: new fields.ArrayField(new fields.SchemaField({
        name:  new fields.StringField({ initial: "" }),
        file:  new fields.StringField({ initial: "" }),
        scale: new fields.NumberField({ required: false, nullable: true, initial: 1.0 }),
        sound: new fields.StringField({ initial: "" }),
      })),

      ctbAP:          new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      reach:          new fields.NumberField({ required: true, nullable: false, initial: 1, integer: true, min: 1 }),
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

  getData() {
    const context = super.getData();
    context.system = this.actor.system;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find(".add-row").click(ev => {
      const type = ev.currentTarget.dataset.type;
      this._addRow(type);
    });

    html.find(".del-row").click(ev => {
      const type  = ev.currentTarget.dataset.type;
      const index = parseInt(ev.currentTarget.dataset.index);
      this._deleteRow(type, index);
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
}

// ── REGISTER ─────────────────────────────────────────────────
Hooks.once("ready", () => {

  // ── Socket listener ──────────────────────────────────────
  game.socket.on("system.dawnbreaker-trials", async (data) => {
    if (!game.user.isGM && !game.actors.get(data.actorId)?.isOwner) return;
    if (game.user.isGM || !game.users.find(u => u.isGM && u.active)) {
      const actor = game.actors.get(data.actorId);
      if (!actor) return;
      if (data.type === "applyDamage") {
        await actor.update({ "system.hp.current": data.newHP });
      } else if (data.type === "applyARDamage") {
        await actor.update({ "system.ar.current": data.newAR });
      }
    }

    // ── Ki Shield prompt — sent to target's owner ──────────
    if (data.type === "kiShieldPrompt" && !game.user.isGM) {
      const actor = game.actors.get(data.actorId);
      if (!actor?.isOwner) return;

      const currentKI  = actor.system.ki?.current ?? 0;
      const incomingDmg = data.incomingDamage;

      new (foundry.appv1?.applications?.Dialog ?? Dialog)({
        title: "⚡ Ki Shield — Reaction",
        content: `
          <style>
            .ki-shield-form { font-family:sans-serif; font-size:13px; padding:4px; }
            .ki-info { background:#1a2030; border:1px solid #64b5f6; border-radius:4px; padding:8px 10px; margin-bottom:8px; color:#d4d8e0; }
            .ki-info b { color:#64d4ff; }
            .ki-row { display:grid; grid-template-columns:1fr 80px; align-items:center; gap:6px; margin-top:8px; }
            .ki-row label { color:#d4d8e0; }
            .ki-row input { background:#2a2d33; border:1px solid #3a3f4a; color:#d4d8e0; border-radius:3px; padding:3px 6px; width:100%; box-sizing:border-box; text-align:center; }
          </style>
          <form class="ki-shield-form">
            <div class="ki-info">
              ⚡ <b>Ki Shield</b> — Reaction<br/>
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
              const kiSpend   = Math.min(Math.max(0, parseInt(html.find("#ki-spend").val()) || 0), Math.min(currentKI, incomingDmg));
              const newKI     = Math.max(0, currentKI - kiSpend);
              const reducedDmg = Math.max(0, incomingDmg - kiSpend);
              await actor.update({ "system.ki.current": newKI });
              await ChatMessage.create({
                content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">
                  ⚡ <b>${actor.name}</b> used Ki Shield — spent <span style="color:#64d4ff;font-weight:700;">${kiSpend} KI</span>.
                  Damage reduced: <span style="color:#e57373;">${incomingDmg}</span> → <span style="color:#81c784;font-weight:700;">${reducedDmg}</span>
                </div>`
              });
              // Send reduced damage back to GM to apply
              game.socket.emit("system.dawnbreaker-trials", {
                type: "kiShieldResolved",
                actorId: data.actorId,
                reducedDamage: reducedDmg,
                attackType: data.attackType,
                requestId: data.requestId,
              });
            }
          },
          skip: {
            label: "Don't Use",
            callback: () => {
              // Send full damage back to GM
              game.socket.emit("system.dawnbreaker-trials", {
                type: "kiShieldResolved",
                actorId: data.actorId,
                reducedDamage: incomingDmg,
                attackType: data.attackType,
                requestId: data.requestId,
              });
            }
          }
        },
        default: "use",
      }).render(true);
    }

    // ── Ki Shield resolved — GM applies final damage ────────
    if (data.type === "kiShieldResolved" && game.user.isGM) {
      const actor = game.actors.get(data.actorId);
      if (!actor) return;
      const currentHP = actor.system.hp?.current ?? 0;
      const newHP     = Math.max(0, currentHP - data.reducedDamage);
      await actor.update({ "system.hp.current": newHP });
      if (newHP <= 0) {
        await CastQueue.cancelForActor(actor.id, "was downed");
        await _applyDownCondition(actor);
      }
      if (data.attackType) await _checkReactiveItems(actor, data.attackType);
    }
  });

  // ── Register last attack type setting ───────────────────
  game.settings.register("dawnbreaker-trials", "lastAttackType", {
    scope: "world", config: false, type: String, default: "physical",
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
      "system.bonuses.pr": newMode === "physical" ? 5 : 0,
      "system.bonuses.mr": newMode === "magical"  ? 5 : 0,
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
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "item-details" }],
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
//  MOVEMENT RANGE HIGHLIGHT
// ═══════════════════════════════════════════════════════════
const CTB_MOVE_LAYER = "crucible.movement";

function _getMVTotal(actor) {
  if (actor.type === "npc") return actor.system.stats?.MV ?? 3;
  return actor.system.stats?.MV?.total ?? 3;
}

async function _showMovementRange(token) {
  if (!canvas.interface?.grid) return;
  const actor = token.actor;
  if (!actor) return;
  const mv   = _getMVTotal(actor);
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
      const blocked = allTokens.some(t => {
        if (isAlly(t)) return false;
        return Math.round(t.document.x/size) === n.x && Math.round(t.document.y/size) === n.y;
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
}

async function _clearMovementRange() {
  canvas.interface?.grid?.clearHighlightLayer(CTB_MOVE_LAYER);
}

Hooks.on("updateToken", async (tokenDoc, changes) => {
  if (changes.x !== undefined || changes.y !== undefined) await _clearMovementRange();

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
            await window._dbApplyDamage({ type: "applyDamage", actorId: actor.id, newHP: Math.max(0, cur - val), attackType: "physical" });
          } else if (stat === "ar") {
            const cur = actor.system.ar?.current ?? 0;
            await window._dbApplyDamage({ type: "applyARDamage", actorId: actor.id, newAR: Math.max(0, cur - val), attackType: "physical" });
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
  const token = canvas.tokens?.placeables?.find(t => t.actor?.id === actor.id);
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
        await CastQueue.cancelForActor(actor.id, `gained ${newC.name}`);
      }
    }
  }
  for (const oldC of oldConditions) {
    if (!oldC.label) continue;
    if (!newConditions.some(n => n.name === oldC.name && n.label === oldC.label))
      await _applyStatusEffect(actor, oldC.label, false);
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
      await item.update({ "system.bonuses.pr": newMode === "physical" ? 5 : 0, "system.bonuses.mr": newMode === "magical" ? 5 : 0, "system.effect": `mode:${newMode}` });
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid ${modeColor};border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🐍 <b>Scorpid Scales</b> — ${actor.name} switches to ${newMode === "physical" ? "Physical (+5 PR)" : "Magical (+5 MR)"} resistance.</div>` });
    }
  }
}

// Apply Down condition when HP hits 0
async function _applyDownCondition(actor) {
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
  conditions.push({ name: "Down", label: "down", duration: 3, effect: "Unit is incapacitated. Removed from combat after 3 turns." });
  await actor.update({ "system.conditions": conditions });
  await _applyStatusEffect(actor, "down", true);
  await ChatMessage.create({
    content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">☠ <b>${actor.name}</b> is <span style="color:#e05555;font-weight:700;">Down!</span> — 3 turns remaining before removal from combat.</div>`
  });

  // Sacrificial Lamb — check if any adjacent ally Adept can spend KI to revive
  if (!canvas?.tokens?.placeables) return;
  const downToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
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
        // Sends socket prompt to owner — damage applied asynchronously via kiShieldResolved
        game.socket.emit("system.dawnbreaker-trials", {
          type: "kiShieldPrompt", actorId: actor.id,
          incomingDamage: dmg, attackType,
          requestId: foundry.utils.randomID(),
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
        const targetToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
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
        const targetToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
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
            await CastQueue.cancelForActor(dtActor.id, "was downed");
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
      handler: async (actor, dmg, attackType) => {
        // Find the attacker — scan for the most recent attacker token
        // We pass attackType context but need attacker token from canvas
        // Counter fires after damage is received — find enemy tokens in weapon reach
        const defenderToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
        if (!defenderToken) return dmg;

        const size        = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
        const dx2         = Math.round(defenderToken.document.x / size);
        const dy2         = Math.round(defenderToken.document.y / size);
        const defDisp     = defenderToken.document.disposition;
        const weaponReach = actor.items.find(i => ["weapon","offhand"].includes(i.type) && i.system.equipped)?.system?.reach ?? 1;

        // Find adjacent enemies within weapon reach
        const adjacentEnemies = canvas.tokens.placeables.filter(t => {
          if (!t.actor || t.document.disposition === defDisp) return false;
          const ex = Math.round(t.document.x / size);
          const ey = Math.round(t.document.y / size);
          return Math.abs(ex - dx2) + Math.abs(ey - dy2) <= weaponReach;
        });

        for (const attackerToken of adjacentEnemies) {
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
          const cData   = { type: "applyDamage", actorId: targetActor.id, newHP, attackType: "physical" };
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
        game.socket.emit("system.dawnbreaker-trials", {
          type: "soulboundGalePrompt", actorId: actor.id,
          incomingDamage: dmg, attackType,
          requestId: foundry.utils.randomID(),
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
      async handler(actor, finalNewAR, attackType, sourceActorId) {
        await actor.setFlag("dawnbreaker-trials", "shellUsed", true);
        // BP1 side effects: PR 12 → 6, apply weakened as visual indicator
        await actor.update({ "system.stats.PR": 6 });
        const bp1Conds = foundry.utils.deepClone(actor.system.conditions ?? []);
        if (!bp1Conds.some(c => c.name === "weakened")) {
          bp1Conds.push({ name: "weakened", label: "weakened", duration: 999, instance: 0, effect: "" });
          await actor.update({ "system.conditions": bp1Conds });
          await _applyStatusEffect(actor, "weakened", true);
        }
        // Counter: 8 flat AR to the BRK attacker who cracked the shell
        if (sourceActorId) {
          const srcToken = canvas.tokens?.placeables?.find(t => t.actor?.id === sourceActorId);
          const srcActor = srcToken?.actor ?? game.actors.get(sourceActorId);
          if (srcActor) {
            const curAR = srcActor.system.ar?.current ?? 0;
            const newAR = Math.max(0, curAR - 8);
            await window._dbApplyDamage({ type: "applyARDamage", actorId: srcActor.id, newAR, attackType: "physical", sourceActorId: actor.id });
            await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:13px;font-weight:700;color:#64b5f6;border-bottom:1px solid #3a3f4a;padding-bottom:4px;margin-bottom:8px;">💎 Crystal Shell — ${actor.name} CRACKS!</div><div style="font-size:12px;"><b>${srcActor.name}</b> takes <span style="color:#e57373;font-weight:700;">8 AR damage</span> from the shard spray!</div><div style="font-size:12px;margin-top:4px;">⚠ ${actor.name} PR reduced: 12 → 6. Shell is compromised.</div></div>` });
          }
        }
        // Crystal Crack animation (slot: "shell-crack")
        const crackToken = canvas.tokens?.placeables?.find(t => t.actor?.id === actor.id);
        const crackSlot  = _getNPCAnimSlot(actor, "shell-crack");
        if (crackSlot?.file && crackToken) await window._playHitAnimation(crackToken, crackSlot.file, crackSlot.scale ?? 1.0, crackSlot.sound ?? "");
        return finalNewAR;
      },
    },
  ],
};

// Run all matching reactions for a trigger — returns { handled: bool, finalDmg: number }
async function _runReactions(trigger, actor, dmg, attackType, sourceActorId = null) {
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
    const result = await reaction.handler(actor, dmg, attackType, sourceActorId);
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
async function _handleCrystalBurrowerBreakpoints(actor, oldAR, newAR) {
  if (!actor.name?.toLowerCase().includes("crystal burrower")) return;
  if (newAR !== 0 || oldAR === 0) return;
  if (actor.getFlag("dawnbreaker-trials", "shatterUsed")) return;
  await actor.setFlag("dawnbreaker-trials", "shatterUsed", true);

  // Shard Burst — 8 flat HP to ALL tokens within 2 tiles (no resistance)
  const bToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
  const shardHit = [];
  if (bToken) {
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    const bx   = Math.round(bToken.document.x / size);
    const by   = Math.round(bToken.document.y / size);
    for (const t of canvas.tokens.placeables) {
      if (!t.actor || t.actor.id === actor.id) continue;
      const tx = Math.round(t.document.x / size);
      const ty = Math.round(t.document.y / size);
      if (Math.abs(tx - bx) > 2 || Math.abs(ty - by) > 2) continue;
      const curHP = t.actor.system.hp?.current ?? 0;
      const newHP = Math.max(0, curHP - 8);
      await window._dbApplyDamage({ type: "applyDamage", actorId: t.actor.id, newHP, attackType: "physical", sourceActorId: actor.id });
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

window._dbApplyDamage = async (data) => {
  // Resolve token actor first — handles unlinked tokens correctly
  const tokenActor = canvas.tokens?.placeables?.find(t => t.actor?.id === data.actorId)?.actor;
  const actor = tokenActor ?? game.actors.get(data.actorId);
  if (!actor) return;
  if (data.type === "applyDamage") {
    const currentHP  = actor.system.hp?.current ?? 0;
    const rawDamage  = currentHP - data.newHP;

    // Tunnel Ambush — first hit after Burrower surfaces bypasses Guard and HP reactions
    let isTunnelAmbush = false;
    if (data.sourceActorId && rawDamage > 0) {
      const srcTok = canvas.tokens?.placeables?.find(t => t.actor?.id === data.sourceActorId);
      const srcAct = srcTok?.actor ?? game.actors.get(data.sourceActorId);
      if (srcAct?.getFlag("dawnbreaker-trials", "tunnelAmbush")) {
        isTunnelAmbush = true;
        await srcAct.unsetFlag("dawnbreaker-trials", "tunnelAmbush");
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>Tunnel Ambush</b> — ${srcAct.name}'s strike ignores Guard and Reactions!</div>` });
      }
    }

    const reducedDmg = (!isTunnelAmbush && rawDamage > 0) ? await _checkGuardCondition(actor, rawDamage) : rawDamage;
    const adjustedHP = Math.max(0, currentHP - reducedDmg);
    let   finalDmg   = currentHP - adjustedHP;

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
      : await _runReactions("onHpDamage", actor, finalDmg, data.attackType, data.sourceActorId);
    if (handled) return;

    // Moon Guardian — check if any ally has this actor shielded
    let moonDmg = reactionDmg;
    if (moonDmg > 0 && game.user.isGM) {
      const defToken5 = canvas.tokens?.placeables?.find(t => t.actor?.id === actor.id);
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

    // Shimmering Scales — if defender HP < 50% max, incoming damage reduced by 5 (passive)
    if (moonDmg > 0) {
      const hasScales = actor.items?.some(i => i.type === "ability" && i.name.toLowerCase().includes("shimmering scales"))
        || Object.values(actor.system.abilities ?? {}).some(arr => Array.isArray(arr) && arr.some(a => a.name?.toLowerCase().includes("shimmering scales")));
      if (hasScales) {
        const scalesHP    = actor.system.hp?.current ?? 0;
        const scalesHPMax = actor.system.hp?.max ?? scalesHP;
        if (scalesHPMax > 0 && scalesHP / scalesHPMax < 0.5) {
          const before = moonDmg;
          moonDmg = Math.max(1, moonDmg - 5);
          if (moonDmg < before) await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:4px;padding:4px 10px;font-family:sans-serif;font-size:11px;color:#d4d8e0;">✨ <b>Shimmering Scales</b> — ${actor.name} reduces incoming damage by 5 (HP below 50%)</div>` });
        }
      }
    }

    const newHP = Math.max(0, currentHP - moonDmg);
    await actor.update({ "system.hp.current": newHP });
    if (newHP <= 0) {
      await CastQueue.cancelForActor(actor.id, "was downed");
      await _applyDownCondition(actor);
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
      const sourceActor = canvas.tokens?.placeables?.find(t => t.actor?.id === data.sourceActorId)?.actor
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
      const defenderToken4 = canvas.tokens?.placeables?.find(t => t.actor?.id === actor.id);
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
      const attackerToken3 = canvas.tokens?.placeables?.find(t => t.actor?.id === data.sourceActorId);
      const defenderToken3 = canvas.tokens?.placeables?.find(t => t.actor?.id === actor.id);
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
          await window._dbApplyDamage({ type: "applyARDamage", actorId: attackerToken3.actor.id, sourceActorId: cfActor.id, newAR: newAR2, attackType: "physical" });
          const cfAP = cfActor.system.ctbAP ?? 0;
          await cfActor.update({ "system.ctbAP": Math.max(-100, cfAP - 30) });
        }
      }
    }

    // Light Aura — cancel if caster takes HP damage
    if (reactionDmg > 0 && game.user.isGM) {
      const laData = actor.getFlag("dawnbreaker-trials", "lightAura");
      if (laData?.active) {
        await actor.unsetFlag("dawnbreaker-trials", "lightAura");
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #3a3f4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#7a8090;">✨ <b>Light Aura</b> — ${actor.name} took damage. Light Aura cancelled!</div>` });
      }
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
    const { handled, finalDmg: reactionAR } = await _runReactions("onArDamage", actor, finalNewAR, data.attackType, data.sourceActorId);
    if (handled) return;
    const actualARDmg = currentAR - reactionAR;
    await actor.update({ "system.ar.current": reactionAR });
    await _handleCrystalBurrowerBreakpoints(actor, currentAR, reactionAR);

    // Stoic Stance — track AR damage taken
    const stoicDataAR = actor.getFlag("dawnbreaker-trials", "stoicDamage");
    if (stoicDataAR?.active && actualARDmg > 0) {
      await actor.setFlag("dawnbreaker-trials", "stoicDamage", { ...stoicDataAR, ar: (stoicDataAR.ar ?? 0) + actualARDmg });
    }

    // Rememberance — track AR damage DEALT by haunted actor
    if (actualARDmg > 0 && data.sourceActorId) {
      const sourceActor = canvas.tokens?.placeables?.find(t => t.actor?.id === data.sourceActorId)?.actor
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
const CastQueue = {
  SETTING: "castQueueState",
  getQueue() { try { return game.settings.get("dawnbreaker-trials", CastQueue.SETTING) ?? []; } catch(e) { return []; } },
  async setQueue(queue) {
    await game.settings.set("dawnbreaker-trials", CastQueue.SETTING, queue);
    game.socket.emit("system.dawnbreaker-trials", { type: "castQueueUpdate", queue });
  },
  async queue({ actorId, targetId, abilityName, abilityIcon, castSpeed, attackType, formula, apCost, kiCost, targetX, targetY, aoeRange, aoeShape, animFile, animScale, animSound }) {
    const queue = CastQueue.getQueue();
    const entry = {
      id: foundry.utils.randomID(), actorId, targetId, abilityName,
      abilityIcon: abilityIcon ?? "⚡", castSpeed, apCurrent: 0, apTotal: castSpeed,
      attackType: attackType ?? "physical", formula: formula ?? "",
      apCost: apCost ?? 0, kiCost: kiCost ?? 0,
      targetX: targetX ?? null, targetY: targetY ?? null,
      aoeRange: aoeRange ?? 0, aoeShape: aoeShape ?? "circle",
      animFile: animFile ?? "", animScale: animScale ?? 1.0, animSound: animSound ?? "",
    };
    queue.push(entry);
    await CastQueue.setQueue(queue);
    const casterToken = canvas.tokens.placeables.find(t => t.actor?.id === actorId);
    if (casterToken) await casterToken.document.update({ "texture.ring.colors.ring": "#00aaff" });
    const caster = game.actors.get(actorId);
    const target = game.actors.get(targetId);
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #00aaff;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:13px;font-weight:700;color:#64d4ff;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #3a3f4a;padding-bottom:5px;margin-bottom:8px;">⚡ ${abilityIcon} ${abilityName} — Casting</div><table style="width:100%;font-size:12px;border-collapse:collapse;"><tr><td style="color:#7a8090;padding:2px 4px;">Caster</td><td style="text-align:right;">${caster?.name ?? "Unknown"}</td></tr><tr><td style="color:#7a8090;padding:2px 4px;">Target</td><td style="text-align:right;">${target?.name ?? "Unknown"}</td></tr><tr><td style="color:#7a8090;padding:2px 4px;">Cast Speed</td><td style="text-align:right;color:#64d4ff;">${castSpeed} AP / tick</td></tr></table></div>` });
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
    const caster = game.actors.get(entry.actorId);
    const target = game.actors.get(entry.targetId);
    const casterToken = canvas.tokens.placeables.find(t => t.actor?.id === entry.actorId);
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
      }).map(t => t.actor);
      if (!resolvedTargets.length) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e07a30;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>${entry.abilityName}</b> resolved but no targets remain in area.</div>` });
        return;
      }
    } else {
      if (!target || (target.system.hp?.current ?? 0) <= 0) {
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>${entry.abilityName}</b> fizzled — target no longer valid.</div>` });
        return;
      }
      resolvedTargets = [target];
    }
    const targetNames = resolvedTargets.map(a => a.name).join(", ");
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64d4ff;border-radius:6px;padding:10px;font-family:sans-serif;color:#d4d8e0;"><div style="font-size:13px;font-weight:700;color:#64d4ff;border-bottom:1px solid #3a3f4a;padding-bottom:5px;margin-bottom:8px;">⚡ ${entry.abilityIcon} ${entry.abilityName} — Resolves!</div><div style="font-size:12px;color:#7a8090;">${caster?.name} → ${targetNames}</div></div>` });
    if (entry.formula && caster) {
      for (const targetActor of resolvedTargets) {
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
            const dmgData = { type: "applyDamage", actorId: targetActor.id, newHP, attackType: entry.attackType };
            await window._dbApplyDamage(dmgData);
            await dmgRoll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: caster }), flavor: `${entry.abilityName} — Damage → ${targetActor.name}` });
          }
        } catch(e) { console.warn("CastQueue | Formula failed:", e); }
      }
    }
    if (entry.animFile && window._playHitAnimation) {
      const casterToken2 = canvas.tokens.placeables.find(t => t.actor?.id === entry.actorId);
      for (const targetActor of resolvedTargets) {
        const token = canvas.tokens.placeables.find(t => t.actor?.id === targetActor.id);
        if (token) await window._playHitAnimation(token, entry.animFile, entry.animScale ?? 1.0, entry.animSound ?? "", casterToken2);
      }
    }
  },
  async cancelForActor(actorId, reason) {
    const queue = CastQueue.getQueue();
    const cancelled = queue.filter(e => e.actorId === actorId);
    const remaining = queue.filter(e => e.actorId !== actorId);
    if (!cancelled.length) return;
    await CastQueue.setQueue(remaining);
    const token = canvas.tokens.placeables.find(t => t.actor?.id === actorId);
    if (token) await token.document.update({ "texture.ring.colors.ring": "#000000" });
    const actor = game.actors.get(actorId);
    for (const entry of cancelled) {
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #e05555;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ <b>${entry.abilityName}</b> cancelled — ${actor?.name ?? "Caster"} ${reason ?? "was interrupted"}.</div>` });
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

class CTBDisplay extends foundry.appv1.api.Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { id: "ctb-display", title: "Turn Order", template: "systems/dawnbreaker-trials/templates/ctb-display.html", width: 260, height: "auto", resizable: true, popOut: true, classes: ["ctb-display"], left: 10, top: 60 });
  }
  async _render(force, options) {
    await super._render(force, options);
    if (force) CTBDisplay._anchorToHUD(this);
  }
  static _anchorToHUD(app) {
    const hud = document.querySelector("#ib-hud-layer");
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
      const state   = CTB.getState();
      if (!state.combatants) return;
      const combatant  = state.combatants.find(c => c.actorId === actorId);
      const combatants = state.combatants.filter(c => c.actorId !== actorId);
      await CTB.setState({ ...state, combatants });
      // Clear highlight
      const token = canvas.tokens.placeables.find(t => t.actor?.id === actorId);
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
      // Check if already in combat
      if (state.combatants.some(c => c.actorId === actor.id)) {
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
  static getInstance() { return Object.values(ui.windows ?? {}).find(w => w.id === "ctb-display") ?? Object.values(foundry.applications.instances ?? {}).find(w => w.id === "ctb-display"); }
  static async show() {
    const existing = CTBDisplay.getInstance();
    if (existing) { existing.render(true); return existing; }
    const app = new CTBDisplay(); app.render(true); return app;
  }
  static refresh() { CTBDisplay.getInstance()?.render(false); }
}

const CTBEngine = {
  async startCombat(scene) {
    if (!game.user.isGM) return;
    const tokens = scene?.tokens?.contents ?? canvas.tokens.placeables.map(t => t.document);
    if (!tokens.length) { ui.notifications.warn("No tokens on scene!"); return; }
    const combatants = [];
    for (const tokenDoc of tokens) {
      const actor = tokenDoc.actor;
      if (actor) await (canvas.tokens.placeables.find(t => t.document.id === tokenDoc.id)?.actor ?? actor).update({ "system.ctbAP": 0 });
    }
    for (const tokenDoc of tokens) {
      const actor = tokenDoc.actor;
      if (!actor) continue;
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
    if (alreadyActive.length) { await CTB.setState({ ...state, phase: "active", combatants }); CTBDisplay.refresh(); return; }
    const result = CTB.getNextAtTurn(combatants);
    if (!result?.atTurn?.length) return;
    const { atTurn, minTicks } = result;
    combatants = combatants.map(c => ({ ...c, apCurrent: Math.round(c.apCurrent + (c.apTotal * minTicks)) }));
    for (const c of combatants) {
      const token = canvas.tokens.placeables.find(t => t.document?.id === c.tokenId || t.id === c.tokenId);
      const actor = token?.actor ?? game.actors.get(c.actorId);
      if (!actor) continue;
      try { await actor.update({ "system.ctbAP": c.apCurrent }); actor.sheet?.render(false); }
      catch(e) { console.error(`CTB | Failed to update AP for ${c.name}:`, e); }
    }
    await CTB.setState({ ...state, phase: "active", combatants });
    const resolvedCasts = await CastQueue.tickAll(minTicks);
    for (const cast of resolvedCasts) await CastQueue.resolve(cast);
    const names = atTurn.map(c => `<b>${c.name}</b>`).join(", ");
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">⚡ It is now ${names}'s turn!</div>` });
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
        await CTBEngine._onTurnStart(actor, combatants);
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
  async _onTurnStart(actor, combatants) {
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

      // Heal all friendly tokens within range 7
      const healed = [];
      const healedTokens = [];
      for (const t of canvas.tokens.placeables) {
        if (!t.actor || t.document.disposition !== beaconDisp) continue;
        if (t.actor.id === actor.id) continue;
        const dist = Math.abs(Math.round(t.document.x/size) - Math.round(beaconToken.document.x/size))
                   + Math.abs(Math.round(t.document.y/size) - Math.round(beaconToken.document.y/size));
        if (dist > BEACON_RANGE) continue;
        const tActor  = t.actor;
        const curHP   = tActor.system.hp?.current ?? 0;
        const maxHP   = tActor.system.hp?.max ?? curHP;
        const curAR   = tActor.system.ar?.current ?? 0;
        const maxAR   = tActor.system.ar?.max ?? curAR;
        const newHP   = Math.min(maxHP, curHP + 2);
        const newAR   = Math.min(maxAR, curAR + 1);
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
      const bToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
      if (bToken) {
        const size       = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
        const bx         = Math.round(bToken.document.x / size);
        const by         = Math.round(bToken.document.y / size);
        const nearTokens = canvas.tokens.placeables.filter(t => {
          if (!t.actor || t.actor.id === actor.id) return false;
          const tx = Math.round(t.document.x / size);
          const ty = Math.round(t.document.y / size);
          return Math.abs(tx - bx) <= 1 && Math.abs(ty - by) <= 1;
        });
        for (const t of nearTokens) {
          const curHP = t.actor.system.hp?.current ?? 0;
          const newHP = Math.max(0, curHP - 8);
          await window._dbApplyDamage({ type: "applyDamage", actorId: t.actor.id, newHP, attackType: "physical", sourceActorId: actor.id });
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
    const remaining = conditions.map(c => {
      // Skip instance-based conditions (duration = 0, instance > 0) — they expire on hit not on turn
      if ((c.duration === 0 || c.duration === null) && (c.instance > 0)) return c;
      return { ...c, duration: (c.duration ?? 0) - 1 };
    }).filter(c => {
      if ((c.duration ?? 0) <= 0 && !(c.instance > 0)) { expired.push(c); return false; }
      return true;
    });
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
          const downActorToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
          const downTokenId    = downActorToken?.document?.id ?? downActorToken?.id;
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
        else game.socket.emit("system.dawnbreaker-trials", { type: "throwApply", actorId: actor.id, updates: { "system.ar.current": newAR } });
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🌿 <b>${c.name}</b> — <b>${actor.name}</b> 🛡 AR: <span style="color:#64b5f6;">${curAR}</span> → <span style="color:${newAR<=0?"#e05555":"#81c784"};font-weight:700;">${newAR}</span> (−${dotAmt})</div>` });
      } else if (dotType === "hp") {
        const curHP = actor.system.hp?.current ?? 0;
        const newHP = Math.max(0, curHP - dotAmt);
        const data  = { type: "applyDamage", actorId: actor.id, newHP, attackType: "magical" };
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
          await window._dbApplyDamage({ type: "applyDamage", actorId: actor.id, newHP, attackType: "magical" });
        }
        if (haunt.ar > 0) {
          const curAR = actor.system.ar?.current ?? 0;
          const newAR = Math.max(0, curAR - haunt.ar);
          await window._dbApplyDamage({ type: "applyARDamage", actorId: actor.id, newAR, attackType: "magical" });
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
      await window._dbApplyDamage({ type: "applyDamage", actorId: actor.id, newHP, attackType: "physical", noBleed: true });
      await actor.setFlag("dawnbreaker-trials", "bleedStacks", bleedStacks - 1);
    }

    // Aim — clear bonus at start of turn (it applied last turn)
    const aimData = actor.getFlag("dawnbreaker-trials", "aimBonus");
    if (aimData?.active) {
      await actor.unsetFlag("dawnbreaker-trials", "aimBonus");
      await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #64b5f6;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">🎯 <b>Aim</b> — ${actor.name}'s Aim bonus has expired.</div>` });
    }

    // Light Aura — deduct 1 KI at start of caster's turn, cancel if KI reaches 0
    const laData = actor.getFlag("dawnbreaker-trials", "lightAura");
    if (laData?.active) {
      const curKI = actor.system.ki?.current ?? 0;
      if (curKI <= 0) {
        await actor.unsetFlag("dawnbreaker-trials", "lightAura");
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #3a3f4a;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#7a8090;">✨ <b>Light Aura</b> — ${actor.name} ran out of KI. Light Aura cancelled!</div>` });
      } else {
        await actor.update({ "system.ki.current": curKI - 1 });
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #a080ff;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">✨ <b>Light Aura</b> — ${actor.name} maintains the aura. KI: ${curKI} → ${curKI - 1}</div>` });
      }
    }

    // Light Aura — apply PR/MR bonus and heal to this actor if any ally has Light Aura active
    if (game.user.isGM) {
      const myToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
      const myDisp  = myToken?.document?.disposition ?? 1;
      for (const laToken of canvas.tokens.placeables) {
        if (!laToken.actor || laToken.actor.id === actor.id) continue;
        if (laToken.document.disposition !== myDisp) continue;
        const laFlag = laToken.actor.getFlag("dawnbreaker-trials", "lightAura");
        if (!laFlag?.active) continue;
        // Check this actor is in range (reach 6)
        const size3 = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
        const dist3 = Math.abs(Math.round(laToken.document.x/size3) - Math.round(myToken?.document?.x/size3))
                    + Math.abs(Math.round(laToken.document.y/size3) - Math.round(myToken?.document?.y/size3));
        if (dist3 > 6) continue;
        // Heal 1 HP or 1 AR (HP first, then AR if HP is full)
        const curHP2  = actor.system.hp?.current ?? 0;
        const maxHP2  = actor.system.hp?.max ?? curHP2;
        const curAR2  = actor.system.ar?.current ?? 0;
        const maxAR2  = actor.system.ar?.max ?? curAR2;
        if (curHP2 < maxHP2) {
          await actor.update({ "system.hp.current": Math.min(maxHP2, curHP2 + 1) });
          await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #a080ff;border-radius:4px;padding:4px 10px;font-family:sans-serif;font-size:11px;color:#d4d8e0;">✨ <b>Light Aura</b> — ${actor.name} ❤ +1 HP</div>` });
        } else if (curAR2 < maxAR2) {
          await actor.update({ "system.ar.current": Math.min(maxAR2, curAR2 + 1) });
          await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #a080ff;border-radius:4px;padding:4px 10px;font-family:sans-serif;font-size:11px;color:#d4d8e0;">✨ <b>Light Aura</b> — ${actor.name} 🛡 +1 AR</div>` });
        }
        break; // only one aura per actor
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
    await _clearMovementRange();
    await CTB.setState({ phase: "idle", combatants: [] });
    CTBDisplay.refresh();
    await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #c8a84b;border-radius:6px;padding:10px;font-family:sans-serif;text-align:center;color:#d4d8e0;"><div style="font-size:16px;font-weight:700;color:#e8c86a;text-transform:uppercase;letter-spacing:2px;">🏳 Combat Ended</div></div>` });

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
    this._reach       = options.reach       ?? 99;
    this._range       = options.range       ?? 0;
    this._shape       = options.shape       ?? "circle";
    this._archingShot = options.archingShot ?? false;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { id: "db-target-selector", title: "Select Target", template: "systems/dawnbreaker-trials/templates/target-selector.html", width: 300, height: "auto", resizable: true, popOut: true, classes: ["db-target-selector"], left: 10, top: 60 });
  }
  async _render(force, options) {
    await super._render(force, options);
    if (force) {
      const ctb = CTBDisplay.getInstance();
      if (ctb?.rendered) {
        const { left, top, width } = ctb.position;
        this.setPosition({ left: left + width + 4, top });
      }
    }
  }
  _tileDistance(tokenA, tokenB) {
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    return Math.abs(Math.round(tokenA.document.x/size) - Math.round(tokenB.document.x/size)) + Math.abs(Math.round(tokenA.document.y/size) - Math.round(tokenB.document.y/size));
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
  _getAffectedTokens(centerToken, allTokens) {
    if (this._range <= 0) return [centerToken];
    const attackerToken = canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
    const aoeTiles = this._getAoETiles(centerToken, attackerToken);
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    return allTokens.filter(t => aoeTiles.has(`${Math.round(t.document.x/size)},${Math.round(t.document.y/size)}`));
  }
  _showAoEPreview(centerToken) {
    canvas.interface.grid.clearHighlightLayer("crucible.aoe");
    canvas.interface.grid.addHighlightLayer("crucible.aoe");
    if (this._range <= 0) return;
    const attackerToken = canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
    const aoeTiles = this._getAoETiles(centerToken, attackerToken);
    const size = canvas.grid.sizeX ?? canvas.grid.size ?? 100;
    for (const tile of aoeTiles) {
      const [tx, ty] = tile.split(",").map(Number);
      canvas.interface.grid.highlightPosition("crucible.aoe", { x: tx*size, y: ty*size, color: 0xffaa00, border: 0xcc7700, alpha: 0.3 });
    }
  }
  _clearAoEPreview() { canvas.interface?.grid?.clearHighlightLayer("crucible.aoe"); }
  _showRangeHighlight() {
    if (!canvas.interface?.grid) return;
    canvas.interface.grid.clearHighlightLayer("crucible.range");
    canvas.interface.grid.addHighlightLayer("crucible.range");
    if (this._reach >= 99) return;
    const attackerToken = canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
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
  _clearRangeHighlight() { canvas.interface?.grid?.clearHighlightLayer("crucible.range"); }
  getData() {
    const attacker = this._attacker, allTokens = canvas.tokens.placeables;
    const attackerToken = allTokens.find(t => t.actor?.id === attacker?.id);
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
      return { tokenId: t.id, name: t.name, img: t.document.texture?.src ?? actor?.img, disposition: t.document.disposition, showStats, inRange: dist <= this._reach && !losBlocked, dist, losBlocked, hp: showStats ? actor?.system?.hp : null, ar: showStats ? actor?.system?.ar : null, ki: showStats ? actor?.system?.ki : null, conditions: actor?.system?.conditions ?? [] };
    };
    const enemies = [], allies = [];
    for (const t of allTokens) {
      if (!t.actor || t.actor.id === attacker?.id) continue;

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
      const attackerToken = canvas.tokens.placeables.find(t => t.actor?.id === this._attacker?.id);
      if (attackerToken && this._tileDistance(attackerToken, token) > this._reach) { ui.notifications.warn(`Out of range!`); return; }
      const affectedTokens = this._getAffectedTokens(token, canvas.tokens.placeables);
      this._clearAoEPreview(); this._clearRangeHighlight();
      if (this._onSelect) await this._onSelect(token, affectedTokens);
      this._skipResolve = true;
      await Application.prototype.close.call(this);
    });
    html.find(".db-target-row").hover(
      (ev) => { const t = canvas.tokens.placeables.find(t => t.id === ev.currentTarget.dataset.tokenId); if (t) { t._onHoverIn?.(ev); if (this._range > 0) this._showAoEPreview(t); } },
      (ev) => { const t = canvas.tokens.placeables.find(t => t.id === ev.currentTarget.dataset.tokenId); t?._onHoverOut?.(ev); this._clearAoEPreview(); }
    );
    setTimeout(() => { canvas.interface?.grid?.clearHighlightLayer("crucible.movement"); this._showRangeHighlight(); console.log(`TargetSelector | Showing range highlight, reach=${this._reach}, attacker=${this._attacker?.name}`); }, 150);
  }
  async close(...args) { this._clearAoEPreview(); this._clearRangeHighlight(); return super.close(...args); }
  static select({ abilityName, abilityDesc, abilityIcon, targetType, attacker, reach, range, shape }) {
    return new Promise((resolve) => {
      const app = new TargetSelector({ abilityName, abilityDesc, abilityIcon, targetType: targetType ?? "enemy", attacker, reach: reach ?? 99, range: range ?? 0, shape: shape ?? "circle", onSelect: (token, affectedTokens) => resolve({ token, affectedTokens }) });
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
window._resolveThrow = async ({ thrower, targetActor, item, distance, hasThrowAbility }) => {
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
      if (stat === "hp") { const cur = targetActor.system.hp?.current ?? 0; const newHP = Math.max(0, cur - val); const dmgData = { type: "applyDamage", actorId: targetActor.id, newHP, attackType: "physical" }; if (game.user.isGM) await window._dbApplyDamage(dmgData); else game.socket.emit("system.dawnbreaker-trials", dmgData); resultLines.push(`❤ HP -${val}`); }
      else if (stat === "ar") { const cur = targetActor.system.ar?.current ?? 0; const newAR = Math.max(0, cur - val); const dmgData = { type: "applyARDamage", actorId: targetActor.id, newAR, attackType: "physical" }; if (game.user.isGM) await window._dbApplyDamage(dmgData); else game.socket.emit("system.dawnbreaker-trials", dmgData); resultLines.push(`🛡 AR -${val}`); }
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
//  INIT HOOK
// ═══════════════════════════════════════════════════════════
Hooks.once("init", () => {
  console.log("Dawnbreaker Trials | Initialising system");
  CONFIG.sounds.dice = "";
  window.CTB                 = CTB;
  window.CTBEngine           = CTBEngine;
  window.CTBDisplay          = CTBDisplay;
  window.TargetSelector      = TargetSelector;
  window.CastQueue           = CastQueue;
  window._showMovementRange  = _showMovementRange;
  window._clearMovementRange = _clearMovementRange;
  // _getAssistBonus already exported above DB_REACTIONS

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

  CONFIG.Actor.dataModels.character = DawnbreakerCharacterData;
  CONFIG.Actor.dataModels.npc       = DawnbreakerNPCData;
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
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, "dawnbreaker-trials", DawnbreakerItemSheet, { types: ["weapon","armor","offhand","consumable","common","special","craft"], makeDefault: true, label: "Dawnbreaker Item Sheet" });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, "dawnbreaker-trials", DawnbreakerAbilitySheet, { types: ["ability"], makeDefault: true, label: "Dawnbreaker Ability Sheet" });
  console.log("Dawnbreaker Trials | Sheets registered");
});

// ═══════════════════════════════════════════════════════════
//  READY HOOK
// ═══════════════════════════════════════════════════════════
Hooks.on("renderApplication", (app, html) => {
  const DialogClass = foundry.appv1?.applications?.Dialog ?? (typeof Dialog !== "undefined" ? Dialog : null);
  if (!DialogClass || !(app instanceof DialogClass)) return;
  // Find the rightmost rendered app to anchor dialogs beside
  const openApps = Object.values(ui.windows ?? {}).filter(w => w.rendered && w.id !== app.id);
  if (!openApps.length) return;
  const rightmost = openApps.reduce((best, w) => {
    const r = (w.position?.left ?? 0) + (w.position?.width ?? 0);
    const b = (best.position?.left ?? 0) + (best.position?.width ?? 0);
    return r > b ? w : best;
  });
  const { left, top, width } = rightmost.position ?? {};
  if (left != null) app.setPosition({ left: left + width + 8, top });
});

Hooks.once("ready", () => {
  game.settings.register("dawnbreaker-trials", "ctbState", { scope: "world", config: false, type: Object, default: {} });
  game.settings.register("dawnbreaker-trials", "castQueueState", { scope: "world", config: false, type: Array, default: [] });
  game.settings.register("dawnbreaker-trials", "trapState", { scope: "world", config: false, type: Array, default: [] });

  game.socket.on("system.dawnbreaker-trials", async (data) => {
    const actor = data.actorId ? game.actors.get(data.actorId) : null;

    // CTB display commands — handle on ALL clients regardless of GM status
    if (data.type === "ctbOpen") {
      await CTBDisplay.show();
      return;
    }
    if (data.type === "ctbUpdate" || data.type === "castQueueUpdate") {
      CTBDisplay.refresh();
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
              game.socket.emit("system.dawnbreaker-trials", { type: "kiShieldResolved", actorId: data.actorId, reducedDamage: reducedDmg, attackType: data.attackType, requestId: data.requestId });
            }
          },
          skip: {
            label: "Don't Use",
            callback: () => {
              game.socket.emit("system.dawnbreaker-trials", { type: "kiShieldResolved", actorId: data.actorId, reducedDamage: incomingDmg, attackType: data.attackType, requestId: data.requestId });
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
      const currentHP = actor.system.hp?.current ?? 0;
      const newHP     = Math.max(0, currentHP - data.reducedDamage);
      await actor.update({ "system.hp.current": newHP });
      if (newHP <= 0) { await CastQueue.cancelForActor(actor.id, "was downed"); await _applyDownCondition(actor); }
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
            game.socket.emit("system.dawnbreaker-trials", { type: "soulboundGaleResolved", actorId: data.actorId, kiSpent, reducedDamage: reduced, attackType: data.attackType, requestId: data.requestId });
          }},
          skip: { label: "Take Full Damage", callback: () => {
            game.socket.emit("system.dawnbreaker-trials", { type: "soulboundGaleResolved", actorId: data.actorId, kiSpent: 0, reducedDamage: data.incomingDamage, attackType: data.attackType, requestId: data.requestId });
          }}
        }, default: "spend"
      }).render(true);
      return;
    }

    if (data.type === "soulboundGaleResolved" && game.user.isGM) {
      const sgActor = game.actors.get(data.actorId);
      if (!sgActor) return;
      if (data.kiSpent > 0) {
        await sgActor.update({ "system.ki.current": Math.max(0, (sgActor.system.ki?.current ?? 0) - data.kiSpent) });
        await ChatMessage.create({ content: `<div style="background:#1a1c20;border:1px solid #81c784;border-radius:4px;padding:6px 10px;font-family:sans-serif;font-size:12px;color:#d4d8e0;">💨 <b>Soulbound Gale</b> — ${sgActor.name} spends ${data.kiSpent} KI to reduce damage by ${data.kiSpent * 2}! (${data.incomingDamage || "?"} → ${data.reducedDamage})</div>` });
      }
      const curHP = sgActor.system.hp?.current ?? 0;
      const newHP = Math.max(0, curHP - data.reducedDamage);
      await sgActor.update({ "system.hp.current": newHP });
      if (newHP <= 0) { await CastQueue.cancelForActor(sgActor.id, "was downed"); await _applyDownCondition(sgActor); }
      return;
    }

    // GM-only handlers that don't require an actor
    if (game.user.isGM) {
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

  // Refresh CTB on resource changes
  Hooks.on("updateActor", async (actor, changes) => {
    if (!game.user.isGM) return;
    const hpChanged         = foundry.utils.getProperty(changes, "system.hp.current") !== undefined;
    const arChanged         = foundry.utils.getProperty(changes, "system.ar.current") !== undefined;
    const kiChanged         = foundry.utils.getProperty(changes, "system.ki.current") !== undefined;
    const conditionsChanged = foundry.utils.getProperty(changes, "system.conditions") !== undefined;
    if (hpChanged || arChanged || kiChanged || conditionsChanged) setTimeout(() => CTBDisplay.refresh(), 100);

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
});
