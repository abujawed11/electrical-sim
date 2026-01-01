import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const addEdge = (graph, a, b) => {
  if (!graph.has(a)) graph.set(a, []);
  if (!graph.has(b)) graph.set(b, []);
  graph.get(a).push(b);
  graph.get(b).push(a);
};

const bfsHas = (graph, start, targetSet) => {
  if (!start) return false;
  const q = [start];
  const seen = new Set([start]);
  while (q.length) {
    const u = q.shift();
    if (targetSet.has(u)) return true;
    const ns = graph.get(u);
    if (!ns) continue;
    for (const v of ns) {
      if (seen.has(v)) continue;
      seen.add(v);
      q.push(v);
    }
  }
  return false;
};

const buildPhaseNeutralGraphs = (components, wires) => {
  const compById = new Map(components.map((c) => [c.id, c]));

  const getKind = (compId, terminalId) => {
    const c = compById.get(compId);
    if (!c) return null;
    const def = PART_REGISTRY[c.type];
    const t = def?.terminals?.find((x) => x.id === terminalId);
    return t?.kind ?? null;
  };

  const isPhase = (k) => (typeof k === 'string' && (k.includes('PHASE') || k === TERMINAL_KINDS.GENERIC));
  const isNeutral = (k) => k === TERMINAL_KINDS.NEUTRAL || k === TERMINAL_KINDS.GENERIC;

  const phaseGraph = new Map();
  const neutralGraph = new Map();

  wires.forEach((w) => {
    const fromId = `${w.from.compId}:${w.from.terminalId}`;
    const toId = `${w.to.compId}:${w.to.terminalId}`;
    const k1 = getKind(w.from.compId, w.from.terminalId);
    const k2 = getKind(w.to.compId, w.to.terminalId);

    if (isPhase(k1) && isPhase(k2)) addEdge(phaseGraph, fromId, toId);
    if (isNeutral(k1) && isNeutral(k2)) addEdge(neutralGraph, fromId, toId);
  });

  components.forEach((c) => {
    const def = PART_REGISTRY[c.type];
    if (!def) return;

    if (c.type === COMPONENT_TYPES.MCB) {
      if (c.properties.isOn) addEdge(phaseGraph, `${c.id}:LIN`, `${c.id}:LOUT`);
    } else if (c.type === COMPONENT_TYPES.SWITCH) {
      if (c.properties.isOn) addEdge(phaseGraph, `${c.id}:IN_L`, `${c.id}:OUT_L`);
    } else if (c.type === COMPONENT_TYPES.METER) {
      addEdge(phaseGraph, `${c.id}:IN_L`, `${c.id}:OUT_L`);
      addEdge(neutralGraph, `${c.id}:IN_N`, `${c.id}:OUT_N`);
    } else if (c.type === COMPONENT_TYPES.RCCB || c.type === COMPONENT_TYPES.RCBO) {
      if (c.properties.isOn && !c.properties.isTripped) {
        addEdge(phaseGraph, `${c.id}:L_IN`, `${c.id}:L_OUT`);
        addEdge(neutralGraph, `${c.id}:N_IN`, `${c.id}:N_OUT`);
      }
    } else if (c.type === COMPONENT_TYPES.NEUTRAL_BAR) {
      const terms = def.terminals;
      for (let i = 0; i < terms.length - 1; i++) addEdge(neutralGraph, `${c.id}:${terms[i].id}`, `${c.id}:${terms[i + 1].id}`);
    } else if (c.type === COMPONENT_TYPES.BUSBAR) {
      const terms = def.terminals;
      const inT = terms.find((t) => t.id === 'IN');
      if (inT) {
        terms.forEach((t) => {
          if (t.id !== 'IN') addEdge(phaseGraph, `${c.id}:IN`, `${c.id}:${t.id}`);
        });
      }
    } else if (c.type === COMPONENT_TYPES.JUNCTION_BOX) {
      const terms = def.terminals;
      for (let i = 0; i < terms.length - 1; i++) {
        const u = `${c.id}:${terms[i].id}`;
        const v = `${c.id}:${terms[i + 1].id}`;
        addEdge(phaseGraph, u, v);
        addEdge(neutralGraph, u, v);
      }
    } else if (c.type === COMPONENT_TYPES.CHANGEOVER) {
      if (c.properties.position === 'MAINS') {
        addEdge(phaseGraph, `${c.id}:A_L`, `${c.id}:OUT_L`);
        addEdge(neutralGraph, `${c.id}:A_N`, `${c.id}:OUT_N`);
      } else if (c.properties.position === 'INVERTER') {
        addEdge(phaseGraph, `${c.id}:B_L`, `${c.id}:OUT_L`);
        addEdge(neutralGraph, `${c.id}:B_N`, `${c.id}:OUT_N`);
      }
    } else if (c.type === COMPONENT_TYPES.INVERTER || c.type === COMPONENT_TYPES.SOLAR_INVERTER) {
      if (c.properties.isBypassMode) {
        addEdge(phaseGraph, `${c.id}:AC_IN_L`, `${c.id}:AC_OUT_L`);
        addEdge(neutralGraph, `${c.id}:AC_IN_N`, `${c.id}:AC_OUT_N`);
      }
    }
  });

  return { phaseGraph, neutralGraph };
};

const inferLinkedInverterId = (components, graphs, atsId) => {
  const { phaseGraph, neutralGraph } = graphs;

  const invL = `${atsId}:INV_L`;
  const invN = `${atsId}:INV_N`;

  const candidates = components.filter((c) => c.type === COMPONENT_TYPES.INVERTER || c.type === COMPONENT_TYPES.SOLAR_INVERTER);
  for (const inv of candidates) {
    const outL = `${inv.id}:AC_OUT_L`;
    const outN = `${inv.id}:AC_OUT_N`;

    const phaseOk = bfsHas(phaseGraph, invL, new Set([outL]));
    const neutralOk = bfsHas(neutralGraph, invN, new Set([outN]));

    if (phaseOk && neutralOk) return inv.id;
  }

  return null;
};

const computeInverterReady = (inv, minimumSocPct, simulationState) => {
  if (!inv) return { ready: false, reason: 'NO_INVERTER' };
  if (inv.properties.enabled !== true) return { ready: false, reason: 'DISABLED' };
  if (inv.properties.isTripped) return { ready: false, reason: 'TRIPPED' };
  if (inv.properties.isBypassMode) return { ready: false, reason: 'BYPASS' };

  if (inv.type === COMPONENT_TYPES.INVERTER) {
    if (inv.properties.isOverloaded) return { ready: false, reason: 'OVERLOAD' };
    const socWh = Number(inv.properties.socWh || 0);
    const battWh = Math.max(1, Number(inv.properties.batteryWh || 0));
    const socPct = (socWh / battWh) * 100;
    if (socWh <= 0) return { ready: false, reason: 'EMPTY' };
    if (socPct <= minimumSocPct) return { ready: false, reason: 'LOW_SOC' };
    return { ready: true, reason: 'OK' };
  }

  if (inv.type === COMPONENT_TYPES.SOLAR_INVERTER) {
    if (inv.properties.overloadActive) return { ready: false, reason: 'OVERLOAD' };
    if (inv.properties.canInvert !== true) return { ready: false, reason: 'CANNOT_INVERT' };

    const dcOk =
      simulationState?.dcPosSet?.has(`${inv.id}:BAT_POS`) === true &&
      simulationState?.dcNegSet?.has(`${inv.id}:BAT_NEG`) === true;
    if (!dcOk) return { ready: false, reason: 'DC_NOT_WIRED' };

    const socPct = Number(inv.properties.socPercent ?? 0);
    if (!Number.isFinite(socPct) || socPct <= minimumSocPct) return { ready: false, reason: 'LOW_SOC' };
    return { ready: true, reason: 'OK' };
  }

  return { ready: false, reason: 'UNKNOWN' };
};

const uiForState = (state) => {
  switch (state) {
    case 'GRID_ACTIVE':
      return { statusText: 'GRID MODE', activeSource: 'GRID' };
    case 'TRANSFER_TO_INVERTER':
      return { statusText: 'TRANSFER TO INVERTER', activeSource: 'NONE' };
    case 'INVERTER_ACTIVE':
      return { statusText: 'INVERTER MODE', activeSource: 'INVERTER' };
    case 'TRANSFER_TO_GRID':
      return { statusText: 'TRANSFER TO GRID', activeSource: 'NONE' };
    default:
      return { statusText: 'NO SUPPLY', activeSource: 'NONE' };
  }
};

/**
 * ATS state machine evaluation.
 *
 * Runs during the store evaluate cycle. Timed transfer completion happens in store.tickEnergy.
 */
export const evaluateATS = (components, wires, simulationState) => {
  const updatesList = [];
  const now = Date.now();

  const { livePhaseSet, neutralSet, terminalVoltageLN } = simulationState;
  const graphs = buildPhaseNeutralGraphs(components, wires);

  components.forEach((c) => {
    if (c.type !== COMPONENT_TYPES.ATS) return;

    const gridL = `${c.id}:GRID_L`;
    const gridN = `${c.id}:GRID_N`;
    const invL = `${c.id}:INV_L`;
    const invN = `${c.id}:INV_N`;

    const gridV = Number(terminalVoltageLN?.[gridL] ?? 0);
    const gridThresholdV = Number(c.properties.gridThresholdV ?? 180);
    const gridHasLN = livePhaseSet.has(gridL) && neutralSet.has(gridN);
    const gridOk = gridHasLN && gridV >= gridThresholdV;

    const switchingDelayMs = clamp(Number(c.properties.switchingDelayMs ?? c.properties.transferDelayMs ?? 300), 200, 2000);
    const minimumSocPct = clamp(Number(c.properties.minimumSocPct ?? 20), 0, 100);

    const linkedId =
      (typeof c.properties.linkedInverterId === 'string' && c.properties.linkedInverterId.trim() !== '')
        ? c.properties.linkedInverterId
        : inferLinkedInverterId(components, graphs, c.id);

    const linkedInv = linkedId ? components.find((x) => x.id === linkedId) : null;

    const inverterNetConnected = (() => {
      if (!linkedInv) return false;
      const { phaseGraph, neutralGraph } = graphs;
      const outL = `${linkedInv.id}:AC_OUT_L`;
      const outN = `${linkedInv.id}:AC_OUT_N`;
      return bfsHas(phaseGraph, invL, new Set([outL])) && bfsHas(neutralGraph, invN, new Set([outN]));
    })();

    const invReady = inverterNetConnected ? computeInverterReady(linkedInv, minimumSocPct, simulationState).ready : false;

    const overrideMode = (c.properties.overrideMode || 'AUTO').toUpperCase();
    const desired = (() => {
      if (overrideMode === 'OFF') return 'NO_SUPPLY';
      if (overrideMode === 'GRID') return gridOk ? 'GRID_ACTIVE' : 'NO_SUPPLY';
      if (overrideMode === 'INVERTER') return invReady ? 'INVERTER_ACTIVE' : 'NO_SUPPLY';
      if (gridOk) return 'GRID_ACTIVE';
      if (invReady) return 'INVERTER_ACTIVE';
      return 'NO_SUPPLY';
    })();

    const cur = c.properties.state || 'NO_SUPPLY';
    let next = cur;
    let targetState = c.properties.targetState ?? null;
    let transferStartTime = Number(c.properties.transferStartTime || 0);
    let transferDelayMs = Number(c.properties.transferDelayMs || 0);
    let relayClickSeq = Number(c.properties.relayClickSeq || 0);

    const clearTransfer = () => {
      targetState = null;
      transferStartTime = 0;
      transferDelayMs = switchingDelayMs;
    };

    const startTransfer = (toState) => {
      targetState = toState;
      transferStartTime = now;
      transferDelayMs = switchingDelayMs;
      relayClickSeq += 1;
    };

    if (cur === 'GRID_ACTIVE') {
      if (desired === 'GRID_ACTIVE') {
        // stable
      } else if (desired === 'INVERTER_ACTIVE') {
        next = 'TRANSFER_TO_INVERTER';
        startTransfer('INVERTER_ACTIVE');
      } else {
        next = 'NO_SUPPLY';
        clearTransfer();
      }
    } else if (cur === 'INVERTER_ACTIVE') {
      if (!invReady) {
        next = 'NO_SUPPLY';
        clearTransfer();
      } else if (desired === 'INVERTER_ACTIVE') {
        // stable
      } else if (desired === 'GRID_ACTIVE') {
        next = 'TRANSFER_TO_GRID';
        startTransfer('GRID_ACTIVE');
      } else {
        next = 'NO_SUPPLY';
        clearTransfer();
      }
    } else if (cur === 'NO_SUPPLY') {
      if (desired === 'GRID_ACTIVE') {
        next = 'GRID_ACTIVE';
        clearTransfer();
      } else if (desired === 'INVERTER_ACTIVE') {
        next = 'TRANSFER_TO_INVERTER';
        startTransfer('INVERTER_ACTIVE');
      }
    } else if (cur === 'TRANSFER_TO_INVERTER') {
      if (gridOk) {
        next = 'GRID_ACTIVE';
        clearTransfer();
      } else if (!invReady) {
        next = 'NO_SUPPLY';
        clearTransfer();
      } else if (targetState !== 'INVERTER_ACTIVE') {
        // repair
        startTransfer('INVERTER_ACTIVE');
      }
    } else if (cur === 'TRANSFER_TO_GRID') {
      if (!gridOk) {
        next = invReady ? 'INVERTER_ACTIVE' : 'NO_SUPPLY';
        clearTransfer();
      } else if (!invReady && overrideMode === 'INVERTER') {
        next = 'NO_SUPPLY';
        clearTransfer();
      } else if (targetState !== 'GRID_ACTIVE') {
        startTransfer('GRID_ACTIVE');
      }
    }

    const ui = uiForState(next);
    const updates = {};
    let changed = false;

    if (c.properties.state !== next) {
      updates.state = next;
      changed = true;
    }

    if (c.properties.targetState !== targetState) {
      updates.targetState = targetState;
      changed = true;
    }
    if (Number(c.properties.transferStartTime || 0) !== transferStartTime) {
      updates.transferStartTime = transferStartTime;
      changed = true;
    }
    if (Number(c.properties.transferDelayMs || 0) !== transferDelayMs) {
      updates.transferDelayMs = transferDelayMs;
      changed = true;
    }
    if (Number(c.properties.relayClickSeq || 0) !== relayClickSeq) {
      updates.relayClickSeq = relayClickSeq;
      changed = true;
    }

    if (c.properties.statusText !== ui.statusText) {
      updates.statusText = ui.statusText;
      changed = true;
    }
    if (c.properties.activeSource !== ui.activeSource) {
      updates.activeSource = ui.activeSource;
      changed = true;
    }

    // Keep the clamped delay in sync for UI
    if (Number(c.properties.switchingDelayMs ?? 300) !== switchingDelayMs) {
      updates.switchingDelayMs = switchingDelayMs;
      changed = true;
    }

    if (linkedId && c.properties.linkedInverterId == null) {
      // If user didn't explicitly set, keep null; we still infer internally.
      // No update on linkedInverterId here to avoid "sticky" auto-write.
    }

    if (changed) updatesList.push({ id: c.id, updates });
  });

  return updatesList;
};
