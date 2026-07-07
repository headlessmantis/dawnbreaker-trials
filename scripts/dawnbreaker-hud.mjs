/**
 * Dawnbreaker Trials — Party HUD + Action Menu
 * Visual theme: Arknights Endfield (dark tactical grid, yellow-gold + cyan)
 *
 * Party HUD:   Always-on panel showing HP/AR/KI bars, PR/MR/AP/CTB badges,
 *              conditions, and turn highlighting for every party member.
 *              Positions itself to the right of the CTB display panel.
 *
 * Action Menu: Ability launcher (Main Actives / Secondary / Movement).
 *              Docks to the top-right of the party HUD when a token is selected.
 *
 * Add / remove actors: right-click actor in Actors directory sidebar.
 * Show / hide:         scene controls toggle (token layer, GM only).
 *
 * Reload: F5 (no schema changes).
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

const NS             = "dawnbreaker-trials";
const PARTY_ROOT_ID  = "dbt-party-root";
const GUEST_ROOT_ID  = "dbt-guest-root";
const HUD_ROOT_ID    = "dbt-hud-root";
const HUD_SUB_ID     = "dbt-hud-sub";

const CATEGORIES = [
  { id: "core",             label: "Core",         icon: "▣", tag: "COR" },
  { id: "mainActives",      label: "Main Actives", icon: "◆", tag: "ACT" },
  { id: "secondaryActives", label: "Secondary",    icon: "◇", tag: "SEC" },
  { id: "movement",         label: "Movement",     icon: "◈", tag: "MOV" },
];

const CORE_MACROS_CHARACTER = [
  { name: "HP Attack",   macroName: "HP Attack",   desc: "Standard physical HP attack" },
  { name: "AR Attack",   macroName: "AR Attack",   desc: "Standard physical AR attack" },
  { name: "Rest",        macroName: "Rest",         desc: "Recover AP by resting" },
  { name: "Scan",        macroName: "Scan",         desc: "Scan an enemy to reveal stats" },
  { name: "Throw Item",  macroName: "Throw Item",   desc: "Throw a consumable item" },
  { name: "Help",        macroName: "Help",         desc: "Assist an ally" },
  { name: "Swap Weapon", macroName: "Swap Weapon",  desc: "Switch active weapon" },
  { name: "Wait",        macroName: "Wait",         desc: "Pass your turn" },
  { name: "Facing",      macroName: "Facing",       desc: "Change token facing direction" },
];

const CORE_MACROS_NPC = [
  { name: "HP Attack",   macroName: "HP Attack",   desc: "Standard physical HP attack" },
  { name: "AR Attack",   macroName: "AR Attack",   desc: "Standard physical AR attack" },
  { name: "Wait",        macroName: "Wait",         desc: "Pass your turn" },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Settings registration
// ─────────────────────────────────────────────────────────────────────────────

Hooks.once("init", () => {
  game.settings.register(NS, "partyHudActors", {
    name: "Party HUD Actor List",
    scope: "world",
    config: false,
    type: Object,
    default: [],
  });

  game.settings.register(NS, "squadCaptain", {
    name: "Squad Captain Actor ID",
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  game.settings.register(NS, "squadDesignation", {
    name: "Squad Designation",
    scope: "world",
    config: false,
    type: String,
    default: "0198",
  });

  game.settings.register(NS, "guestHudActors", {
    name: "Guest HUD Actor List",
    scope: "world",
    config: false,
    type: Object,
    default: [],
  });

  // Per-actor portrait variant config: { [actorId]: { default, bloodied, critical, down, conditions:[{trigger,img}] } }
  game.settings.register(NS, "portraitVariants", {
    name: "Portrait Variants",
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });

  // Context menu hook must be registered at init — it fires at sidebar render time, not on right-click
  Hooks.on("getActorContextOptions", (_app, options) => {
    if (!game.user?.isGM) return;
    options.unshift(
      {
        name: "Add to Squad HUD",
        icon: '<i class="fas fa-user-plus"></i>',
        condition: (li) => { const id = DawnbreakerPartyHUD._liId(li); return !!id && !DawnbreakerPartyHUD.isInParty(id); },
        callback: (li) => { const id = DawnbreakerPartyHUD._liId(li); if (id) DawnbreakerPartyHUD.addActor(id); },
      },
      {
        name: "Remove from Squad HUD",
        icon: '<i class="fas fa-user-minus"></i>',
        condition: (li) => { const id = DawnbreakerPartyHUD._liId(li); return !!id && DawnbreakerPartyHUD.isInParty(id); },
        callback: (li) => { const id = DawnbreakerPartyHUD._liId(li); if (id) DawnbreakerPartyHUD.removeActor(id); },
      },
      {
        name: "Set as Squad Captain",
        icon: '<i class="fas fa-star"></i>',
        condition: (li) => { const id = DawnbreakerPartyHUD._liId(li); return !!id && DawnbreakerPartyHUD.isInParty(id) && DawnbreakerPartyHUD._captainId() !== id; },
        callback: (li) => { const id = DawnbreakerPartyHUD._liId(li); if (id) DawnbreakerPartyHUD.setCaptain(id); },
      },
      {
        name: "Remove Captain",
        icon: '<i class="fas fa-star"></i>',
        condition: (li) => { const id = DawnbreakerPartyHUD._liId(li); return !!id && DawnbreakerPartyHUD._captainId() === id; },
        callback: (li) => { DawnbreakerPartyHUD.setCaptain(""); },
      },
      {
        name: "Add to Guest Panel",
        icon: '<i class="fas fa-user-shield"></i>',
        condition: (li) => { const id = DawnbreakerPartyHUD._liId(li); return !!id && !DawnbreakerPartyHUD.isInParty(id) && !DawnbreakerGuestHUD.isGuest(id); },
        callback: (li) => { const id = DawnbreakerPartyHUD._liId(li); if (id) DawnbreakerGuestHUD.addGuest(id); },
      },
      {
        name: "Remove from Guest Panel",
        icon: '<i class="fas fa-user-shield"></i>',
        condition: (li) => { const id = DawnbreakerPartyHUD._liId(li); return !!id && DawnbreakerGuestHUD.isGuest(id); },
        callback: (li) => { const id = DawnbreakerPartyHUD._liId(li); if (id) DawnbreakerGuestHUD.removeGuest(id); },
      },
      {
        name: "Remove from Combat",
        icon: '<i class="fas fa-times-circle"></i>',
        condition: (li) => {
          const id = DawnbreakerPartyHUD._liId(li);
          if (!id) return false;
          const state = window.CTB?.getState?.() ?? {};
          const inCombat = state.phase === "active" || state.phase === "ticking";
          if (!inCombat) return false;
          return !!(state.combatants ?? []).find(c => c.actorId === id);
        },
        callback: (li) => { const id = DawnbreakerPartyHUD._liId(li); if (id) DawnbreakerPartyHUD.removeFromCombat(id); },
      },
    );
  });

  // Scene controls — GM tools on the Tokens layer.
  // MUST be registered at init: SceneControls builds its controls once, on first
  // render (before "ready" fires in some cases), and caches the result. Registering
  // this hook inside a "ready" callback misses that one-time build, so the tools
  // never appear. See getActorContextOptions above for the same pattern.
  // V14 uses object-keyed controls/tools (controls.tokens, tools:{}); V13 used
  // arrays (controls.find(...), tools.push(...)). Support both.
  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user.isGM) return;

    const isV13Array = Array.isArray(controls);
    const tokenCtrl = isV13Array
      ? controls.find(c => c.name === "token" || c.name === "tokens")
      : (controls.tokens ?? controls.token);
    if (!tokenCtrl?.tools) return;

    // Definitions shared across both API shapes
    const defs = [
      { name: "dbt-party-hud",  title: "Toggle Dawnbreaker Party HUD",                 icon: "fas fa-users",                 toggle: true, active: DawnbreakerPartyHUD.visible, run: (active) => DawnbreakerPartyHUD.setVisible(active) },
      { name: "dbt-inspector",  title: "Inspect selected token — flags & conditions",  icon: "fas fa-magnifying-glass-chart", button: true, run: () => window._dbInspector?.() },
      { name: "dbt-long-rest",  title: "Long Rest — full party recovery (1 Ration)",   icon: "fas fa-campground",            button: true, run: () => window._dbLongRest?.() },
      { name: "dbt-loot",       title: "Distribute loot — Credits, materials, items",  icon: "fas fa-coins",                 button: true, run: () => window._dbLootDistribute?.() },
      { name: "dbt-undo",       title: "Undo last action — restore HP/AR/KI/flags",    icon: "fas fa-rotate-left",           button: true, run: () => window._dbUndo?.() },
    ];

    let order = 100;
    for (const d of defs) {
      if (isV13Array) {
        tokenCtrl.tools.push({
          name: d.name, title: d.title, icon: d.icon,
          ...(d.toggle ? { toggle: true, active: d.active } : { button: true }),
          onClick: d.run,
        });
      } else {
        // V14 object shape — button tools use onChange; toggles use active + onChange(event, active)
        tokenCtrl.tools[d.name] = {
          name: d.name, order: order++, title: d.title, icon: d.icon,
          ...(d.toggle
            ? { toggle: true, active: d.active, onChange: (_e, active) => d.run(active) }
            : { button: true, onChange: () => d.run() }),
        };
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  DawnbreakerPartyHUD  —  party card panel
// ─────────────────────────────────────────────────────────────────────────────

class DawnbreakerPartyHUD {
  static visible          = true;
  static _prevStats       = new Map(); // actorId → { hp, ar, ki }
  static _removedFromCombat       = new Set(); // party actors removed mid-combat; restored after combat
  static _lastActiveTurnTokenId   = null;      // tracks last turn start to avoid re-firing
  static _minimized = localStorage.getItem("dbt-party-hud-minimized") === "1";

  // ── Init ──────────────────────────────────────────────────────────────────

  static initialize() {
    console.log("[DBT HUD] PartyHUD.initialize() called");

    // Live bar/badge updates — linked tokens fire updateActor, unlinked fire updateToken
    // Re-fetch from game.actors to ensure prepareData-derived stats (PR/MR/AP totalKennel) are current.
    Hooks.on("updateActor", (actor) => {
      const fresh = game.actors.get(actor.id) ?? actor;
      // Combat: cards are token-keyed — update every combatant card sharing this actorId.
      // Covers Scanned NPCs and any combat actor that isn't a party member or guest.
      const state = window.CTB?.getState?.() ?? {};
      const combatEntries = (state.combatants ?? []).filter(c => c.actorId === fresh.id);
      if (combatEntries.length) {
        for (const c of combatEntries) {
          const token = canvas?.tokens?.placeables?.find(t => (t.document?.id ?? t.id) === c.tokenId);
          DawnbreakerPartyHUD.updateCard(token?.actor ?? fresh, c.tokenId);
        }
      } else if (DawnbreakerPartyHUD.isInParty(fresh.id)) {
        DawnbreakerPartyHUD.updateCard(fresh);
      }
      if (DawnbreakerGuestHUD.isGuest(fresh.id)) DawnbreakerGuestHUD.updateCard(fresh);
    });

    Hooks.on("updateToken", (tokenDoc, changes) => {
      // Stat/condition changes on unlinked tokens arrive via delta (V14) / actorData (V13)
      if (!changes.delta && !changes.actorData && !changes.name) return;
      const tokenId = tokenDoc.id;
      // Is this token in the current combat list?
      const state = window.CTB?.getState?.() ?? {};
      const combatant = (state.combatants ?? []).find(c => c.tokenId === tokenId);
      // Or is its actor a party member?
      const isPartyActor = DawnbreakerPartyHUD.isInParty(tokenDoc.actorId);
      const isGuest      = DawnbreakerGuestHUD.isGuest(tokenDoc.actorId);
      if (!combatant && !isPartyActor && !isGuest) return;
      const token = canvas?.tokens?.placeables?.find(t => (t.document?.id ?? t.id) === tokenId);
      const actor = token?.actor ?? game.actors.get(tokenDoc.actorId);
      if (!actor) return;
      if (combatant || isPartyActor) DawnbreakerPartyHUD.updateCard(actor, tokenId);
      if (isGuest) DawnbreakerGuestHUD.updateCard(actor);
    });

    // CTB state → full re-render (combat actors join/leave, sort order, turn highlight)
    // Cast queue state → also re-render to show/update/remove cast entries
    Hooks.on("updateSetting", (setting) => {
      const key = String(setting.key ?? "");
      if (key.includes("castQueueState")) { DawnbreakerPartyHUD.render(); return; }
      if (!key.includes("ctbState")) return;
      const state    = window.CTB?.getState?.() ?? {};
      const inCombat = state.phase === "active" || state.phase === "ticking";
      const wasIdle  = !inCombat && state.phase === "idle";
      if (wasIdle) DawnbreakerPartyHUD._onCombatEnd();
      DawnbreakerPartyHUD.render();
      DawnbreakerPartyHUD._onTurnChange(state);
    });

    // CTBDisplay is retired — no snap hook needed

    // Context menu hook registered at init (above) — nothing needed here
    // Scene controls hook (getSceneControlButtons) also registered at init —
    // it must exist before SceneControls' one-time build, which "ready" is too late for.
  }

  // ── Party list ─────────────────────────────────────────────────────────────

  static get _actorIds() {
    return game.settings.get(NS, "partyHudActors") ?? [];
  }

  static get actors() {
    return this._actorIds.map(id => game.actors.get(id)).filter(Boolean);
  }

  static _captainId() {
    try { return game.settings.get(NS, "squadCaptain") ?? ""; } catch(e) { return ""; }
  }

  static async setCaptain(id) {
    await game.settings.set(NS, "squadCaptain", id);
    this.render();
  }

  static isInParty(id) {
    try { return (game.settings.get(NS, "partyHudActors") ?? []).includes(id); }
    catch (e) { return false; }
  }

  /** Extract actor ID from a context menu element — handles jQuery, HTMLElement, V13+V14 attr names */
  static _liId(li) {
    const el = li instanceof HTMLElement ? li : li?.[0];
    if (el) {
      // V14: data-entry-id on the li or an ancestor
      const fromEntry = el.closest?.("[data-entry-id]")?.dataset?.entryId;
      if (fromEntry) return fromEntry;
      // V13: data-document-id
      const fromDoc = el.closest?.("[data-document-id]")?.dataset?.documentId;
      if (fromDoc) return fromDoc;
      // Direct dataset fallback
      if (el.dataset?.entryId)   return el.dataset.entryId;
      if (el.dataset?.documentId) return el.dataset.documentId;
    }
    // jQuery fallback
    if (typeof li?.data === "function") {
      const id = li.data("entryId") ?? li.data("documentId");
      if (id) return String(id);
    }
    return null;
  }

  static async addActor(id) {
    if (this.isInParty(id)) return;
    await game.settings.set(NS, "partyHudActors", [...this._actorIds, id]);
    const actor = game.actors.get(id);
    if (!actor) return;

    const list = document.getElementById("dbt-cards-list");
    if (list) {
      list.insertAdjacentHTML("beforeend", this._buildCardHtml(actor));
      this._storeStats(actor);
      this._updateHeader();
    } else {
      this.render();
    }
    this._updateTurnHighlight();
  }

  static async removeActor(id) {
    const ids = this._actorIds.filter(x => x !== id);
    await game.settings.set(NS, "partyHudActors", ids);
    document.getElementById(`dbt-card-${id}`)?.remove();
    this._prevStats.delete(id);
    this._updateHeader();

    if (!ids.length) this._destroy();
    if (DawnbreakerHUD.currentActor?.id === id) DawnbreakerHUD._destroy();
  }

  static async removeFromCombat(actorId) {
    const state = window.CTB?.getState?.() ?? {};
    if (!state.combatants) return;
    const wasParty = this.isInParty(actorId);
    if (wasParty) this._removedFromCombat.add(actorId);
    state.combatants = state.combatants.filter(c => c.actorId !== actorId);
    await window.CTB?.setState?.(state);
  }

  static async removeFromCombatByToken(tokenId) {
    const state = window.CTB?.getState?.() ?? {};
    if (!state.combatants) return;
    state.combatants = state.combatants.filter(c => c.tokenId !== tokenId);
    await window.CTB?.setState?.(state);
  }

  static async removeCastEntry(castId) {
    try {
      const queue = game.settings.get(NS, "castQueueState") ?? [];
      await game.settings.set(NS, "castQueueState", queue.filter(q => q.id !== castId));
    } catch(e) { console.error("removeCastEntry:", e); }
    this.render();
  }

  static _onCombatEnd() {
    for (const id of this._removedFromCombat) {
      if (!this.isInParty(id) && game.actors.get(id)) this.addActor(id);
    }
    this._removedFromCombat.clear();
    this._lastActiveTurnTokenId = null;
  }

  // Auto-select token + open action menu when it becomes this client's turn
  static _onTurnChange(state) {
    const active = (state.combatants ?? []).find(c => c.active && !c.turnDone);
    const newTurnId = active?.tokenId ?? null;
    if (newTurnId === this._lastActiveTurnTokenId) return;
    this._lastActiveTurnTokenId = newTurnId;
    if (!newTurnId || !active) return;

    // Find the token on canvas
    const token = canvas?.tokens?.placeables?.find(
      t => (t.document?.id ?? t.id) === newTurnId
    );
    if (!token) return;

    // Only act if this client can control the token
    const actor = token.actor;
    if (!actor?.isOwner) return;

    // Deselect all tokens first (covers GM and players), then select the active one
    canvas.tokens.releaseAll();
    token.control({ releaseOthers: true });
    canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 400 });

    // Open action menu HUD — token.control fires controlToken hook which calls
    // DawnbreakerHUD.refresh(), but call explicitly after a tick to be safe
    setTimeout(() => DawnbreakerHUD.refresh(), 50);
  }

  static _getCombatList() {
    const state    = window.CTB?.getState?.() ?? {};
    const inCombat = state.phase === "active" || state.phase === "ticking";

    if (!inCombat) {
      const captainId = this._captainId();
      const actors = this.actors;
      actors.sort((a, b) => (b.id === captainId ? 1 : 0) - (a.id === captainId ? 1 : 0));
      return actors.map(a => ({ actor: a, tokenId: null, ctbAP: a.system?.ctbAP ?? 0, isParty: true }));
    }

    const seen = new Set();
    const list = [];
    for (const c of (state.combatants ?? [])) {
      const token = canvas?.tokens?.placeables?.find(t => (t.document?.id ?? t.id) === c.tokenId);
      const actor = token?.actor ?? game.actors.get(c.actorId);
      if (!actor) continue;
      if (seen.has(c.tokenId)) continue;
      seen.add(c.tokenId);
      const displayName = token?.document?.name ?? c.name ?? actor.name;
      list.push({ actor, tokenId: c.tokenId, ctbAP: c.apCurrent ?? 0, isParty: this.isInParty(actor.id), displayName });
    }
    // also include party members not in CTB state (e.g. spectators) — skip ones removed mid-combat
    for (const a of this.actors) {
      if (!list.find(x => x.actor.id === a.id) && !this._removedFromCombat.has(a.id)) {
        list.push({ actor: a, tokenId: null, ctbAP: a.system?.ctbAP ?? 0, isParty: true });
      }
    }
    // Cast queue entries — interspersed by apCurrent (same 0-100 scale)
    const castEntries = (() => { try { return game.settings.get(NS, "castQueueState") ?? []; } catch(e) { return []; } })();
    for (const ce of castEntries) {
      const caster = game.actors.get(ce.actorId);
      list.push({ isCast: true, castEntry: ce, ctbAP: ce.apCurrent ?? 0, actor: caster ?? null, tokenId: null, isParty: false, displayName: ce.abilityName });
    }

    list.sort((a, b) => b.ctbAP - a.ctbAP);
    return list;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  static render() {
    if (!this.visible) return;
    const partyActors = this.actors;
    const list = this._getCombatList();
    if (!partyActors.length && !list.length) return;

    const state    = window.CTB?.getState?.() ?? {};
    const inCombat = state.phase === "active" || state.phase === "ticking";
    const count    = String(list.length || partyActors.length).padStart(2, "0");
    const designation = (() => { try { return game.settings.get(NS, "squadDesignation") || "0198"; } catch(e) { return "0198"; } })();

    const combatBtns = inCombat ? `
      <div class="dbt-combat-bar" id="dbt-combat-bar">
        <button class="dbt-cbtn dbt-cbtn-end"    onclick="DawnbreakerPartyHUD._endTurn()">End Turn</button>
        <button class="dbt-cbtn"                  onclick="DawnbreakerPartyHUD._addTarget()">Add Target</button>
        <button class="dbt-cbtn"                  onclick="DawnbreakerPartyHUD._forceTick()">Force Tick</button>
        <button class="dbt-cbtn dbt-cbtn-danger"  onclick="DawnbreakerPartyHUD._endCombat()">End Combat</button>
      </div>` : "";

    const minimizeBtn = `<button class="dbt-party-minimize-btn" title="${this._minimized ? "Expand" : "Minimize"}" onclick="DawnbreakerPartyHUD._toggleMinimize()">${this._minimized ? "▸" : "▾"}</button>`;

    const scanOn = window._dbStatOverlayEnabled?.() ?? false;
    const scanBtn = `<button class="dbt-party-scan-btn${scanOn ? " active" : ""}" title="Toggle unit stat numbers on tokens (allies + scanned enemies)" onclick="window._dbToggleStatOverlay()"><i class="fa-solid fa-expand"></i></button>`;

    const headerHtml = inCombat
      ? `<div class="dbt-party-header dbt-party-header-combat" id="dbt-party-header">
           <span class="dbt-party-sys">DBT</span>
           ${minimizeBtn}${scanBtn}
           <span class="dbt-party-title">SQUAD ENGAGED<span class="dbt-dot">.</span></span>
           <span class="dbt-party-count" id="dbt-party-count">${count}</span>
         </div>`
      : `<div class="dbt-party-header" id="dbt-party-header">
           <span class="dbt-party-sys">DBT</span>
           ${minimizeBtn}${scanBtn}
           <span class="dbt-party-title">SQUAD<span class="dbt-dot">.</span> <span class="dbt-party-designation" id="dbt-party-designation" title="${game.user?.isGM ? "Double-click to rename" : ""}">${designation}</span></span>
           <span class="dbt-party-count" id="dbt-party-count">${count}</span>
         </div>`;

    const cardsHtml = list.length
      ? list.map(entry => entry.isCast
          ? this._buildCastCardHtml(entry.castEntry)
          : this._buildCardHtml(entry.actor, entry.tokenId, undefined, undefined, entry.displayName)
        ).join("")
      : partyActors.map(a => this._buildCardHtml(a, null)).join("");

    // Preserve dragged position across re-renders
    let root = document.getElementById(PARTY_ROOT_ID);
    let savedTop = null, savedLeft = null;
    if (!root) {
      root = document.createElement("div");
      root.id = PARTY_ROOT_ID;
      this._applyPosition(root);
      (document.getElementById("interface") ?? document.body).appendChild(root);
    } else {
      savedTop  = root.style.top;
      savedLeft = root.style.left;
    }

    root.classList.toggle("dbt-party-minimized", this._minimized);

    root.innerHTML = `
      ${headerHtml}
      ${combatBtns}
      <div class="dbt-cards-list" id="dbt-cards-list" style="${(list.length || partyActors.length) > 10 ? "max-height:var(--dbt-cards-max);overflow-y:auto;overflow-x:hidden;" : ""}">
        ${cardsHtml}
      </div>
    `;

    if (savedTop)  root.style.top  = savedTop;
    if (savedLeft) root.style.left = savedLeft;
    // Re-attach drag every render — header element is recreated by innerHTML
    this._makeDraggable(root);
    if (!root._barClickBound) { this._attachBarClicks(root); root._barClickBound = true; }

    // Designation rename — GM double-click
    if (game.user?.isGM) {
      const desigEl = root.querySelector("#dbt-party-designation");
      if (desigEl) {
        desigEl.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          const cur = desigEl.textContent;
          const input = document.createElement("input");
          input.type = "text";
          input.value = cur;
          input.className = "dbt-designation-input";
          desigEl.replaceWith(input);
          input.focus();
          input.select();
          const commit = async () => {
            const val = input.value.trim() || "0198";
            await game.settings.set(NS, "squadDesignation", val);
            DawnbreakerPartyHUD.render();
          };
          input.addEventListener("blur", commit);
          input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); input.blur(); } else if (ev.key === "Escape") { input.removeEventListener("blur", commit); DawnbreakerPartyHUD.render(); } });
        });
      }
    }

    const allActors = list.length ? list.map(x => x.actor) : partyActors;
    for (const actor of allActors) this._storeStats(actor);
    this._updateTurnHighlight();
    DawnbreakerHUD._positionOnPartyHUD();
    DawnbreakerGuestHUD._startObserver();
  }

  // ── Card HTML ──────────────────────────────────────────────────────────────

  static _buildBeaconCardHtml(actor, tokenId, beaconData) {
    const sys       = actor.system ?? {};
    const ctbAP    = sys.ctbAP ?? 0;
    const pct      = Math.max(0, Math.min(100, ctbAP));
    const turns    = beaconData?.turns ?? 0;
    const turnsLeft = Math.max(0, 3 - turns);
    const portrait  = actor.img ?? "icons/svg/mystery-man.svg";
    const cardId   = tokenId ? `dbt-card-tok-${tokenId}` : `dbt-card-${actor.id}`;
    return `
    <div class="dbt-beacon-card" id="${cardId}" data-actor-id="${actor.id}" data-token-id="${tokenId ?? ""}">
      <img class="dbt-cast-portrait dbt-beacon-portrait" src="${portrait}" title="Healing Beacon">
      <div class="dbt-beacon-body">
        <div class="dbt-beacon-name">
          <span class="dbt-beacon-label">Healing Beacon</span>
          <span class="dbt-beacon-turns">${turnsLeft} turn${turnsLeft !== 1 ? "s" : ""} left</span>
        </div>
        <div class="dbt-cast-bar-wrap">
          <span class="dbt-cast-bar-label">T</span>
          <div class="dbt-cast-track dbt-bar" data-bar="turn"><div class="dbt-cast-fill dbt-beacon-fill" style="width:${pct.toFixed(1)}%"></div></div>
          <span class="dbt-cast-val">${Math.round(pct)}</span>
        </div>
      </div>
      ${this._inCombat() && game.user.isGM ? `<button class="dbt-remove-combatant" title="Remove Beacon from Combat" onclick="${tokenId ? `DawnbreakerPartyHUD.removeFromCombatByToken('${tokenId}')` : `DawnbreakerPartyHUD.removeFromCombat('${actor.id}')`}">×</button>` : ""}
    </div>`;
  }

  static _buildCardHtml(actor, tokenId = null, _unused1, _unused2, displayName = null) {
    // Healing Beacon — compact row, no stats/conditions
    const beaconData = actor.getFlag?.("dawnbreaker-trials", "healingBeacon");
    if (beaconData?.active || actor.name === "Healing Beacon") {
      return this._buildBeaconCardHtml(actor, tokenId, beaconData);
    }

    displayName = displayName ?? actor.name;
    const isCaptain = this._captainId() === actor.id;
    const sys = actor.system ?? {};
    const hp  = sys.hp ?? {};
    const ar  = sys.ar ?? {};
    const ki  = sys.ki ?? {};
    const st  = sys.stats ?? {};

    const hpCur = hp.current ?? 0,  hpMax = Math.max(1, hp.max ?? 1);
    const arCur = ar.current ?? 0,  arMax = Math.max(1, ar.max ?? 1);
    const kiCur = ki.current ?? 0,  kiMax = ki.max ?? 0;

    const hpPct = Math.max(0, Math.min(100, (hpCur / hpMax) * 100));
    const arPct = Math.max(0, Math.min(100, (arCur / arMax) * 100));
    const kiPct = kiMax > 0 ? Math.max(0, Math.min(100, (kiCur / kiMax) * 100)) : 0;

    const isDown     = hpCur <= 0;
    const isCritical = hpPct < 25 && !isDown;
    const isBloodied = hpPct < 50 && !isDown && !isCritical;
    const isParty    = this.isInParty(actor.id);

    const portrait = this._resolvePortrait(actor, hpPct, isDown);
    const ctbAP    = sys.ctbAP ?? 0;
    const pr       = st.PR?.totalKennel ?? st.PR?.total ?? st.PR ?? 0;
    const mr       = st.MR?.totalKennel ?? st.MR?.total ?? st.MR ?? 0;
    const ap       = st.AP?.totalKennel ?? st.AP?.total ?? st.AP ?? 0;

    // Down condition recall turns
    const downCond   = isDown ? (sys.conditions ?? []).find(c => c.name?.toLowerCase() === "down") : null;
    const recallTurns = downCond?.duration ?? "?";

    // Name suffix
    const nameSuffix = isDown
      ? `<span class="dbt-status-tag dbt-down-tag"> [DOWN] RECALLING [${recallTurns}]</span>`
      : isCritical
        ? `<span class="dbt-status-tag dbt-crit-tag"> [CRITICAL CONDITION]</span>`
        : "";

    // HP value color class
    const hpValClass = isDown ? " dbt-hpval-down" : isCritical ? " dbt-hpval-crit" : isBloodied ? " dbt-hpval-warn" : "";

    // Conditions — exclude "down" (shown in name instead)
    const condHtml = this._buildConditions((sys.conditions ?? []).filter(c => c.name?.toLowerCase() !== "down"));

    const stateClass = isDown ? " dbt-card-down" : isCritical ? " dbt-card-critical" : isBloodied ? " dbt-card-bloodied" : "";
    const npcTag = !isParty ? ` dbt-card-npc` : "";
    const cardId = tokenId ? `dbt-card-tok-${tokenId}` : `dbt-card-${actor.id}`;

    // Non-party actors are hidden behind STATUS:NULL unless they have a Scan condition
    const hasScanned = isParty || (sys.conditions ?? []).some(c => c.name?.toLowerCase() === "scan");

    const bodyHtml = hasScanned ? `
        <div class="dbt-card-name">${isCaptain ? '<span class="dbt-captain-badge" title="Squad Captain">★</span> ' : ""}${displayName}<span class="dbt-dot">.</span>${nameSuffix}</div>
        <div class="dbt-card-bars">
          ${this._barHtml("hp", "HP", hpCur, hpMax, hpPct, hpValClass, isCritical ? "dbt-hp-crit-blink" : "")}
          ${this._barHtml("ar", "AR", arCur, arMax, arPct, "", arCur === 0 ? "dbt-ar-broken" : "", arCur === 0 ? '<span class="dbt-ar-brk-label">BRK</span>' : null)}
          ${this._barHtml("ki", "KI", kiCur, kiMax, kiPct, "", kiMax === 0 ? "dbt-ki-null" : "", kiMax === 0 ? '<span class="dbt-ki-null-label">Null</span>' : null)}
          ${this._inCombat() ? this._turnBarHtml(ctbAP) : ""}
        </div>
        <div class="dbt-card-badges">
          <span class="dbt-num-badge" title="Precision Rate">PR <b>${pr}</b></span>
          <span class="dbt-num-badge" title="Magic Resist">MR <b>${mr}</b></span>
          <span class="dbt-num-badge" title="Action Points">AP <b>${ap}</b></span>
        </div>
        ${condHtml ? `<div class="dbt-card-conditions">${condHtml}</div>` : ""}` : `
        <div class="dbt-card-name">${isCaptain ? '<span class="dbt-captain-badge" title="Squad Captain">★</span> ' : ""}${displayName}<span class="dbt-dot">.</span></div>
        ${this._inCombat() ? this._turnBarHtml(ctbAP) : ""}
        <div class="dbt-status-null" style="flex:1;display:flex;align-items:center;justify-content:center;">[ STATUS : NULL ]</div>`;

    const removeBtn = this._inCombat() && game.user.isGM
      ? `<button class="dbt-remove-combatant" title="Remove from Combat" onclick="${tokenId ? `DawnbreakerPartyHUD.removeFromCombatByToken('${tokenId}')` : `DawnbreakerPartyHUD.removeFromCombat('${actor.id}')`}">×</button>`
      : "";

    const captainClass = isCaptain ? " dbt-card-captain" : "";

    return `
    <div class="dbt-card${stateClass}${npcTag}${captainClass}" id="${cardId}" data-actor-id="${actor.id}" data-token-id="${tokenId ?? ""}">
      ${isCaptain ? '<div class="dbt-captain-stripe"><span>CAPTAIN</span></div>' : ""}
      <div class="dbt-card-portrait-wrap">
        <img class="dbt-card-portrait" src="${portrait}" title="${displayName}">
        <div class="dbt-card-turn-glow"></div>
        ${isCaptain ? '<div class="dbt-captain-portrait-frame"></div>' : ""}
        ${isDown ? '<div class="dbt-card-down-overlay">↓</div>' : ""}
      </div>
      <div class="dbt-card-body">
        ${bodyHtml}
      </div>
      ${removeBtn}
    </div>`;
  }

  static _inCombat() {
    const p = window.CTB?.getState?.()?.phase;
    return p === "active" || p === "ticking";
  }

  // ── Cast queue card — compact row (≤50px) for in-flight spells ──────────────
  static _buildCastCardHtml(ce) {
    const caster   = game.actors.get(ce.actorId);
    const portrait = caster?.img ?? "icons/svg/mystery-man.svg";
    const pct      = Math.max(0, Math.min(100, ce.apCurrent ?? 0));
    const speed    = ce.castSpeed ?? ce.apTotal ?? "?";
    return `
    <div class="dbt-cast-card" id="dbt-cast-${ce.id}" data-cast-id="${ce.id}" data-actor-id="${ce.actorId ?? ""}">
      <img class="dbt-cast-portrait" src="${portrait}" title="${caster?.name ?? "Unknown"}">
      <div class="dbt-cast-body">
        <div class="dbt-cast-name">
          <span class="dbt-cast-icon">${ce.abilityIcon ?? "⚡"}</span>
          <span class="dbt-cast-label">${ce.abilityName}</span>
          <span class="dbt-cast-speed" data-cast-id="${ce.id}" title="Cast Speed (click to edit)">CS ${speed}</span>
          <span class="dbt-cast-caster">${caster?.name ?? ""}</span>
        </div>
        <div class="dbt-cast-bar-wrap">
          <span class="dbt-cast-bar-label">CAST</span>
          <div class="dbt-cast-track"><div class="dbt-cast-fill" style="width:${pct.toFixed(1)}%"></div></div>
          <span class="dbt-cast-val">${Math.round(pct)}</span>
        </div>
      </div>
      <button class="dbt-remove-combatant" title="Cancel Cast" onclick="DawnbreakerPartyHUD.removeCastEntry('${ce.id}')">×</button>
    </div>`;
  }

  static _barHtml(type, label, cur, max, pct, valClass = "", extraClass = "", valOverride = null) {
    const valHtml = valOverride ?? `${cur}<span class="dbt-bar-max">/${max}</span>`;
    return `
    <div class="dbt-bar${extraClass ? " " + extraClass : ""}" data-bar="${type}">
      <span class="dbt-bar-label">${label}</span>
      <div class="dbt-bar-track">
        <div class="dbt-bar-fill dbt-${type}-fill" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <span class="dbt-bar-val${valClass}">${valHtml}</span>
    </div>`;
  }

  static _turnBarHtml(ctbAP) {
    const pct = Math.max(0, Math.min(100, ctbAP));
    return `
    <div class="dbt-bar dbt-turn-bar" data-bar="turn">
      <span class="dbt-bar-label dbt-turn-label">T</span>
      <div class="dbt-bar-track">
        <div class="dbt-bar-fill dbt-turn-fill" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <span class="dbt-bar-val dbt-turn-val">${Math.round(ctbAP)}</span>
    </div>`;
  }

  static _buildConditions(conditions) {
    return conditions
      .filter(c => c?.name?.trim())
      .map(c => {
        const label = c.label || c.name;
        const dur   = c.duration > 0 ? ` (${c.duration}t)` : c.instance > 0 ? ` [${c.instance}]` : "";
        const abbr  = label.substring(0, 4).toUpperCase();
        return `<span class="dbt-cond-badge" title="${label}${dur}">${abbr}</span>`;
      }).join("");
  }

  // ── Live update ────────────────────────────────────────────────────────────

  static updateCard(actor, tokenId = null) {
    // During combat, cards are keyed by tokenId; fall back to actorId for party spectators
    const card = (tokenId ? document.getElementById(`dbt-card-tok-${tokenId}`) : null)
      ?? document.getElementById(`dbt-card-${actor.id}`)
      ?? document.querySelector(`.dbt-card[data-actor-id="${actor.id}"]`);
    if (!card) { this.render(); return; }

    // Capture prev stats for flash decisions before rebuilding
    const prev    = this._prevStats.get(actor.id) ?? {};
    const sys     = actor.system ?? {};
    const hp      = sys.hp ?? {}, ar = sys.ar ?? {}, ki = sys.ki ?? {};
    const hpCur   = hp.current ?? 0;
    const arCur   = ar.current ?? 0;
    const kiCur   = ki.current ?? 0;

    // Full card rebuild — ensures all derived stats (PR/MR/AP etc.) are always current.
    card.outerHTML = this._buildCardHtml(actor, tokenId);
    this._storeStats(actor);

    // Re-query the new card from the DOM (card variable is now detached)
    const newCard = (tokenId ? document.getElementById(`dbt-card-tok-${tokenId}`) : null)
      ?? document.getElementById(`dbt-card-${actor.id}`)
      ?? document.querySelector(`.dbt-card[data-actor-id="${actor.id}"]`);
    if (!newCard) return;

    // Flash bars on HP/AR/KI changes
    if (prev.hp !== undefined && hpCur !== prev.hp) this._flashBar(newCard, "hp");
    if (prev.ar !== undefined && arCur !== prev.ar) this._flashBar(newCard, "ar");
    if (prev.ki !== undefined && kiCur !== prev.ki) this._flashBar(newCard, "ki");
  }

  static _flashBar(card, type) {
    const bar = card.querySelector(`[data-bar="${type}"]`);
    if (!bar) return;
    bar.classList.remove("dbt-bar-flash");
    void bar.offsetWidth;
    bar.classList.add("dbt-bar-flash");
    setTimeout(() => bar.classList.remove("dbt-bar-flash"), 800);
  }

  static _storeStats(actor) {
    const s = actor.system ?? {};
    this._prevStats.set(actor.id, { hp: s.hp?.current ?? 0, ar: s.ar?.current ?? 0, ki: s.ki?.current ?? 0 });
  }

  // ── Turn highlight ─────────────────────────────────────────────────────────

  static _updateTurnHighlight() {
    const state    = window.CTB?.getState?.() ?? {};
    const inCombat = state.phase === "active" || state.phase === "ticking";

    document.querySelectorAll(".dbt-card.dbt-card-active-turn").forEach(el => el.classList.remove("dbt-card-active-turn"));
    if (!inCombat) return;

    for (const c of (state.combatants ?? [])) {
      if (state.phase !== "active" || c.apCurrent < 100 || c.turnDone) continue;
      // Try token-keyed card first, then actor-keyed
      const card = document.getElementById(`dbt-card-tok-${c.tokenId}`)
                ?? document.getElementById(`dbt-card-${c.actorId}`);
      card?.classList.add("dbt-card-active-turn");
    }
  }

  // ── Portrait resolution ────────────────────────────────────────────────────

  static _resolvePortrait(actor, hpPct, isDown) {
    const vars = (game.settings.get(NS, "portraitVariants") ?? {})[actor.id];
    if (vars) {
      const condNames = (actor.system?.conditions ?? []).map(c => (c.name ?? "").toLowerCase());
      for (const v of (vars.conditions ?? [])) {
        if (v.img && condNames.includes((v.trigger ?? "").toLowerCase())) return v.img;
      }
      if (isDown     && vars.down)     return vars.down;
      if (hpPct < 25 && vars.critical) return vars.critical;
      if (hpPct < 50 && vars.bloodied) return vars.bloodied;
      if (vars.default) return vars.default;
    }
    return actor.img ?? "";
  }

  // ── Header count ───────────────────────────────────────────────────────────

  static _updateHeader() {
    const el = document.getElementById("dbt-party-count");
    if (el) el.textContent = String(this.actors.length).padStart(2, "0");
  }

  // ── Visibility + positioning ───────────────────────────────────────────────

  static setVisible(visible) {
    this.visible = visible;
    const root = document.getElementById(PARTY_ROOT_ID);
    if (visible) {
      if (!root) this.render();
      else root.style.display = "";
    } else {
      if (root) root.style.display = "none";
      DawnbreakerHUD._destroy();
    }
    ui.controls?.render?.();
  }

  static _repositionTargetSelector() {
    const ts = document.getElementById("db-target-selector");
    if (!ts) return;
    const party = document.getElementById(PARTY_ROOT_ID);
    if (!party) return;
    const pr = party.getBoundingClientRect();
    const dw = ts.offsetWidth  || 340;
    const dh = ts.offsetHeight || 300;
    let left = pr.right + 6;
    let top  = pr.bottom - dh;
    if (left + dw > window.innerWidth - 10) left = pr.left - dw - 6;
    if (top < 4) top = 4;
    ts.style.left = `${Math.round(left)}px`;
    ts.style.top  = `${Math.round(top)}px`;
  }

  static _applyPosition(root) {
    const ctb = document.getElementById("ctb-display");
    if (ctb) {
      const r = ctb.getBoundingClientRect();
      root.style.top  = `${Math.round(r.top)}px`;
      root.style.left = `${Math.round(r.right + 6)}px`;
    } else {
      // Default: right of where CTB usually appears (left:10, top:60, width:260)
      root.style.top  = "60px";
      root.style.left = "278px";
    }
  }

  // ── Bar click → inline edit popup ─────────────────────────────────────────

  static _attachBarClicks(root) {
    // Bar clicks — stat editing (own actors only)
    root.addEventListener("click", (e) => {
      const bar  = e.target.closest(".dbt-bar, .dbt-cast-bar-wrap");
      if (!bar) return;
      const card = bar.closest(".dbt-card, .dbt-cast-card");
      if (!card) return;
      // Ownership check — GMs can always edit; players only own actors
      const actorId = card.dataset.actorId;
      const actor   = actorId ? game.actors.get(actorId) : null;
      const isCast  = card.classList.contains("dbt-cast-card");
      if (!isCast && actor && !actor.isOwner) return;
      e.stopPropagation();
      DawnbreakerPartyHUD._showBarPopup(bar, card);
    });

    // Cast speed badge click — edit castSpeed for a queue entry
    root.addEventListener("click", (e) => {
      const badge = e.target.closest(".dbt-cast-speed");
      if (!badge) return;
      const castId = badge.dataset.castId;
      if (!castId) return;
      e.stopPropagation();
      const queue = (() => { try { return game.settings.get(NS, "castQueueState") ?? []; } catch(e2) { return []; } })();
      const entry = queue.find(q => q.id === castId);
      if (!entry) return;
      DawnbreakerPartyHUD._showCastSpeedPopup(badge, castId, entry.castSpeed ?? entry.apTotal ?? 0);
    });

    // Name clicks — select + pan camera to token
    root.addEventListener("click", (e) => {
      const nameEl = e.target.closest(".dbt-card-name");
      if (!nameEl) return;
      const card    = nameEl.closest(".dbt-card");
      if (!card) return;
      const tokenId = card.dataset.tokenId;
      const actorId = card.dataset.actorId;
      const token   = tokenId
        ? canvas?.tokens?.placeables?.find(t => (t.document?.id ?? t.id) === tokenId)
        : canvas?.tokens?.placeables?.find(t => t.actor?.id === actorId);
      if (!token) return;
      e.stopPropagation();
      // Select the token and pan camera to it
      token.control({ releaseOthers: true });
      canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 400 });
    });
  }

  static _showBarPopup(bar, card) {
    document.getElementById("dbt-bar-popup")?.remove();

    const barType  = bar.dataset.bar ?? (bar.classList.contains("dbt-cast-bar-wrap") ? "cast" : null);
    if (!barType) return;

    // Resolve actor + token
    const actorId  = card.dataset.actorId;
    const tokenId  = card.dataset.tokenId || null;
    const castId   = card.dataset.castId  || null;
    const token    = tokenId ? canvas?.tokens?.placeables?.find(t => (t.document?.id ?? t.id) === tokenId) : null;
    const actor    = token?.actor ?? (actorId ? game.actors.get(actorId) : null);

    // Current value and label
    let currentVal = 0, popupLabel = barType.toUpperCase();
    if (barType === "hp")   { currentVal = actor?.system?.hp?.current  ?? 0; }
    if (barType === "ar")   { currentVal = actor?.system?.ar?.current  ?? 0; }
    if (barType === "ki")   { currentVal = actor?.system?.ki?.current  ?? 0; }
    if (barType === "turn") {
      const state = window.CTB?.getState?.() ?? {};
      const c = (state.combatants ?? []).find(x => x.tokenId === tokenId || x.actorId === actorId);
      currentVal = c?.apCurrent ?? 0;
      popupLabel = "CTB AP";
    }
    if (barType === "cast") {
      const queue = (() => { try { return game.settings.get(NS, "castQueueState") ?? []; } catch(e) { return []; } })();
      const entry = queue.find(q => q.id === castId);
      currentVal  = Math.round(entry?.apCurrent ?? 0);
      popupLabel  = "CAST AP";
    }

    // Build popup
    const br  = bar.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.id    = "dbt-bar-popup";
    pop.innerHTML = `
      <div class="dbt-popup-label">${popupLabel}</div>
      <input class="dbt-popup-input" type="number" value="${Math.round(currentVal)}" min="0"/>
      <div class="dbt-popup-hint">↵ confirm · Esc cancel</div>`;
    pop.style.cssText = `position:fixed;left:${Math.round(br.left)}px;top:${Math.round(br.top - 66)}px;z-index:9999;`;
    document.body.appendChild(pop);

    const input = pop.querySelector(".dbt-popup-input");
    input.focus(); input.select();

    const close = () => pop.remove();
    const commit = async () => {
      const val = parseInt(input.value);
      if (isNaN(val)) { close(); return; }
      close();
      if (barType === "hp" && actor) await actor.update({ "system.hp.current": Math.max(0, val) });
      if (barType === "ar" && actor) await actor.update({ "system.ar.current": Math.max(0, val) });
      if (barType === "ki" && actor) await actor.update({ "system.ki.current": Math.max(0, val) });
      if (barType === "turn") {
        const state = window.CTB?.getState?.() ?? {};
        const c = (state.combatants ?? []).find(x => x.tokenId === tokenId || x.actorId === actorId);
        if (c) { c.apCurrent = Math.max(0, val); window.CTB?.setState?.(state); }
      }
      if (barType === "cast") {
        const queue = (() => { try { return game.settings.get(NS, "castQueueState") ?? []; } catch(e) { return []; } })();
        const entry = queue.find(q => q.id === castId);
        if (entry) { entry.apCurrent = Math.max(0, val); await game.settings.set(NS, "castQueueState", queue); }
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); close();  }
    });
    // Close if clicking outside
    const outsideClick = (e) => { if (!pop.contains(e.target)) { close(); document.removeEventListener("mousedown", outsideClick); } };
    setTimeout(() => document.addEventListener("mousedown", outsideClick), 0);
  }

  static _showCastSpeedPopup(anchor, castId, currentSpeed) {
    document.getElementById("dbt-bar-popup")?.remove();
    const br  = anchor.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.id    = "dbt-bar-popup";
    pop.innerHTML = `
      <div class="dbt-popup-label">CAST SPEED</div>
      <input class="dbt-popup-input" type="number" value="${Math.round(currentSpeed)}" min="0"/>
      <div class="dbt-popup-hint">↵ confirm · Esc cancel</div>`;
    pop.style.cssText = `position:fixed;left:${Math.round(br.left)}px;top:${Math.round(br.top - 66)}px;z-index:9999;`;
    document.body.appendChild(pop);

    const input = pop.querySelector(".dbt-popup-input");
    input.focus(); input.select();

    const close = () => pop.remove();
    const commit = async () => {
      const val = parseInt(input.value);
      if (isNaN(val)) { close(); return; }
      close();
      const queue = (() => { try { return game.settings.get(NS, "castQueueState") ?? []; } catch(e) { return []; } })();
      const entry = queue.find(q => q.id === castId);
      if (!entry) return;
      entry.castSpeed = Math.max(0, val);
      // Also update apTotal if it mirrors castSpeed
      if ("apTotal" in entry) entry.apTotal = entry.castSpeed;
      await game.settings.set(NS, "castQueueState", queue);
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); close();  }
    });
    const outsideClick = (e) => { if (!pop.contains(e.target)) { close(); document.removeEventListener("mousedown", outsideClick); } };
    setTimeout(() => document.addEventListener("mousedown", outsideClick), 0);
  }

  static _toggleMinimize() {
    this._minimized = !this._minimized;
    localStorage.setItem("dbt-party-hud-minimized", this._minimized ? "1" : "0");
    this.render();
  }

  static _makeDraggable(root) {
    const header = root.querySelector("#dbt-party-header");
    if (!header) return;
    header.addEventListener("mousedown", (e) => {
      if (e.target.closest(".dbt-party-minimize-btn, .dbt-party-scan-btn, .dbt-party-designation")) return;
      e.preventDefault();
      const startX = e.clientX, startY = e.clientY;
      const { left: sl, top: st } = root.getBoundingClientRect();
      const onMove = (e) => {
        root.style.left = `${sl + (e.clientX - startX)}px`;
        root.style.top  = `${st + (e.clientY - startY)}px`;
        DawnbreakerHUD._positionOnPartyHUD();
        DawnbreakerHUD._repositionSub(document.getElementById(HUD_ROOT_ID));
        DawnbreakerPartyHUD._repositionTargetSelector();
        DawnbreakerGuestHUD._reposition();
      };
      const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup",   onUp);
    });
  }

  static _endTurn() {
    const state  = window.CTB?.getState?.() ?? {};
    const active = (state.combatants ?? []).find(c => c.apCurrent >= 100 && !c.turnDone);
    if (!active) { ui.notifications.info("No active combatant to end turn for."); return; }
    if (!game.user.isGM) {
      const token = canvas.tokens?.placeables?.find(t => t.document?.id === active.tokenId || t.id === active.tokenId);
      const actor = token?.actor ?? game.actors.get(active.actorId);
      if (!actor?.isOwner) { ui.notifications.warn("It's not your turn."); return; }
    }
    window.CTBEngine?.endTurn?.(active.actorId, active.tokenId);
  }

  static _forceTick() { window.CTBEngine?.tick?.(); }

  static _addTarget() {
    const macro = game.macros.find(m => m.name === "Add Target") ?? game.macros.find(m => m.name === "AddTarget");
    if (macro) macro.execute();
    else ui.notifications.warn("No 'Add Target' macro found.");
  }

  static _endCombat() {
    window.CTBEngine?.endCombat?.();
  }

  static _destroy() { document.getElementById(PARTY_ROOT_ID)?.remove(); }
}

// ─────────────────────────────────────────────────────────────────────────────
//  DawnbreakerHUD  —  action menu (docks to party HUD)
// ─────────────────────────────────────────────────────────────────────────────

class DawnbreakerHUD {
  static currentActor   = null;
  static currentToken   = null;
  static activeCategory = null;

  // ── Init ──────────────────────────────────────────────────────────────────

  static initialize() {
    // GM: token selection drives the HUD
    Hooks.on("controlToken", () => setTimeout(() => DawnbreakerHUD.refresh(), 0));

    // Players: clicking their token opens their sheet (V14 behaviour) — use that as the trigger
    Hooks.on("renderActorSheet", (app) => {
      if (game.user.isGM) return;
      const actor = app.actor;
      if (!actor?.isOwner || !["character","npc","companion"].includes(actor.type)) return;
      DawnbreakerHUD.currentActor = actor;
      // Use app.token (the specific token document that opened the sheet) when available
      const tokenDoc = app.token ?? null;
      DawnbreakerHUD.currentToken = tokenDoc
        ? (canvas?.tokens?.placeables?.find(t => t.document === tokenDoc || t.id === tokenDoc.id) ?? null)
        : (canvas?.tokens?.placeables?.find(t => t.actor?.id === actor.id) ?? null);
      DawnbreakerHUD._renderMain();
      if (DawnbreakerHUD.activeCategory) DawnbreakerHUD._renderSub();
    });

    // Players: also auto-show for assigned character when canvas is ready / scene changes
    const _showForPlayer = () => {
      if (game.user.isGM) return;
      const actor = game.user.character;
      if (!actor) return;
      DawnbreakerHUD.currentActor = actor;
      DawnbreakerHUD.currentToken = canvas?.tokens?.placeables?.find(t => t.actor?.id === actor.id) ?? null;
      DawnbreakerHUD._renderMain();
    };
    Hooks.on("canvasReady", _showForPlayer);

    Hooks.on("updateActor",   (actor) => {
      if (DawnbreakerHUD.currentActor?.id === actor.id) {
        DawnbreakerHUD._renderMain();
        if (DawnbreakerHUD.activeCategory) DawnbreakerHUD._renderSub();
      }
    });
    Hooks.on("updateSetting", (setting) => {
      if (String(setting.key ?? "").includes("ctbState")) DawnbreakerHUD._renderMain();
    });
    DawnbreakerHUD._injectStyles();
  }

  // ── Token selection ────────────────────────────────────────────────────────

  static refresh() {
    const token = canvas.tokens?.controlled?.[0];
    if (!token?.actor)                                     return DawnbreakerHUD._destroy();
    if (!["character","npc","companion"].includes(token.actor.type))   return DawnbreakerHUD._destroy();
    if (!game.user.isGM && !token.actor.isOwner)           return DawnbreakerHUD._destroy();

    DawnbreakerHUD.currentActor = token.actor;
    DawnbreakerHUD.currentToken = token;
    DawnbreakerHUD._renderMain();
    if (DawnbreakerHUD.activeCategory) DawnbreakerHUD._renderSub();
  }

  static _destroy() {
    document.getElementById(HUD_ROOT_ID)?.remove();
    document.getElementById(HUD_SUB_ID)?.remove();
    DawnbreakerHUD.currentActor   = null;
    DawnbreakerHUD.currentToken   = null;
    DawnbreakerHUD.activeCategory = null;
  }

  // ── CTB helpers ────────────────────────────────────────────────────────────

  static _inCombat() {
    const p = window.CTB?.getState?.()?.phase;
    return p === "active" || p === "ticking";
  }

  static _isMyTurn() {
    const actor = DawnbreakerHUD.currentActor;
    if (!actor) return false;
    if (actor.type === "character") return actor.system?.turnPhase?.active === true;
    const state   = window.CTB?.getState?.() ?? {};
    const tokenId = DawnbreakerHUD.currentToken?.document?.id ?? DawnbreakerHUD.currentToken?.id;
    const c       = state.combatants?.find(x => x.tokenId === tokenId);
    return state.phase === "active" && !!c && c.apCurrent >= 100 && !c.turnDone;
  }

  // ── Abilities ──────────────────────────────────────────────────────────────

  static _getAbilities(groupId) {
    const actor = DawnbreakerHUD.currentActor;
    if (!actor) return [];
    if (groupId === "core") {
      if (actor.type === "companion")
        return (actor.system?.abilities?.mainActives ?? []).filter(a => a?.name?.trim());
      return actor.type === "npc" ? CORE_MACROS_NPC : CORE_MACROS_CHARACTER;
    }
    if (groupId === "npcAttacks") {
      return (actor.system?.attacks ?? []).filter(a => a?.name?.trim())
        .map(a => ({ name: a.name, cost: a.cost || "", speed: a.speed || "", macroName: a.name, desc: a.effect || "" }));
    }
    if (groupId === "inventory") {
      return (actor.items ?? [])
        .filter(it => {
          if (!it?.name?.trim()) return false;
          const mn = it.system?.macroName?.trim();
          if (!mn) return false; // must have macroName set
          return !!game.macros.find(m => m.name === mn);
        })
        .map(it => ({
          name:      it.name,
          cost:      "",
          speed:     "",
          macroName: it.system.macroName.trim(),
          desc:      it.system?.effect ?? it.system?.desc ?? "",
          icon:      it.img && !it.img.includes("mystery-man") ? it.img : "",
          qty:       it.system?.qty ?? it.system?.quantity ?? it.system?.charges ?? null,
        }));
    }
    return (actor.system?.abilities?.[groupId] ?? []).filter(a => a?.name?.trim());
  }

  static _visibleCategories() {
    const actor = DawnbreakerHUD.currentActor;
    if (!actor) return [];
    const coreCat = { id: "core", label: "Core", icon: "▣", tag: "COR" };
    if (actor.type === "companion") return [coreCat];
    if (actor.type === "npc") {
      const cats = [coreCat];
      const attacks = DawnbreakerHUD._getAbilities("npcAttacks");
      if (attacks.length) cats.push({ id: "npcAttacks", label: "Attacks", icon: "◆", tag: "ATK" });
      return cats;
    }
    const cats = [coreCat, ...CATEGORIES.filter(cat => cat.id !== "core" && DawnbreakerHUD._getAbilities(cat.id).length > 0)];
    if (DawnbreakerHUD._getAbilities("inventory").length > 0)
      cats.push({ id: "inventory", label: "Inventory", icon: "⬡", tag: "INV" });
    return cats;
  }

  // ── Render main ────────────────────────────────────────────────────────────

  static _renderMain() {
    const actor = DawnbreakerHUD.currentActor;
    if (!actor) return;

    let root = document.getElementById(HUD_ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = HUD_ROOT_ID;
      (document.getElementById("interface") ?? document.body).appendChild(root);
    }

    const img      = DawnbreakerHUD.currentToken?.document?.texture?.src ?? actor.img ?? "";
    const cats     = DawnbreakerHUD._visibleCategories();
    const inCombat = DawnbreakerHUD._inCombat();
    const myTurn   = inCombat && DawnbreakerHUD._isMyTurn();

    const turnHtml = inCombat
      ? `<span class="dbt-turn-badge ${myTurn ? "dbt-turn-active" : "dbt-turn-waiting"}">${myTurn ? "● ACTIVE" : "○ STANDBY"}</span>`
      : `<span class="dbt-turn-badge dbt-turn-idle">◌ FREE</span>`;

    const btnsHtml = cats.length
      ? cats.map((cat, i) => {
          const isActive = DawnbreakerHUD.activeCategory === cat.id;
          return `<button class="dbt-cat-btn${i === 0 ? " dbt-hero" : ""}${isActive ? " dbt-active" : ""}"
                          onclick="DawnbreakerHUD.toggleCategory('${cat.id}')">
            <span class="dbt-cat-tag">${cat.tag}</span>
            <span class="dbt-cat-label">${cat.label}<span class="dbt-dot">.</span></span>
            <span class="dbt-cat-icon">${cat.icon}</span>
          </button>`;
        }).join("")
      : `<div class="dbt-empty-state"><span class="dbt-empty-tag">SYS</span><span class="dbt-empty-text">No abilities configured</span></div>`;

    root.innerHTML = `
      <div class="dbt-hud-header" id="dbt-hud-drag-handle">
        <div class="dbt-header-sys">DBT <span class="dbt-sys-ver">ACT</span></div>
        <img class="dbt-portrait" src="${img}" onclick="DawnbreakerHUD.openSheet()" title="Open Sheet">
        <div class="dbt-header-info">
          <span class="dbt-actor-name">${DawnbreakerHUD.currentToken?.document?.name ?? DawnbreakerHUD.currentToken?.name ?? actor.name}<span class="dbt-dot">.</span></span>
          <span class="dbt-actor-type">${actor.type.toUpperCase()}</span>
          ${turnHtml}
        </div>
      </div>
      <div class="dbt-cats">${btnsHtml}</div>`;

    DawnbreakerHUD._positionOnPartyHUD();
    DawnbreakerHUD._repositionSub(root);
    DawnbreakerHUD._makeHudDraggable(root);
  }

  // ── Render sub ─────────────────────────────────────────────────────────────

  static _renderSub() {
    const catId = DawnbreakerHUD.activeCategory;
    if (!catId) return;
    const root = document.getElementById(HUD_ROOT_ID);
    if (!root) return;

    let sub = document.getElementById(HUD_SUB_ID);
    if (!sub) {
      sub = document.createElement("div");
      sub.id = HUD_SUB_ID;
      (document.getElementById("interface") ?? document.body).appendChild(sub);
    }

    DawnbreakerHUD._repositionSub(root);

    const allCats   = [...CATEGORIES, { id: "npcAttacks", label: "Attacks", icon: "◆", tag: "ATK" }, { id: "core", label: "Core", icon: "▣", tag: "COR" }, { id: "inventory", label: "Inventory", icon: "⬡", tag: "INV" }];
    const cat       = allCats.find(c => c.id === catId) ?? { label: catId, tag: "ACT", icon: "◆" };
    const abilities = DawnbreakerHUD._getAbilities(catId);

    const actor   = DawnbreakerHUD.currentActor;
    const rowsHtml = abilities.length
      ? abilities.map((ab, i) => {
          const mn    = (ab.macroName || ab.name || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
          const desc  = (ab.desc || "").replace(/"/g, "&quot;").replace(/\n/g, " ");
          const cost  = ab.cost  ? `<span class="dbt-ab-cost">${ab.cost}<span class="dbt-cost-unit"> AP</span></span>` : "";
          const speed = ab.speed ? `<span class="dbt-ab-speed">⏱${ab.speed}</span>` : "";
          const qty   = ab.qty != null ? `<span class="dbt-ab-qty">×${ab.qty}</span>` : "";
          const item      = actor?.items?.find(it => it.name === ab.name);
          const kiCost    = item?.system?.kiCost ?? ab.kiCost ?? null;
          const ki        = (kiCost != null && kiCost > 0) ? `<span class="dbt-ab-ki">${kiCost}<span class="dbt-cost-unit"> KI</span></span>` : "";
          const itemIcon  = item?.img && !item.img.includes("mystery-man") ? item.img : "";
          const macroIcon = (() => { const m = game.macros?.find(m => m.name === (ab.macroName || ab.name)); return m?.img && !m.img.includes("mystery-man") ? m.img : ""; })();
          const icon      = ab.icon || itemIcon || macroIcon;
          const onclick = catId === "inventory"
            ? `DawnbreakerHUD.executeInventoryItem('${mn}')`
            : `DawnbreakerHUD.executeAbility('${mn}')`;
          return `<div class="dbt-ab-row" onclick="${onclick}" title="${desc}">
            ${icon ? `<img class="dbt-ab-icon" src="${icon}" alt="">` : `<span class="dbt-ab-icon-gap"></span>`}
            <span class="dbt-ab-name">${ab.name}<span class="dbt-dot">.</span></span>
            <span class="dbt-ab-meta">${cost}${ki}${speed}${qty}</span>
          </div>`;
        }).join("")
      : `<div class="dbt-ab-row dbt-ab-empty"><span class="dbt-ab-idx">--</span><span class="dbt-ab-name dbt-ab-empty-text">No abilities</span></div>`;

    sub.innerHTML = `
      <div class="dbt-sub-header"><span class="dbt-sub-tag">${cat.tag}</span><span class="dbt-sub-title">${cat.label}<span class="dbt-dot">.</span></span><span class="dbt-sub-icon">${cat.icon}</span></div>
      <div class="dbt-ab-list">${rowsHtml}</div>`;
  }

  // ── Positioning ────────────────────────────────────────────────────────────

  /** Docks action menu to the top-right of the party panel.
   *  Falls back to right of CTB display, or a fixed position if neither is visible. */
  static _positionOnPartyHUD() {
    const root = document.getElementById(HUD_ROOT_ID);
    if (!root) return;

    const party = document.getElementById(PARTY_ROOT_ID);
    if (party && party.style.display !== "none") {
      const pr = party.getBoundingClientRect();
      root.style.top    = `${Math.round(pr.top)}px`;
      root.style.left   = `${Math.round(pr.right + 6)}px`;
      root.style.bottom = "auto";
      return;
    }

    // Fallback: dock to CTB display
    const ctb = document.getElementById("ctb-display");
    if (ctb) {
      const cr = ctb.getBoundingClientRect();
      root.style.top    = `${Math.round(cr.top)}px`;
      root.style.left   = `${Math.round(cr.right + 6)}px`;
      root.style.bottom = "auto";
      return;
    }

    // Last resort: fixed position bottom-left
    root.style.bottom = "80px";
    root.style.left   = "10px";
    root.style.top    = "auto";
  }

  static _repositionSub(root) {
    const sub = document.getElementById(HUD_SUB_ID);
    if (!sub || !root) return;
    const rr   = root.getBoundingClientRect();
    const subW = 290;
    let left   = rr.right + 6;
    if (left + subW > window.innerWidth - 10) left = rr.left - subW - 6;
    sub.style.left = `${left}px`;
    sub.style.top  = `${rr.top}px`;
  }

  static _makeHudDraggable(root) {
    const handle = root.querySelector("#dbt-hud-drag-handle");
    if (!handle) return;
    handle.style.cursor = "grab";
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const { left: sl, top: st } = root.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY;
      handle.style.cursor = "grabbing";
      const onMove = (ev) => {
        root.style.left   = `${sl + (ev.clientX - startX)}px`;
        root.style.top    = `${st + (ev.clientY - startY)}px`;
        root.style.bottom = "auto";
        DawnbreakerHUD._repositionSub(root);
      };
      const onUp = () => {
        handle.style.cursor = "grab";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup",   onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup",   onUp);
    });
  }

  // ── User actions ───────────────────────────────────────────────────────────

  static toggleCategory(catId) {
    if (DawnbreakerHUD.activeCategory === catId) {
      DawnbreakerHUD.activeCategory = null;
      document.getElementById(HUD_SUB_ID)?.remove();
    } else {
      DawnbreakerHUD.activeCategory = catId;
      DawnbreakerHUD._renderSub();
    }
    DawnbreakerHUD._renderMain();
  }

  static async executeAbility(macroName) {
    if (!macroName) return;
    if (DawnbreakerHUD._inCombat() && !DawnbreakerHUD._isMyTurn()) {
      const DialogClass = foundry.appv1?.applications?.Dialog ?? Dialog;
      const confirmed   = await new Promise(resolve => {
        new DialogClass({
          title: "STANDBY — Not Your Turn",
          content: `<div style="font-family:'Rajdhani',sans-serif;padding:4px 0">
            <p style="margin:0 0 6px;color:#7080a0;font-size:.85em;letter-spacing:.05em;text-transform:uppercase">System Notice</p>
            <p style="margin:0 0 10px;color:#e8e8e8">It is not currently your turn in the CTB order.</p>
            <p style="margin:0;color:#c8b820;font-weight:700">◆ Execute <em>${macroName}</em> out of turn?</p>
          </div>`,
          buttons: {
            yes: { icon: '<i class="fas fa-check"></i>', label: "Execute", callback: () => resolve(true)  },
            no:  { icon: '<i class="fas fa-times"></i>', label: "Abort",   callback: () => resolve(false) },
          },
          default: "no", close: () => resolve(false),
        }).render(true);
      });
      if (!confirmed) return;
    }
    const macro = game.macros.find(m => m.name === macroName);
    if (macro) await macro.execute({ actor: DawnbreakerHUD.currentActor, token: DawnbreakerHUD.currentToken?.document });
    else ui.notifications.warn(`Dawnbreaker HUD: No macro named "${macroName}".`);
  }

  static async executeInventoryItem(macroName) {
    if (!macroName) return;
    const actor = DawnbreakerHUD.currentActor;
    const item  = actor?.items?.find(it => it.name === macroName);
    const qty   = item?.system?.qty ?? item?.system?.quantity ?? item?.system?.charges ?? null;
    const qtyText = qty != null ? ` <span style="color:var(--ark-cyan)">×${qty} remaining</span>` : "";
    const icon  = item?.img && !item.img.includes("mystery-man") ? `<img src="${item.img}" style="width:32px;height:32px;object-fit:contain;border-radius:3px;vertical-align:middle;margin-right:8px;">` : "";

    const DialogClass = foundry.appv1?.applications?.Dialog ?? Dialog;
    const confirmed = await new Promise(resolve => {
      new DialogClass({
        title: "USE ITEM",
        content: `<div style="font-family:'Rajdhani',sans-serif;padding:4px 0">
          <p style="margin:0 0 6px;color:#7080a0;font-size:.85em;letter-spacing:.05em;text-transform:uppercase">Inventory — Confirm Use</p>
          <p style="margin:0 0 10px;color:#e8e8e8;display:flex;align-items:center">${icon}<b>${macroName}</b>${qtyText}</p>
          <p style="margin:0;color:#a0a8b8;font-size:.9em">Use this item?</p>
        </div>`,
        buttons: {
          yes: { icon: '<i class="fas fa-check"></i>', label: "Use",    callback: () => resolve(true)  },
          no:  { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(false) },
        },
        default: "yes", close: () => resolve(false),
      }).render(true);
    });
    if (!confirmed) return;
    await DawnbreakerHUD.executeAbility(macroName);
  }

  static openSheet() { DawnbreakerHUD.currentActor?.sheet?.render(true); }

  // ── Style injection ────────────────────────────────────────────────────────

  static _injectStyles() {
    if (document.getElementById("dbt-hud-css")) return;
    const el = document.createElement("style");
    el.id = "dbt-hud-css";
    el.textContent = DBT_HUD_CSS;
    document.head.appendChild(el);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  DawnbreakerGuestHUD  —  compact companion/guest panel
// ─────────────────────────────────────────────────────────────────────────────

class DawnbreakerGuestHUD {
  static get _actorIds() {
    try { return game.settings.get(NS, "guestHudActors") ?? []; } catch(e) { return []; }
  }

  static get actors() {
    return this._actorIds.map(id => game.actors.get(id)).filter(Boolean);
  }

  static isGuest(id) {
    try { return (game.settings.get(NS, "guestHudActors") ?? []).includes(id); } catch(e) { return false; }
  }

  static async addGuest(id) {
    if (this.isGuest(id)) return;
    await game.settings.set(NS, "guestHudActors", [...this._actorIds, id]);
    this.render();
  }

  static async removeGuest(id) {
    await game.settings.set(NS, "guestHudActors", this._actorIds.filter(x => x !== id));
    this.render();
  }

  static render() {
    const actors = this.actors;
    if (!actors.length) { this._destroy(); return; }

    let root = document.getElementById(GUEST_ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = GUEST_ROOT_ID;
      (document.getElementById("interface") ?? document.body).appendChild(root);
    }

    root.innerHTML = `<div class="dbt-guest-header"><span class="dbt-guest-header-sys">DBT</span><span class="dbt-guest-header-title">GUESTS<span class="dbt-dot">.</span></span><span class="dbt-guest-header-count">${String(actors.length).padStart(2,"0")}</span></div>` + actors.map(a => this._buildCardHtml(a)).join("");
    this._startObserver();
    this._attachClicks(root);
  }

  static _attachClicks(root) {
    root.addEventListener("click", (e) => {
      const box = e.target.closest(".dbt-guest-box");
      if (!box) return;
      const card = box.closest(".dbt-guest-card");
      if (!card) return;
      const actor = game.actors.get(card.dataset.actorId);
      if (!actor) return;
      if (!game.user.isGM && !actor.isOwner) return;
      e.stopPropagation();
      const isHp = box.classList.contains("dbt-guest-box-hp");
      const isAr = box.classList.contains("dbt-guest-box-ar");
      const isKi = box.classList.contains("dbt-guest-box-ki");
      const label = isHp ? "HP" : isAr ? "AR" : "KI";
      const cur   = isHp ? (actor.system?.hp?.current ?? 0)
                  : isAr ? (actor.system?.ar?.current ?? 0)
                  :        (actor.system?.ki?.current ?? 0);
      this._showPopup(box, label, cur, async (val) => {
        if (isHp) await actor.update({ "system.hp.current": Math.max(0, val) });
        if (isAr) await actor.update({ "system.ar.current": Math.max(0, val) });
        if (isKi) await actor.update({ "system.ki.current": Math.max(0, val) });
      });
    });
  }

  static _showPopup(anchor, label, currentVal, onCommit) {
    document.getElementById("dbt-bar-popup")?.remove();
    const br  = anchor.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.id    = "dbt-bar-popup";
    pop.innerHTML = `
      <div class="dbt-popup-label">${label}</div>
      <input class="dbt-popup-input" type="number" value="${Math.round(currentVal)}" min="0"/>
      <div class="dbt-popup-hint">↵ confirm · Esc cancel</div>`;
    pop.style.cssText = `position:fixed;left:${Math.round(br.left)}px;top:${Math.round(br.top - 66)}px;z-index:9999;`;
    document.body.appendChild(pop);
    const input = pop.querySelector(".dbt-popup-input");
    input.focus(); input.select();
    const close = () => pop.remove();
    const commit = async () => {
      const val = parseInt(input.value);
      if (!isNaN(val)) await onCommit(val);
      close();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); close();  }
    });
    const outside = (e) => { if (!pop.contains(e.target)) { close(); document.removeEventListener("mousedown", outside); } };
    setTimeout(() => document.addEventListener("mousedown", outside), 0);
  }

  static _buildCardHtml(actor) {
    const sys    = actor.system ?? {};
    const hp     = sys.hp ?? {};
    const ar     = sys.ar ?? {};
    const ki     = sys.ki ?? {};
    const hpCur  = hp.current ?? 0;
    const hpMax  = Math.max(1, hp.max ?? 1);
    const arCur  = ar.current ?? 0;
    const kiCur  = ki.current ?? 0;
    const hpPct  = (hpCur / hpMax) * 100;
    const isDown = hpCur <= 0;
    const isCrit = hpPct < 25 && !isDown;
    const portrait = actor.img ?? "icons/svg/mystery-man.svg";
    const stateClass = isDown ? " dbt-guest-down" : isCrit ? " dbt-guest-crit" : "";
    const kiStr = (ki.max ?? 0) > 0 ? `<span class="dbt-guest-ki">${kiCur}</span>` : `<span class="dbt-guest-ki dbt-guest-ki-null">—</span>`;
    return `
    <div class="dbt-guest-card${stateClass}" data-actor-id="${actor.id}">
      <img class="dbt-guest-portrait" src="${portrait}" title="${actor.name}">
      <div class="dbt-guest-body">
        <div class="dbt-guest-name">${actor.name}<span class="dbt-dot">.</span></div>
        <div class="dbt-guest-stats">
          <span class="dbt-guest-box dbt-guest-box-hp${isCrit ? " dbt-guest-box-hp-crit" : ""}${isDown ? " dbt-guest-box-hp-down" : ""}">${hpCur}</span>
          <span class="dbt-guest-box dbt-guest-box-ar${arCur === 0 ? " dbt-guest-box-ar-brk" : ""}">${arCur === 0 ? "BRK" : arCur}</span>
          <span class="dbt-guest-box dbt-guest-box-ki${(ki.max ?? 0) === 0 ? " dbt-guest-box-ki-null" : ""}">${(ki.max ?? 0) > 0 ? kiCur : "—"}</span>
        </div>
        ${isDown ? '<div class="dbt-guest-down-label">DOWN</div>' : ""}
      </div>
      ${game.user?.isGM ? `<button class="dbt-guest-remove" title="Remove from Guest Panel" onclick="DawnbreakerGuestHUD.removeGuest('${actor.id}')">×</button>` : ""}
    </div>`;
  }

  static updateCard(actor) {
    const card = document.querySelector(`#${GUEST_ROOT_ID} [data-actor-id="${actor.id}"]`);
    if (!card) return;
    card.outerHTML = this._buildCardHtml(actor);
  }

  static _reposition() {
    const root = document.getElementById(GUEST_ROOT_ID);
    if (!root) return;
    const party = document.getElementById(PARTY_ROOT_ID);
    if (!party) return;
    const pr = party.getBoundingClientRect();
    if (!pr.width) return; // party not laid out yet — observer will retry
    const gw = root.offsetWidth || 180;
    root.style.left   = `${Math.round(pr.left - gw)}px`;
    root.style.top    = "auto";
    root.style.bottom = `${Math.round(window.innerHeight - pr.bottom)}px`;
  }

  static _startObserver() {
    // Disconnect any previous observer
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    if (this._mo) { this._mo.disconnect(); this._mo = null; }
    const party = document.getElementById(PARTY_ROOT_ID);
    if (!party) return;
    // ResizeObserver: fires when party HUD changes height (cards added/removed)
    this._ro = new ResizeObserver(() => this._reposition());
    this._ro.observe(party);
    // MutationObserver: fires when party HUD is dragged (style.left/top changes)
    this._mo = new MutationObserver(() => this._reposition());
    this._mo.observe(party, { attributes: true, attributeFilter: ["style"] });
  }

  static _destroy() {
    document.getElementById(GUEST_ROOT_ID)?.remove();
  }
}

window.DawnbreakerGuestHUD = DawnbreakerGuestHUD;

// ─────────────────────────────────────────────────────────────────────────────
//  CSS  —  Arknights Endfield theme (party cards + action menu)
// ─────────────────────────────────────────────────────────────────────────────

const DBT_HUD_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');

/* ═══════════════ Variables ═══════════════ */
#dbt-party-root, #dbt-hud-root, #dbt-hud-sub {
  --ark-bg:     #0e1117;
  --ark-panel:  #161b24;
  --ark-panel2: #1c2230;
  --ark-border: rgba(200,215,230,0.12);
  --ark-border2:rgba(200,215,230,0.06);
  --ark-yellow: #c8b820;
  --ark-yellow2:#e8d840;
  --ark-cyan:   #00c8de;
  --ark-cyan2:  #40e0f0;
  --ark-green:  #3de89a;
  --ark-orange: #e87830;
  --ark-red:    #e03040;
  --ark-white:  #e8eaf0;
  --ark-gray:   #7080a0;
  --ark-gray2:  #404a60;
  --ark-font:   'Rajdhani','Segoe UI',sans-serif;
  --ark-mono:   'Share Tech Mono',monospace;
}
.dbt-dot { color: var(--ark-yellow); font-weight: 700; }

/* ═══════════════ PARTY ROOT PANEL ═══════════════ */
#dbt-party-root {
  position: fixed;
  z-index: 68;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  user-select: none;
  font-family: var(--ark-font);
  animation: dbt-fadein 0.35s ease both;
  --dbt-cards-max: calc(10 * 82px);
}
#dbt-cards-list::-webkit-scrollbar       { width: 3px; }
#dbt-cards-list::-webkit-scrollbar-thumb { background: var(--ark-yellow); }
#dbt-cards-list::-webkit-scrollbar-track { background: var(--ark-bg); }
@keyframes dbt-fadein {
  from { opacity:0; transform:translateY(6px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes dbt-hp-crit-pulse {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.3; }
}
.dbt-hp-crit-blink { animation: dbt-hp-crit-pulse 1s ease-in-out infinite; }

/* Party header */
#dbt-party-header {
  background: var(--ark-panel);
  border: 1px solid var(--ark-border);
  border-left: 2px solid var(--ark-yellow);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: grab;
  position: relative;
  clip-path: polygon(6px 0,100% 0,100% 100%,0 100%,0 6px);
  transition: background .2s, border-color .2s;
}
#dbt-party-header.dbt-party-header-combat {
  background: #1a0808;
  border-color: rgba(200,40,40,.5);
  border-left-color: var(--ark-red);
}
#dbt-party-header.dbt-party-header-combat::after {
  border-color: var(--ark-red) !important;
}
#dbt-party-header.dbt-party-header-combat .dbt-party-sys { color: var(--ark-red); }
#dbt-party-header.dbt-party-header-combat .dbt-dot { color: var(--ark-red); }
#dbt-party-header:active { cursor: grabbing; }
#dbt-party-header::after {
  content:''; position:absolute; bottom:0; right:0;
  width:6px; height:6px;
  border-bottom:1px solid var(--ark-yellow);
  border-right:1px solid var(--ark-yellow);
}
.dbt-party-sys {
  font-family: var(--ark-mono);
  font-size: .69em;
  color: var(--ark-yellow);
  letter-spacing: .1em;
  opacity: .7;
}
.dbt-party-minimize-btn {
  background: none;
  border: 1px solid var(--ark-border);
  color: var(--ark-yellow);
  font-size: .7em;
  line-height: 1;
  padding: 2px 5px;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 2px;
  opacity: .75;
  transition: opacity .15s, background .15s;
}
.dbt-party-minimize-btn:hover { opacity: 1; background: rgba(255,255,255,.06); }
.dbt-party-scan-btn {
  background: none;
  border: 1px solid var(--ark-border);
  color: var(--ark-cyan);
  font-size: .7em;
  line-height: 1;
  padding: 2px 5px;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 2px;
  opacity: .5;
  margin-left: 3px;
  transition: opacity .15s, background .15s, color .15s;
}
.dbt-party-scan-btn:hover { opacity: .85; background: rgba(255,255,255,.06); }
.dbt-party-scan-btn.active {
  opacity: 1;
  color: var(--ark-cyan2);
  border-color: var(--ark-cyan);
  background: rgba(0,200,222,.14);
  box-shadow: 0 0 6px rgba(0,200,222,.35);
}
#dbt-party-root.dbt-party-minimized .dbt-cards-list,
#dbt-party-root.dbt-party-minimized .dbt-combat-bar { display: none; }
.dbt-party-title {
  font-size: 1.15em;
  font-weight: 700;
  color: var(--ark-white);
  text-transform: uppercase;
  letter-spacing: .06em;
  flex: 1;
}
.dbt-party-designation {
  color: var(--ark-yellow);
  font-weight: 700;
  letter-spacing: .06em;
}
.dbt-party-designation[title]:not([title=""]) { cursor: text; }
.dbt-designation-input {
  font-family: var(--ark-mono);
  font-size: .72em;
  color: var(--ark-yellow);
  background: rgba(200,168,32,.12);
  border: 1px solid var(--ark-yellow);
  outline: none;
  padding: 1px 4px;
  letter-spacing: .12em;
  width: 80px;
  border-radius: 2px;
}
.dbt-party-count {
  font-family: var(--ark-mono);
  font-size: .86em;
  color: var(--ark-cyan);
  letter-spacing: .05em;
}

/* Combat action bar */
.dbt-combat-bar {
  display: flex;
  gap: 2px;
  padding: 0;
}
.dbt-cbtn {
  flex: 1;
  padding: 5px 2px;
  font-family: var(--ark-font);
  font-size: .69em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  cursor: pointer;
  background: var(--ark-panel2);
  border: 1px solid var(--ark-border);
  color: var(--ark-gray);
  transition: background .12s, color .12s;
}
.dbt-cbtn:hover { background: var(--ark-panel); color: var(--ark-white); }
.dbt-cbtn-end   { border-color: var(--ark-cyan); color: var(--ark-cyan); }
.dbt-cbtn-end:hover { background: var(--ark-cyan); color: var(--ark-bg); }
.dbt-cbtn-danger { border-color: rgba(224,48,64,.4); color: var(--ark-red); }
.dbt-cbtn-danger:hover { background: var(--ark-red); color: var(--ark-white); }

/* ═══════════════ ACTOR CARD ═══════════════ */
.dbt-card {
  position: relative;
  background: var(--ark-panel);
  border: 1px solid var(--ark-border);
  border-left: 2px solid var(--ark-border);
  display: flex;
  align-items: flex-start;
  overflow: hidden;
  transition: border-color .2s;
  clip-path: polygon(5px 0,100% 0,100% 100%,0 100%,0 5px);
}
.dbt-card-npc { border-left-color: var(--ark-gray2); opacity: .9; }

.dbt-remove-combatant {
  position: absolute;
  bottom: 2px;
  right: 3px;
  width: 14px;
  height: 14px;
  padding: 0;
  line-height: 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--ark-gray2);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  z-index: 3;
  transition: color .15s, border-color .15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dbt-remove-combatant:hover {
  color: var(--ark-red);
  border-color: rgba(224,48,64,.4);
  background: rgba(224,48,64,.08);
}
/* corner brackets */
.dbt-card::before {
  content:''; position:absolute; top:0; left:0;
  width:6px; height:6px;
  border-top:1px solid var(--ark-gray2);
  border-left:1px solid var(--ark-gray2);
  z-index:2; pointer-events:none;
  transition: border-color .2s;
}
.dbt-card::after {
  content:''; position:absolute; bottom:0; right:0;
  width:6px; height:6px;
  border-bottom:1px solid var(--ark-gray2);
  border-right:1px solid var(--ark-gray2);
  z-index:2; pointer-events:none;
  transition: border-color .2s;
}

/* ── State classes ── */
/* Bloodied (<50% HP) */
.dbt-card.dbt-card-bloodied { border-left-color: var(--ark-orange); }
.dbt-card.dbt-card-bloodied::before,
.dbt-card.dbt-card-bloodied::after { border-color: var(--ark-orange); }
.dbt-card.dbt-card-bloodied .dbt-hp-fill { background: var(--ark-orange) !important; }

/* Critical (<25% HP) */
.dbt-card.dbt-card-critical { border-left-color: var(--ark-red); }
.dbt-card.dbt-card-critical::before,
.dbt-card.dbt-card-critical::after { border-color: var(--ark-red); }
.dbt-card.dbt-card-critical .dbt-hp-fill { background: var(--ark-red) !important; }

/* Down (0 HP) */
.dbt-card.dbt-card-down { border-left-color: var(--ark-gray2); opacity: .7; }
.dbt-card.dbt-card-down .dbt-card-portrait { filter: grayscale(1) brightness(.6); }
.dbt-card-down-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ark-mono);
  font-size: .65em;
  font-weight: 700;
  color: var(--ark-red);
  letter-spacing: .12em;
  background: rgba(0,0,0,.4);
}

/* ── ACTIVE TURN — SUPER HIGHLIGHTED ── */
.dbt-card.dbt-card-active-turn {
  border-color: var(--ark-yellow) !important;
  border-left-width: 3px !important;
  border-left-color: var(--ark-yellow) !important;
  background: #1e2010 !important;
  animation: dbt-turn-pulse 1.8s ease-in-out infinite;
}
.dbt-card.dbt-card-active-turn::before,
.dbt-card.dbt-card-active-turn::after { border-color: var(--ark-yellow) !important; }
.dbt-card.dbt-card-active-turn .dbt-card-portrait {
  border-color: var(--ark-yellow) !important;
  box-shadow: 0 0 10px var(--ark-yellow), 0 0 20px rgba(200,184,32,.4);
}
.dbt-card.dbt-card-active-turn .dbt-card-name { color: var(--ark-yellow) !important; }
.dbt-card.dbt-card-active-turn .dbt-card-turn-glow {
  opacity: 1;
  animation: dbt-glow-pulse 1.8s ease-in-out infinite;
}

@keyframes dbt-turn-pulse {
  0%,100% { box-shadow: 0 0 8px rgba(200,184,32,.3); }
  50%      { box-shadow: 0 0 18px rgba(200,184,32,.6), 0 0 32px rgba(200,184,32,.2); }
}
@keyframes dbt-glow-pulse {
  0%,100% { opacity:.4; }
  50%      { opacity:.9; }
}

/* Portrait — locked to top of card; body extends independently */
.dbt-card-portrait-wrap {
  position: relative;
  width: 100px;
  flex-shrink: 0;
  align-self: flex-start;
  overflow: visible;
  background: transparent;
}
.dbt-card-portrait {
  width: 100px;
  height: 100px;
  object-fit: contain;
  object-position: top center;
  display: block;
  background: transparent;
  border-right: 1px solid var(--ark-border);
  transition: border-color .2s, box-shadow .2s;
}
.dbt-card-turn-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(200,184,32,.3) 0%, transparent 70%);
  opacity: 0;
  pointer-events: none;
  transition: opacity .3s;
}

/* Card body */
.dbt-card-body {
  flex: 1;
  padding: 6px 9px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  overflow: hidden;
  min-width: 0;
}
.dbt-card-name {
  font-size: 1.09em;
  font-weight: 700;
  color: var(--ark-white);
  text-transform: uppercase;
  letter-spacing: .04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
  cursor: pointer;
  transition: color .2s;
}
.dbt-status-tag { font-size: .72em; font-weight: 700; letter-spacing: .04em; white-space: nowrap; }
.dbt-crit-tag   { color: var(--ark-red); }
.dbt-down-tag   { color: var(--ark-gray); }
.dbt-captain-badge { color: #f5c542; font-size: .85em; text-shadow: 0 0 4px #f5c54288; }

/* ═══════════════ CAPTAIN CARD ═══════════════ */
.dbt-card.dbt-card-captain {
  border: 1px solid #c8a820;
  border-left: 3px solid #f5c542;
  background: linear-gradient(135deg, #1a1a0e 0%, #1c1c10 60%, #201e08 100%);
  box-shadow: 0 0 8px rgba(200,168,32,.18), inset 0 0 20px rgba(200,168,32,.04);
}
.dbt-card.dbt-card-captain::before,
.dbt-card.dbt-card-captain::after {
  border-color: #f5c542 !important;
  width: 10px !important;
  height: 10px !important;
}
.dbt-card.dbt-card-captain .dbt-card-portrait {
  border-right-color: #c8a820;
  box-shadow: 0 0 6px rgba(200,168,32,.35);
}
.dbt-card.dbt-card-captain .dbt-card-name {
  color: #f0d060;
}

/* Thin decorative top stripe */
.dbt-captain-stripe {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #f5c542 0%, #c8a820 40%, transparent 100%);
  z-index: 3;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding-left: 6px;
}
.dbt-captain-stripe span {
  font-family: var(--ark-mono);
  font-size: 7px;
  letter-spacing: .18em;
  color: #000;
  line-height: 1;
  margin-top: 1px;
  opacity: .7;
  pointer-events: none;
}

/* Gold corner frame overlay on portrait */
.dbt-captain-portrait-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  box-shadow:
    inset  2px  2px 0 1px #f5c542,
    inset -2px -2px 0 1px #c8a820;
  border-radius: 1px;
}

/* Subtle shimmer animation on captain card */
@keyframes dbt-captain-shimmer {
  0%   { opacity: 0; transform: translateX(-100%); }
  30%  { opacity: .18; }
  60%  { opacity: 0; transform: translateX(100%); }
  100% { opacity: 0; transform: translateX(100%); }
}
.dbt-card.dbt-card-captain::before {
  animation: none;
}
.dbt-card.dbt-card-captain .dbt-card-body::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(245,197,66,.07) 50%, transparent 60%);
  animation: dbt-captain-shimmer 6s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}
.dbt-status-null {
  font-family: var(--ark-mono);
  font-size: 1em;
  font-weight: 700;
  color: var(--ark-red);
  letter-spacing: .08em;
  padding: 4px 0 2px;
  text-align: center;
  width: 100%;
}

/* ── BARS ── */
.dbt-card-bars { display: flex; flex-direction: column; gap: 2px; }

.dbt-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background .3s;
  border-radius: 0;
}
.dbt-bar-label {
  font-family: var(--ark-mono);
  font-size: .83em;
  color: var(--ark-gray);
  width: 20px;
  flex-shrink: 0;
  letter-spacing: .05em;
}
.dbt-bar-track {
  flex: 1;
  height: 9px;
  background: var(--ark-gray2);
  overflow: hidden;
  position: relative;
}
.dbt-bar-fill {
  height: 100%;
  transition: width .4s ease;
}
.dbt-hp-fill   { background: #e03040; }
.dbt-ar-fill   { background: #3070e8; }
.dbt-ki-fill   { background: var(--ark-green); }
.dbt-turn-fill  { background: var(--ark-yellow); }
.dbt-turn-bar   { margin-top: 1px; }

/* AR — broken (0 AR) */
.dbt-ar-broken .dbt-bar-track {
  background: repeating-linear-gradient(
    -45deg,
    rgba(224,48,64,.15) 0px, rgba(224,48,64,.15) 3px,
    rgba(0,0,0,.3) 3px, rgba(0,0,0,.3) 6px
  );
}
.dbt-ar-broken .dbt-ar-fill { background: rgba(224,48,64,.25); }
.dbt-ar-broken .dbt-bar-label { color: var(--ark-red) !important; }
.dbt-ar-brk-label { color: var(--ark-red); font-family: var(--ark-mono); font-weight: 700; font-size: 1em; letter-spacing: .05em; }

/* KI — null (max KI = 0) */
.dbt-ki-null .dbt-bar-track { background: rgba(0,0,0,.2); }
.dbt-ki-null .dbt-ki-fill { display: none; }
.dbt-ki-null .dbt-bar-label { color: var(--ark-gray2) !important; }
.dbt-ki-null-label { color: var(--ark-gray2); font-family: var(--ark-mono); font-style: italic; font-size: .9em; letter-spacing: .04em; }
.dbt-turn-label { color: var(--ark-yellow) !important; font-weight: 700; }
.dbt-turn-val   { color: var(--ark-yellow) !important; font-weight: 700; width: 52px !important; }

.dbt-bar-val {
  font-family: var(--ark-mono);
  font-size: .83em;
  color: var(--ark-white);
  width: 52px;
  text-align: right;
  flex-shrink: 0;
  white-space: nowrap;
}
.dbt-bar-max { color: var(--ark-gray); }
.dbt-hpval-warn { color: var(--ark-yellow) !important; }
.dbt-hpval-crit { color: var(--ark-red) !important; }
.dbt-hpval-down { color: var(--ark-gray) !important; }

/* Bar flash on HP/AR/KI change */
@keyframes dbt-bar-flash-anim {
  0%   { background: rgba(255,255,255,.2); }
  100% { background: transparent; }
}
.dbt-bar-flash {
  animation: dbt-bar-flash-anim .7s ease-out;
  border-radius: 0;
}
.dbt-bar-flash .dbt-bar-fill { filter: brightness(1.8); }

/* ── BADGES ── */
.dbt-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 1px;
}
.dbt-num-badge {
  font-family: var(--ark-mono);
  font-size: .69em;
  color: var(--ark-gray);
  background: var(--ark-bg);
  border: 1px solid var(--ark-border2);
  padding: 1px 4px;
  white-space: nowrap;
}
.dbt-num-badge b { color: var(--ark-white); font-weight: 700; }
.dbt-ctb-badge   { border-color: rgba(0,200,222,.3); }
.dbt-ctb-badge b { color: var(--ark-cyan); }

/* ── CONDITIONS ── */
.dbt-card-conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 1px;
}
.dbt-cond-badge {
  font-family: var(--ark-mono);
  font-size: .63em;
  color: var(--ark-orange);
  background: rgba(232,120,48,.1);
  border: 1px solid rgba(232,120,48,.3);
  padding: 1px 3px;
  cursor: default;
  letter-spacing: .04em;
}

/* ═══════════════ ACTION MENU ROOT ═══════════════ */
#dbt-hud-root {
  position: fixed;
  z-index: 120;
  width: 210px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  user-select: none;
  font-family: var(--ark-font);
  animation: dbt-fadein .3s ease both;
}

/* HUD header */
.dbt-hud-header {
  position: relative;
  background: var(--ark-panel);
  border: 1px solid var(--ark-border);
  border-bottom: 2px solid var(--ark-yellow);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  overflow: hidden;
  clip-path: polygon(6px 0,100% 0,100% 100%,0 100%,0 6px);
}
.dbt-hud-header::after {
  content:''; position:absolute; bottom:0; right:0;
  width:7px; height:7px;
  border-bottom:1px solid var(--ark-yellow);
  border-right:1px solid var(--ark-yellow);
}
.dbt-header-sys {
  position:absolute; top:3px; right:8px;
  font-family:var(--ark-mono); font-size:.55em;
  color:var(--ark-gray2); letter-spacing:.08em; pointer-events:none;
}
.dbt-sys-ver { color:var(--ark-yellow); opacity:.7; }

.dbt-portrait {
  width:36px; height:36px; object-fit:cover;
  border:1px solid var(--ark-border); flex-shrink:0; cursor:pointer;
  background:var(--ark-bg); transition:border-color .2s;
  clip-path:polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px));
}
.dbt-portrait:hover { border-color:var(--ark-cyan); }

.dbt-header-info { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
.dbt-actor-name {
  font-size:1.1em; font-weight:700; color:var(--ark-white);
  text-transform:uppercase; letter-spacing:.04em; line-height:1;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.dbt-actor-type {
  font-family:var(--ark-mono); font-size:.55em;
  color:var(--ark-gray); letter-spacing:.12em; line-height:1;
}
.dbt-turn-badge {
  font-family:var(--ark-mono); font-size:.58em;
  font-weight:700; letter-spacing:.1em; line-height:1; margin-top:1px;
}
.dbt-turn-active  { color:var(--ark-cyan); }
.dbt-turn-waiting { color:var(--ark-gray); }
.dbt-turn-idle    { color:var(--ark-gray2); }

/* Category buttons */
.dbt-cats { display:flex; flex-direction:column; gap:2px; width:100%; }

.dbt-cat-btn {
  position:relative; width:100%; height:36px;
  background:var(--ark-panel); border:1px solid var(--ark-border);
  color:var(--ark-gray); cursor:pointer;
  display:flex; align-items:center; padding:0 10px; gap:7px;
  font-family:var(--ark-font); font-size:.9em; font-weight:600;
  letter-spacing:.04em; text-transform:uppercase;
  transition:background .12s,color .12s,border-color .12s;
  box-sizing:border-box; overflow:hidden; text-align:left;
  clip-path:polygon(5px 0,100% 0,100% 100%,0 100%,0 5px);
}
.dbt-cat-btn::before {
  content:''; position:absolute; top:0; left:0;
  width:5px; height:5px;
  border-top:1px solid var(--ark-gray2); border-left:1px solid var(--ark-gray2);
  transition:border-color .12s; pointer-events:none;
}
.dbt-cat-btn.dbt-hero { height:44px; font-size:1em; color:var(--ark-yellow); border-color:var(--ark-yellow); border-left:2px solid var(--ark-yellow); background:var(--ark-panel2); }
.dbt-cat-btn.dbt-hero::before { border-color:var(--ark-yellow); }
.dbt-cat-btn:not(.dbt-hero):not(.dbt-active):hover { background:var(--ark-panel2); color:var(--ark-white); }
.dbt-cat-btn:not(.dbt-hero):not(.dbt-active):hover::before { border-color:var(--ark-cyan); }
.dbt-cat-btn.dbt-hero:hover { background:var(--ark-yellow); color:var(--ark-bg); }
.dbt-cat-btn.dbt-active { background:rgba(0,200,222,.08) !important; color:var(--ark-cyan) !important; border-color:var(--ark-cyan) !important; border-left:2px solid var(--ark-cyan) !important; }
.dbt-cat-btn.dbt-active::before { border-color:var(--ark-cyan) !important; }

.dbt-cat-tag { font-family:var(--ark-mono); font-size:.58em; letter-spacing:.1em; color:var(--ark-gray2); flex-shrink:0; transition:color .12s; }
.dbt-cat-btn.dbt-hero   .dbt-cat-tag { color:var(--ark-yellow); opacity:.7; }
.dbt-cat-btn.dbt-active .dbt-cat-tag { color:var(--ark-cyan); opacity:.7; }
.dbt-cat-label { flex:1; }
.dbt-cat-icon  { font-size:.82em; opacity:.4; flex-shrink:0; transition:opacity .12s; }
.dbt-cat-btn:hover .dbt-cat-icon,
.dbt-cat-btn.dbt-active .dbt-cat-icon { opacity:1; }

.dbt-empty-state { background:var(--ark-panel); border:1px solid var(--ark-border2); padding:9px 10px; display:flex; align-items:center; gap:7px; }
.dbt-empty-tag   { font-family:var(--ark-mono); font-size:.58em; color:var(--ark-gray2); letter-spacing:.1em; }
.dbt-empty-text  { font-size:.78em; color:var(--ark-gray); font-style:italic; }

/* ═══════════════ SUB-MENU ═══════════════ */
#dbt-hud-sub {
  position:fixed; z-index:120; width:290px; max-height:420px;
  background:var(--ark-panel); border:1px solid var(--ark-border);
  display:flex; flex-direction:column; font-family:var(--ark-font);
  overflow:hidden;
  clip-path:polygon(8px 0,100% 0,100% 100%,0 100%,0 8px);
  animation:dbt-sub-in .18s ease both;
}
@keyframes dbt-sub-in {
  from { opacity:0; transform:translateX(-5px); }
  to   { opacity:1; transform:translateX(0); }
}
#dbt-hud-sub::before {
  content:''; position:absolute; top:0; left:0;
  width:8px; height:8px;
  border-top:1px solid var(--ark-yellow); border-left:1px solid var(--ark-yellow);
  z-index:2; pointer-events:none;
}
#dbt-hud-sub::after {
  content:''; position:absolute; bottom:0; right:0;
  width:8px; height:8px;
  border-bottom:1px solid var(--ark-yellow); border-right:1px solid var(--ark-yellow);
  z-index:2; pointer-events:none;
}
.dbt-sub-header {
  background:var(--ark-panel2); border-bottom:1px solid var(--ark-border);
  padding:6px 12px; display:flex; align-items:center; gap:7px; flex-shrink:0;
}
.dbt-sub-tag   { font-family:var(--ark-mono); font-size:.58em; color:var(--ark-yellow); opacity:.7; letter-spacing:.1em; }
.dbt-sub-title { font-size:.95em; font-weight:700; color:var(--ark-white); text-transform:uppercase; letter-spacing:.06em; flex:1; }
.dbt-sub-icon  { color:var(--ark-yellow); font-size:.8em; opacity:.6; }

.dbt-ab-list { overflow-y:auto; overflow-x:hidden; flex:1; }
.dbt-ab-list::-webkit-scrollbar       { width:3px; }
.dbt-ab-list::-webkit-scrollbar-thumb { background:var(--ark-yellow); }
.dbt-ab-list::-webkit-scrollbar-track { background:var(--ark-bg); }

.dbt-ab-row {
  display:flex; align-items:center; gap:9px;
  padding:7px 12px; border-bottom:1px solid var(--ark-border2);
  cursor:pointer; position:relative; transition:background .1s;
}
.dbt-ab-row:last-child { border-bottom:none; }
.dbt-ab-row::before {
  content:''; position:absolute; left:0; top:0; bottom:0;
  width:2px; background:var(--ark-cyan); opacity:0; transition:opacity .1s;
}
.dbt-ab-row:hover { background:rgba(0,200,222,.05); }
.dbt-ab-row:hover::before { opacity:1; }

.dbt-ab-icon { width:22px; height:22px; object-fit:contain; border-radius:3px; flex-shrink:0; border:1px solid rgba(0,200,222,.2); background:rgba(0,0,0,.3); }
.dbt-ab-icon-gap { width:22px; height:22px; flex-shrink:0; }

.dbt-ab-idx { font-family:var(--ark-mono); font-size:.6em; color:var(--ark-gray2); flex-shrink:0; width:18px; text-align:right; transition:color .1s; }
.dbt-ab-row:hover .dbt-ab-idx { color:var(--ark-cyan); }

.dbt-ab-name { font-size:.88em; font-weight:600; color:var(--ark-gray); letter-spacing:.03em; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-transform:uppercase; transition:color .1s; }
.dbt-ab-row:hover .dbt-ab-name { color:var(--ark-white); }

.dbt-ab-meta { display:flex; flex-direction:column; align-items:flex-end; gap:1px; flex-shrink:0; }
.dbt-ab-cost { font-family:var(--ark-mono); font-size:.72em; font-weight:700; color:var(--ark-yellow); white-space:nowrap; transition:color .1s; }
.dbt-cost-unit { font-size:.8em; opacity:.7; }
.dbt-ab-row:hover .dbt-ab-cost { color:var(--ark-yellow2); }
.dbt-ab-ki    { font-family:var(--ark-mono); font-size:.72em; font-weight:700; color:#81c784; white-space:nowrap; }
.dbt-ab-speed { font-family:var(--ark-mono); font-size:.58em; color:var(--ark-gray2); white-space:nowrap; }
.dbt-ab-qty   { font-family:var(--ark-mono); font-size:.65em; color:var(--ark-cyan); white-space:nowrap; letter-spacing:.04em; }

.dbt-ab-empty { cursor:default; }
.dbt-ab-empty:hover { background:transparent !important; }
.dbt-ab-empty:hover::before { opacity:0 !important; }
.dbt-ab-empty-text { color:var(--ark-gray2) !important; font-style:italic; text-transform:none !important; }

/* ═══════════════ CAST QUEUE CARD ═══════════════ */
.dbt-cast-card {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 46px;
  max-height: 50px;
  background: var(--ark-panel);
  border: 1px solid rgba(100,212,255,.25);
  border-left: 2px solid #64d4ff;
  padding: 0 8px 0 0;
  position: relative;
  overflow: hidden;
}
.dbt-cast-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(100,212,255,.04) 0%, transparent 60%);
  pointer-events: none;
}
.dbt-cast-portrait {
  width: 46px;
  height: 46px;
  object-fit: contain;
  object-position: top center;
  flex-shrink: 0;
  filter: brightness(.7) saturate(.6);
  border-right: 1px solid rgba(100,212,255,.2);
}
.dbt-cast-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
}
.dbt-cast-name {
  display: flex;
  align-items: baseline;
  gap: 5px;
  overflow: hidden;
}
.dbt-cast-icon {
  font-size: .85em;
  flex-shrink: 0;
  color: #64d4ff;
}
.dbt-cast-label {
  font-family: var(--ark-font);
  font-size: .8em;
  font-weight: 700;
  color: var(--ark-white);
  text-transform: uppercase;
  letter-spacing: .04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.dbt-cast-caster {
  font-family: var(--ark-mono);
  font-size: .62em;
  color: var(--ark-gray);
  flex-shrink: 0;
  white-space: nowrap;
}
.dbt-cast-speed {
  font-family: var(--ark-mono);
  font-size: .62em;
  color: #64d4ff;
  flex-shrink: 0;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid rgba(100,212,255,.3);
  border-radius: 2px;
  padding: 0 3px;
  line-height: 1.4;
}
.dbt-cast-speed:hover { background: rgba(100,212,255,.1); border-color: #64d4ff; }
.dbt-cast-bar-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dbt-cast-bar-label {
  font-family: var(--ark-mono);
  font-size: .6em;
  color: #64d4ff;
  letter-spacing: .08em;
  flex-shrink: 0;
  width: 28px;
}
.dbt-cast-track {
  flex: 1;
  height: 9px;
  background: rgba(100,212,255,.15);
  overflow: hidden;
  position: relative;
}
.dbt-cast-fill {
  height: 100%;
  background: #64d4ff;
  box-shadow: 0 0 6px rgba(100,212,255,.6);
  transition: width .4s ease;
}
.dbt-cast-val {
  font-family: var(--ark-mono);
  font-size: .65em;
  color: #64d4ff;
  width: 24px;
  text-align: right;
  flex-shrink: 0;
}

/* ═══════════════ HEALING BEACON CARD ═══════════════ */
.dbt-beacon-card {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 46px;
  max-height: 50px;
  background: var(--ark-panel);
  border: 1px solid rgba(129,199,132,.25);
  border-left: 2px solid #81c784;
  padding: 0 8px 0 0;
  position: relative;
  overflow: hidden;
}
.dbt-beacon-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(129,199,132,.05) 0%, transparent 60%);
  pointer-events: none;
}
.dbt-beacon-portrait {
  filter: brightness(1) saturate(1) !important;
  border-right-color: rgba(129,199,132,.3) !important;
}
.dbt-beacon-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
}
.dbt-beacon-name {
  display: flex;
  align-items: baseline;
  gap: 6px;
  overflow: hidden;
}
.dbt-beacon-label {
  font-family: var(--ark-font);
  font-size: .8em;
  font-weight: 700;
  color: #81c784;
  text-transform: uppercase;
  letter-spacing: .04em;
  white-space: nowrap;
}
.dbt-beacon-turns {
  font-family: var(--ark-mono);
  font-size: .62em;
  color: var(--ark-gray);
  flex-shrink: 0;
  white-space: nowrap;
}
.dbt-beacon-fill {
  background: #81c784 !important;
  box-shadow: 0 0 6px rgba(129,199,132,.5) !important;
}

/* ═══════════════ BAR CLICK POPUP ═══════════════ */
#dbt-bar-popup {
  background: #161b24;
  border: 1px solid #64d4ff;
  border-radius: 4px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 0 12px rgba(100,212,255,.35);
  min-width: 110px;
  font-family: var(--ark-body, sans-serif);
}
.dbt-popup-label {
  font-family: var(--ark-mono);
  font-size: .7em;
  color: #64d4ff;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.dbt-popup-input {
  background: #0e1117;
  border: 1px solid #2a3547;
  border-radius: 3px;
  color: #e8e0d4;
  font-family: var(--ark-mono);
  font-size: .95em;
  padding: 2px 6px;
  width: 100%;
  text-align: center;
  outline: none;
  box-sizing: border-box;
}
.dbt-popup-input:focus { border-color: #64d4ff; }
.dbt-popup-hint {
  font-size: .6em;
  color: #556;
  text-align: center;
}

/* ═══════════════ TARGET SELECTOR THEME ═══════════════ */
#db-target-selector {
  --ark-bg:     #0e1117;
  --ark-panel:  #161b24;
  --ark-panel2: #1c2230;
  --ark-border: rgba(200,215,230,0.12);
  --ark-border2:rgba(200,215,230,0.06);
  --ark-yellow: #c8b820;
  --ark-cyan:   #00c8de;
  --ark-green:  #3de89a;
  --ark-red:    #e03040;
  --ark-white:  #e8eaf0;
  --ark-gray:   #7080a0;
  --ark-gray2:  #404a60;
  --ark-font:   'Rajdhani','Segoe UI',sans-serif;
  --ark-mono:   'Share Tech Mono',monospace;

  background: var(--ark-bg) !important;
  border: 1px solid var(--ark-border) !important;
  border-left: 2px solid var(--ark-cyan) !important;
  border-radius: 0 !important;
  box-shadow: 0 8px 40px rgba(0,0,0,.7), 0 0 0 1px rgba(0,200,222,.06) !important;
  font-family: var(--ark-font) !important;
  color: var(--ark-white) !important;
  clip-path: polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);
  min-width: 340px !important;
  width: auto !important;
}
#db-target-selector .window-header {
  background: var(--ark-panel) !important;
  border-bottom: 1px solid var(--ark-border) !important;
  padding: 6px 10px !important;
  font-family: var(--ark-font) !important;
  font-weight: 700 !important;
  font-size: 1.125em !important;
  letter-spacing: .07em !important;
  text-transform: uppercase !important;
  color: var(--ark-cyan) !important;
}
#db-target-selector .window-header::before {
  content: '◈ ';
  color: var(--ark-cyan);
  font-size: 1.06em;
}
#db-target-selector .window-header .header-button { background:transparent !important; border:none !important; color:var(--ark-gray) !important; }
#db-target-selector .window-header .header-button:hover { color:var(--ark-red) !important; }
#db-target-selector .window-content { background:var(--ark-bg) !important; padding:0 !important; }

/* Inner panel */
#db-target-selector .db-target-panel { padding: 0; }

#db-target-selector .db-target-header {
  background: var(--ark-panel) !important;
  border-bottom: 1px solid var(--ark-border) !important;
  padding: 8px 10px !important;
}
#db-target-selector .db-target-ability { display:flex; align-items:center; gap:8px; }
#db-target-selector .db-target-ability-icon { font-size:1.75em; flex-shrink:0; }
#db-target-selector .db-target-ability-name {
  font-weight: 700 !important;
  font-size: 1.25em !important;
  color: var(--ark-white) !important;
  letter-spacing: .04em !important;
  text-transform: uppercase !important;
}
#db-target-selector .db-target-ability-sub {
  font-size: .975em !important;
  color: var(--ark-gray) !important;
  margin-top: 1px !important;
}
#db-target-selector .db-target-meta {
  font-family: var(--ark-mono) !important;
  font-size: .9em !important;
  color: var(--ark-cyan) !important;
  margin-top: 5px !important;
  letter-spacing: .04em !important;
}

#db-target-selector .db-target-section-label {
  font-family: var(--ark-mono) !important;
  font-size: .875em !important;
  font-weight: 700 !important;
  letter-spacing: .1em !important;
  text-transform: uppercase !important;
  color: var(--ark-yellow) !important;
  padding: 6px 10px 3px !important;
  border-bottom: 1px solid var(--ark-border2) !important;
}

#db-target-selector .db-target-list { padding: 4px 0; }

#db-target-selector .db-target-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 5px 10px !important;
  border-bottom: 1px solid var(--ark-border2) !important;
  cursor: pointer !important;
  transition: background .1s !important;
  position: relative !important;
}
#db-target-selector .db-target-row:hover { background: rgba(0,200,222,.05) !important; }
#db-target-selector .db-target-row-ally:hover { background: rgba(61,232,154,.05) !important; }

#db-target-selector .db-target-portrait {
  width: 45px !important;
  height: 45px !important;
  object-fit: contain !important;
  border: 1px solid var(--ark-border) !important;
  background: var(--ark-panel2) !important;
  flex-shrink: 0 !important;
}
#db-target-selector .db-target-info { flex: 1; min-width: 0; }
#db-target-selector .db-target-name {
  font-weight: 700 !important;
  font-size: 1.125em !important;
  color: var(--ark-white) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
#db-target-selector .db-target-dist {
  color: var(--ark-gray) !important;
  font-size: 1em !important;
  font-weight: 400 !important;
}
#db-target-selector .db-target-bars { display:flex; gap:6px; margin-top:2px; flex-wrap:wrap; }
#db-target-selector .db-tbar {
  font-family: var(--ark-mono) !important;
  font-size: .875em !important;
  color: var(--ark-gray) !important;
}
#db-target-selector .db-tbar-hp { color: #e03040 !important; }
#db-target-selector .db-tbar-ar { color: #3070e8 !important; }
#db-target-selector .db-tbar-ki { color: var(--ark-green) !important; }

#db-target-selector .db-target-conditions { display:flex; flex-wrap:wrap; gap:3px; margin-top:3px; }
#db-target-selector .db-tcond {
  font-family: var(--ark-mono) !important;
  font-size: .81em !important;
  background: var(--ark-panel2) !important;
  border: 1px solid var(--ark-border) !important;
  padding: 1px 4px !important;
  color: var(--ark-yellow) !important;
}

#db-target-selector .db-target-btn {
  background: rgba(0,200,222,.1) !important;
  border: 1px solid rgba(0,200,222,.3) !important;
  color: var(--ark-cyan) !important;
  border-radius: 0 !important;
  width: 35px !important;
  height: 35px !important;
  padding: 0 !important;
  font-size: 1.25em !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
  transition: background .1s, border-color .1s !important;
  clip-path: polygon(3px 0,100% 0,100% calc(100% - 3px),calc(100% - 3px) 100%,0 100%,0 3px);
}
#db-target-selector .db-target-btn:hover {
  background: rgba(0,200,222,.25) !important;
  border-color: var(--ark-cyan) !important;
}
#db-target-selector .db-target-btn-ally {
  background: rgba(61,232,154,.1) !important;
  border-color: rgba(61,232,154,.3) !important;
  color: var(--ark-green) !important;
}
#db-target-selector .db-target-btn-ally:hover {
  background: rgba(61,232,154,.25) !important;
  border-color: var(--ark-green) !important;
}

#db-target-selector .db-target-empty {
  padding: 14px 10px !important;
  text-align: center !important;
  font-family: var(--ark-mono) !important;
  font-size: 1em !important;
  color: var(--ark-gray2) !important;
  letter-spacing: .06em !important;
}

/* ═══════════════ DBT DIALOG THEME ═══════════════ */
/* Applied to all Foundry Dialog windows while DBT system is loaded */
.app.window-app.dialog,
.app.window-app[id^="Dialog-"] {
  --ark-bg:     #0e1117;
  --ark-panel:  #161b24;
  --ark-panel2: #1c2230;
  --ark-border: rgba(200,215,230,0.12);
  --ark-yellow: #c8b820;
  --ark-cyan:   #00c8de;
  --ark-green:  #3de89a;
  --ark-red:    #e03040;
  --ark-white:  #e8eaf0;
  --ark-gray:   #7080a0;
  --ark-gray2:  #404a60;
  --ark-font:   'Rajdhani','Segoe UI',sans-serif;
  --ark-mono:   'Share Tech Mono',monospace;

  background: var(--ark-bg) !important;
  border: 1px solid var(--ark-border) !important;
  border-left: 2px solid var(--ark-yellow) !important;
  border-radius: 0 !important;
  box-shadow: 0 8px 40px rgba(0,0,0,.7), 0 0 0 1px rgba(200,184,32,.08) !important;
  font-family: var(--ark-font) !important;
  color: var(--ark-white) !important;
  clip-path: polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);
}

.app.window-app.dialog .window-header,
.app.window-app[id^="Dialog-"] .window-header {
  background: var(--ark-panel) !important;
  border-bottom: 1px solid var(--ark-border) !important;
  padding: 6px 10px !important;
  font-family: var(--ark-font) !important;
  font-weight: 700 !important;
  font-size: .95em !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
  color: var(--ark-white) !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}
.app.window-app.dialog .window-header::before {
  content: '◆';
  color: var(--ark-yellow);
  font-size: .7em;
  flex-shrink: 0;
}
.app.window-app.dialog .window-header .header-button,
.app.window-app[id^="Dialog-"] .window-header .header-button {
  background: transparent !important;
  border: none !important;
  color: var(--ark-gray) !important;
  transition: color .1s !important;
}
.app.window-app.dialog .window-header .header-button:hover { color: var(--ark-red) !important; }

.app.window-app.dialog .window-content,
.app.window-app[id^="Dialog-"] .window-content {
  background: var(--ark-bg) !important;
  padding: 12px 14px !important;
  color: var(--ark-white) !important;
  font-family: var(--ark-font) !important;
  font-size: .95em !important;
  line-height: 1.5 !important;
}
.app.window-app.dialog .window-content p  { color: var(--ark-gray) !important; margin: 0 0 6px !important; }
.app.window-app.dialog .window-content em { color: var(--ark-cyan) !important; font-style: normal !important; }
.app.window-app.dialog .window-content label {
  color: var(--ark-gray) !important;
  font-size: .88em !important;
  letter-spacing: .04em !important;
  text-transform: uppercase !important;
}
.app.window-app.dialog .window-content input[type="text"],
.app.window-app.dialog .window-content input[type="number"],
.app.window-app.dialog .window-content select,
.app.window-app.dialog .window-content textarea {
  background: var(--ark-panel2) !important;
  border: 1px solid var(--ark-border) !important;
  border-radius: 0 !important;
  color: var(--ark-white) !important;
  font-family: var(--ark-mono) !important;
  font-size: .9em !important;
  padding: 4px 8px !important;
  width: 100% !important;
  box-sizing: border-box !important;
  outline: none !important;
}
.app.window-app.dialog .window-content input:focus,
.app.window-app.dialog .window-content select:focus {
  border-color: var(--ark-cyan) !important;
  box-shadow: 0 0 0 1px rgba(0,200,222,.2) !important;
}
.app.window-app.dialog .window-content input[type="checkbox"] {
  width: 14px !important;
  height: 14px !important;
  accent-color: var(--ark-yellow) !important;
}
/* Section headers inside macro dialogs */
.app.window-app.dialog .window-content h3,
.app.window-app.dialog .window-content h4 {
  color: var(--ark-yellow) !important;
  font-family: var(--ark-font) !important;
  font-size: .8em !important;
  font-weight: 700 !important;
  letter-spacing: .1em !important;
  text-transform: uppercase !important;
  border-bottom: 1px solid var(--ark-border) !important;
  padding-bottom: 3px !important;
  margin: 10px 0 6px !important;
}
/* Form rows */
.app.window-app.dialog .window-content .form-group {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  padding: 4px 0 !important;
  border-bottom: 1px solid var(--ark-border2) !important;
}
.app.window-app.dialog .window-content .form-group:last-child { border-bottom: none !important; }
.app.window-app.dialog .window-content .form-group label { flex: 1 !important; margin: 0 !important; }
.app.window-app.dialog .window-content .form-group input,
.app.window-app.dialog .window-content .form-group select { flex: 0 0 80px !important; width: 80px !important; text-align: right !important; }

/* Highlighted info rows (colored spans used in macros) */
.app.window-app.dialog .window-content span[style*="color:#00c8de"],
.app.window-app.dialog .window-content span[style*="color:#c8b820"] { font-weight: 700 !important; }

/* Dividers */
.app.window-app.dialog .window-content hr {
  border: none !important;
  border-top: 1px solid var(--ark-border) !important;
  margin: 8px 0 !important;
}

/* Dialog buttons footer */
.app.window-app.dialog .dialog-buttons,
.app.window-app[id^="Dialog-"] .dialog-buttons {
  background: var(--ark-panel) !important;
  border-top: 1px solid var(--ark-border) !important;
  padding: 8px 10px !important;
  display: flex !important;
  gap: 6px !important;
}
.app.window-app.dialog .dialog-buttons button {
  background: var(--ark-panel2) !important;
  border: 1px solid var(--ark-border) !important;
  border-radius: 0 !important;
  color: var(--ark-gray) !important;
  font-family: var(--ark-font) !important;
  font-size: .88em !important;
  font-weight: 600 !important;
  letter-spacing: .05em !important;
  text-transform: uppercase !important;
  padding: 6px 14px !important;
  flex: 1 !important;
  cursor: pointer !important;
  transition: background .1s, color .1s, border-color .1s !important;
  clip-path: polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px);
}
.app.window-app.dialog .dialog-buttons button:hover {
  background: rgba(200,184,32,.12) !important;
  border-color: var(--ark-yellow) !important;
  color: var(--ark-yellow) !important;
}
/* Primary / default button */
.app.window-app.dialog .dialog-buttons button.default,
.app.window-app.dialog .dialog-buttons button[data-button="yes"],
.app.window-app.dialog .dialog-buttons button[data-button="ok"],
.app.window-app.dialog .dialog-buttons button[data-button="roll"] {
  background: rgba(200,184,32,.15) !important;
  border-color: var(--ark-yellow) !important;
  color: var(--ark-yellow) !important;
}
.app.window-app.dialog .dialog-buttons button.default:hover,
.app.window-app.dialog .dialog-buttons button[data-button="yes"]:hover,
.app.window-app.dialog .dialog-buttons button[data-button="ok"]:hover,
.app.window-app.dialog .dialog-buttons button[data-button="roll"]:hover {
  background: rgba(200,184,32,.28) !important;
}
/* Cancel / no button */
.app.window-app.dialog .dialog-buttons button[data-button="no"],
.app.window-app.dialog .dialog-buttons button[data-button="cancel"] {
  background: rgba(224,48,64,.08) !important;
  border-color: rgba(224,48,64,.3) !important;
  color: var(--ark-gray) !important;
}
.app.window-app.dialog .dialog-buttons button[data-button="no"]:hover,
.app.window-app.dialog .dialog-buttons button[data-button="cancel"]:hover {
  background: rgba(224,48,64,.18) !important;
  border-color: var(--ark-red) !important;
  color: var(--ark-red) !important;
}

/* ═══════════════ GUEST / COMPANION PANEL ═══════════════ */
#dbt-guest-root {
  position: fixed;
  z-index: 68;
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  user-select: none;
  font-family: var(--ark-font, 'Rajdhani','Segoe UI',sans-serif);
  --ark-bg:     #0e1117;
  --ark-panel:  #161b24;
  --ark-panel2: #1c2230;
  --ark-border: rgba(200,215,230,0.12);
  --ark-yellow: #c8b820;
  --ark-cyan:   #00c8de;
  --ark-green:  #3de89a;
  --ark-orange: #e87830;
  --ark-red:    #e03040;
  --ark-white:  #e8eaf0;
  --ark-gray:   #7080a0;
  --ark-gray2:  #404a60;
  --ark-font:   'Rajdhani','Segoe UI',sans-serif;
  --ark-mono:   'Share Tech Mono',monospace;
  animation: dbt-fadein 0.35s ease both;
}

.dbt-guest-header {
  background: var(--ark-panel);
  border: 1px solid var(--ark-border);
  border-left: 2px solid var(--ark-gray2);
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  clip-path: polygon(4px 0,100% 0,100% 100%,0 100%,0 4px);
}
.dbt-guest-header-sys {
  font-family: var(--ark-mono);
  font-size: .6em;
  color: var(--ark-gray2);
  letter-spacing: .1em;
  opacity: .7;
}
.dbt-guest-header-title {
  font-size: .88em;
  font-weight: 700;
  color: var(--ark-gray);
  text-transform: uppercase;
  letter-spacing: .06em;
  flex: 1;
}
.dbt-guest-header-count {
  font-family: var(--ark-mono);
  font-size: .72em;
  color: var(--ark-gray2);
  letter-spacing: .05em;
}

.dbt-guest-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  height: 46px;
  background: var(--ark-panel);
  border: 1px solid var(--ark-border);
  border-left: 2px solid var(--ark-gray2);
  overflow: hidden;
  transition: opacity .3s, border-color .2s;
  clip-path: polygon(4px 0,100% 0,100% 100%,0 100%,0 4px);
}
.dbt-guest-card::before {
  content:''; position:absolute; top:0; left:0;
  width:5px; height:5px;
  border-top:1px solid var(--ark-gray2);
  border-left:1px solid var(--ark-gray2);
  z-index:2; pointer-events:none;
}

/* Down state */
.dbt-guest-card.dbt-guest-down {
  opacity: .45;
  border-left-color: var(--ark-gray2);
}
.dbt-guest-card.dbt-guest-down .dbt-guest-portrait {
  filter: grayscale(1) brightness(.5);
}

/* Critical state */
.dbt-guest-card.dbt-guest-crit {
  border-left-color: var(--ark-red);
}
.dbt-guest-card.dbt-guest-crit::before { border-color: var(--ark-red); }

.dbt-guest-portrait {
  width: 46px;
  height: 46px;
  object-fit: contain;
  object-position: top center;
  flex-shrink: 0;
  border-right: 1px solid var(--ark-border);
  background: transparent;
  display: block;
}

.dbt-guest-body {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
}

.dbt-guest-name {
  font-size: .78em;
  font-weight: 700;
  color: var(--ark-white);
  text-transform: uppercase;
  letter-spacing: .03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.dbt-guest-stats {
  display: flex;
  align-items: stretch;
  gap: 2px;
  font-family: var(--ark-mono);
  font-size: .79em;
  line-height: 1;
}

.dbt-guest-box {
  font-weight: 700;
  text-align: center;
  padding: 0;
  width: 40px;
  height: 20px;
  line-height: 20px;
  border-radius: 1px;
  white-space: nowrap;
  overflow: hidden;
  color: var(--ark-white);
  flex-shrink: 0;
  box-sizing: border-box;
  cursor: pointer;
  transition: filter .15s;
}
.dbt-guest-box:hover { filter: brightness(1.4); }
.dbt-guest-box-hp { background: rgba(224,48,64,.25); border: 1px solid rgba(224,48,64,.5); }
.dbt-guest-box-hp.dbt-guest-box-hp-crit { color: #e03040; animation: dbt-guest-crit-pulse 1s ease-in-out infinite; }
.dbt-guest-box-hp.dbt-guest-box-hp-down { color: var(--ark-gray2); animation: none; }
.dbt-guest-box-ar { background: rgba(48,112,232,.25); border: 1px solid rgba(48,112,232,.5); }
.dbt-guest-box-ar.dbt-guest-box-ar-brk { color: #e03040; background: rgba(224,48,64,.15); border-color: rgba(224,48,64,.4); font-size: .85em; letter-spacing: .05em; }
.dbt-guest-box-ki { background: rgba(61,232,154,.15); border: 1px solid rgba(61,232,154,.35); }
.dbt-guest-box-ki-null { color: var(--ark-gray2); background: rgba(0,0,0,.15); border-color: var(--ark-gray2); opacity: .5; }

@keyframes dbt-guest-crit-pulse {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.25; }
}
.dbt-guest-hp-crit { animation: dbt-guest-crit-pulse 1s ease-in-out infinite; }
.dbt-guest-hp-down { color: var(--ark-gray2) !important; animation: none; }

.dbt-guest-down-label {
  font-family: var(--ark-mono);
  font-size: .58em;
  color: var(--ark-gray2);
  letter-spacing: .1em;
  line-height: 1;
}

.dbt-guest-remove {
  position: absolute;
  top: 2px;
  right: 3px;
  width: 12px;
  height: 12px;
  padding: 0;
  line-height: 10px;
  font-size: 10px;
  font-weight: 700;
  color: var(--ark-gray2);
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity .15s, color .15s;
}
.dbt-guest-card:hover .dbt-guest-remove { opacity: 1; }
.dbt-guest-remove:hover { color: var(--ark-red); }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Boot
// ─────────────────────────────────────────────────────────────────────────────

window.DawnbreakerPartyHUD = DawnbreakerPartyHUD;
window.DawnbreakerHUD      = DawnbreakerHUD;
window.DBTPartyHUD         = DawnbreakerPartyHUD; // short alias for onclick handlers

Hooks.once("ready", () => {
  DawnbreakerPartyHUD.initialize();
  DawnbreakerHUD.initialize();

  // Auto-render party HUD if actors are configured
  if (DawnbreakerPartyHUD.actors.length) {
    DawnbreakerPartyHUD.render();
  }

  // Auto-render guest HUD if guests are configured
  if (DawnbreakerGuestHUD.actors.length) {
    DawnbreakerGuestHUD.render();
  }

  // Snap target selector to party HUD bottom-right on initial render
  Hooks.on("renderApplication", (_app, html) => {
    const el = html instanceof HTMLElement ? html : html?.[0];
    if (!el || el.id !== "db-target-selector") return;
    requestAnimationFrame(() => DawnbreakerPartyHUD._repositionTargetSelector());
  });

  // Position macro Dialog windows next to the active HUD sub-menu
  Hooks.on("renderDialog", (_app, html) => {
    const el = html instanceof HTMLElement ? html : html?.[0];
    if (!el) return;
    // Find anchor: sub-menu first, then action HUD
    const anchor = document.getElementById(HUD_SUB_ID) ?? document.getElementById(HUD_ROOT_ID);
    if (!anchor) return;
    requestAnimationFrame(() => {
      const ar  = anchor.getBoundingClientRect();
      const dw  = el.offsetWidth  || 320;
      const dh  = el.offsetHeight || 200;
      let left  = ar.right + 8;
      let top   = ar.top;
      if (left + dw > window.innerWidth - 10)  left = ar.left - dw - 8;
      if (top  + dh > window.innerHeight - 10) top  = window.innerHeight - dh - 10;
      el.style.left = `${Math.max(4, left)}px`;
      el.style.top  = `${Math.max(4, top)}px`;
    });
  });

  console.log("Dawnbreaker HUD | Initialized (Party + Action Menu, Endfield theme).");
});
