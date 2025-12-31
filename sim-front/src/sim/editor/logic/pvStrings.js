import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS } from '../parts/partDefinitions';

const addEdge = (graph, a, b) => {
  if (!graph.has(a)) graph.set(a, []);
  if (!graph.has(b)) graph.set(b, []);
  graph.get(a).push(b);
  graph.get(b).push(a);
};

const getTerminalKind = (componentsById, compId, terminalId) => {
  const comp = componentsById.get(compId);
  if (!comp) return null;
  const def = PART_DEFINITIONS[comp.type];
  const term = def?.terminals?.find(t => t.id === terminalId);
  return term?.kind ?? null;
};

/**
 * Build a PV/DC wiring graph for PV string discovery.
 * Unlike the POS/NEG split graphs used for continuity checks, this graph is undirected and
 * allows PV "series links" (POS of one panel to NEG of another) to be discovered as real topology.
 *
 * It respects DC_MCB state (only adds internal edges when isOn=true).
 *
 * Nodes look like: `${compId}:${terminalId}`
 */
export const buildPvGraph = (components, wires) => {
  const componentsById = new Map(components.map(c => [c.id, c]));
  const graph = new Map();

  const isPvKind = (k) =>
    k === TERMINAL_KINDS.DC_POS ||
    k === TERMINAL_KINDS.DC_NEG ||
    k === TERMINAL_KINDS.GENERIC;

  // Wires: include any DC-ish connection (pos/neg/generic). This allows series topology to emerge.
  wires.forEach(w => {
    const fromKind = getTerminalKind(componentsById, w.from.compId, w.from.terminalId);
    const toKind = getTerminalKind(componentsById, w.to.compId, w.to.terminalId);
    if (!isPvKind(fromKind) || !isPvKind(toKind)) return;
    addEdge(graph, `${w.from.compId}:${w.from.terminalId}`, `${w.to.compId}:${w.to.terminalId}`);
  });

  // Internal DC_MCB pass-through (only if ON)
  components.forEach(c => {
    if (c.type !== COMPONENT_TYPES.DC_MCB) return;
    if (!c.properties?.isOn) return;
    addEdge(graph, `${c.id}:IN_POS`, `${c.id}:OUT_POS`);
    addEdge(graph, `${c.id}:IN_NEG`, `${c.id}:OUT_NEG`);
  });

  // Solar panel internal "module": NEG <-> POS (so strings form as NEG->POS->NEG->POS...)
  components.forEach(c => {
    if (c.type !== COMPONENT_TYPES.SOLAR_PANEL) return;
    if (c.properties?.enabled === false) return; // disabled panel acts like open circuit for PV model
    addEdge(graph, `${c.id}:NEG`, `${c.id}:POS`);
  });

  return graph;
};

const isPanelTerminal = (componentsById, node) => {
  const [compId, terminalId] = node.split(':');
  const comp = componentsById.get(compId);
  if (!comp || comp.type !== COMPONENT_TYPES.SOLAR_PANEL) return null;
  if (terminalId !== 'POS' && terminalId !== 'NEG') return null;
  return { panelId: compId, terminalId };
};

/**
 * Find PV strings between MPPT PV_POS and PV_NEG.
 * Returns an array of strings, each string is an ordered array of panelIds in series.
 */
export const computePvStringsForMppt = (pvGraph, components, mpptId, opts = {}) => {
  const maxStrings = Number.isFinite(opts.maxStrings) ? opts.maxStrings : 64;
  const maxNodeVisits = Number.isFinite(opts.maxNodeVisits) ? opts.maxNodeVisits : 4000;

  const componentsById = new Map(components.map(c => [c.id, c]));
  const start = `${mpptId}:PV_POS`;
  const goal = `${mpptId}:PV_NEG`;

  const strings = [];
  const dedupe = new Set();

  const stack = [{
    node: start,
    visitedNodes: new Set([start]),
    usedPanels: new Set(),
    panelSeq: [],
    visits: 0,
  }];

  while (stack.length && strings.length < maxStrings) {
    const cur = stack.pop();
    if (cur.visits > maxNodeVisits) break;

    if (cur.node === goal) {
      const key = cur.panelSeq.join('|');
      if (cur.panelSeq.length > 0 && !dedupe.has(key)) {
        dedupe.add(key);
        strings.push(cur.panelSeq);
      }
      continue;
    }

    const neighbors = pvGraph.get(cur.node) || [];
    for (const next of neighbors) {
      if (cur.visitedNodes.has(next)) continue;

      const nextVisited = new Set(cur.visitedNodes);
      nextVisited.add(next);

      const nextUsedPanels = new Set(cur.usedPanels);
      const nextSeq = cur.panelSeq.slice();

      // If we traverse an internal panel edge (POS<->NEG), record that panel once.
      const a = isPanelTerminal(componentsById, cur.node);
      const b = isPanelTerminal(componentsById, next);
      if (a && b && a.panelId === b.panelId && a.terminalId !== b.terminalId) {
        if (nextUsedPanels.has(a.panelId)) continue;
        nextUsedPanels.add(a.panelId);
        nextSeq.push(a.panelId);
      }

      stack.push({
        node: next,
        visitedNodes: nextVisited,
        usedPanels: nextUsedPanels,
        panelSeq: nextSeq,
        visits: cur.visits + 1,
      });
    }
  }

  return strings;
};

const safeNumber = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Compute PV Vmpp/Impp/Pmpp from discovered strings.
 *
 * Sun intensity model:
 * - Vmpp stays roughly stable.
 * - Impp scales with sunIntensity.
 */
export const computePvFromStrings = (components, strings, sunIntensity) => {
  const componentsById = new Map(components.map(c => [c.id, c]));
  const s = Math.max(0, Math.min(1, safeNumber(sunIntensity, 1)));

  const stringDetails = strings.map(panelIds => {
    const panels = panelIds.map(id => componentsById.get(id)).filter(Boolean);
    const elems = panels.map(p => {
      const powerW = Math.max(0, safeNumber(p?.properties?.powerW, 0));
      const vmpp = Math.max(1e-6, safeNumber(p?.properties?.vmpp ?? p?.properties?.vmp, 40));
      const impp = Math.max(0, safeNumber(p?.properties?.impp ?? p?.properties?.imp, powerW / vmpp));
      return { id: p.id, vmpp, impp, imppEff: impp * s };
    });

    const vString = elems.reduce((sum, e) => sum + e.vmpp, 0);
    const iString = elems.length ? Math.min(...elems.map(e => e.imppEff)) : 0;
    const pString = vString * iString;

    return { panelIds, vmppV: vString, imppA: iString, pmppW: pString };
  });

  const pmppW = stringDetails.reduce((sum, d) => sum + d.pmppW, 0);
  const vmppV = stringDetails.length ? Math.min(...stringDetails.map(d => d.vmppV)) : 0;
  const imppA = stringDetails.reduce((sum, d) => sum + d.imppA, 0);

  const connectedPanels = Array.from(new Set(strings.flat()));

  return {
    connectedPanels,
    stringCount: strings.length,
    vmppV,
    imppA,
    pmppW,
    stringDetails,
  };
};

