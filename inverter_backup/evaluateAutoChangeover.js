import { COMPONENT_TYPES } from '../types';

/**
 * Evaluates active Auto Changeover switches and determines state updates.
 * This runs as part of the _evaluate loop, ensuring instant reaction to state changes.
 * 
 * @param {Array} components 
 * @param {Object} simulationState { livePhaseSet, neutralSet }
 * @returns {Array} List of { id, updates }
 */
export const evaluateAutoChangeover = (components, simulationState) => {
  const updatesList = [];
  const { livePhaseSet, neutralSet } = simulationState;
  const now = Date.now();

  components.forEach(c => {
      // 1. Inverter Internal Transfer Switch Logic
      if (c.type === COMPONENT_TYPES.INVERTER && c.properties.enabled) {
          const mainsL = `${c.id}:AC_IN_L`;
          const mainsN = `${c.id}:AC_IN_N`;
          // Check if AC_IN is energized (Mains Present)
          const mainsAvailable = livePhaseSet.has(mainsL) && neutralSet.has(mainsN);
          
          let updates = {};
          let changed = false;

          // If Mains Available -> Bypass Mode (True)
          // If Mains Lost -> Inverter Mode (False)
          const targetBypass = mainsAvailable;
          
          if (c.properties.isBypassMode !== targetBypass) {
              updates.isBypassMode = targetBypass;
              updates.status = targetBypass ? 'Mains (Bypass)' : 'Inverter';
              changed = true;
          }
          // Also update status text if it mismatches (e.g. initial load)
          else if (!c.properties.status || (c.properties.status === 'Mains (Bypass)' && !targetBypass) || (c.properties.status === 'Inverter' && targetBypass)) {
               updates.status = targetBypass ? 'Mains (Bypass)' : 'Inverter';
               changed = true;
          }

          if (changed) {
              updatesList.push({ id: c.id, updates });
          }
      }

      // 2. External Auto Changeover Logic
      if (c.type === COMPONENT_TYPES.CHANGEOVER && c.properties.mode === 'AUTO') {
          // Check Mains Availability (A terminals)
          const mainsL = `${c.id}:A_L`;
          const mainsN = `${c.id}:A_N`;
          // We must check if A_L is energized by an EXTERNAL source.
          // Since the switch connects A->OUT or B->OUT, if it is currently connected to A,
          // checking A_L availability is valid.
          // BUT: If the switch is connected A->OUT, A_L might be energized from OUT if there's a backfeed?
          // (Unlikely in this sim).
          // Standard check: Is A_L energized?
          const mainsAvailable = livePhaseSet.has(mainsL) && neutralSet.has(mainsN);

          // Check Inverter Availability (B terminals)
          const invL = `${c.id}:B_L`;
          const invN = `${c.id}:B_N`;
          const inverterAvailable = livePhaseSet.has(invL) && neutralSet.has(invN);

          console.log('Auto Changeover Check:', c.id, {
              position: c.properties.position,
              targetPosition: c.properties.targetPosition,
              mainsAvailable,
              inverterAvailable,
              B_L_energized: livePhaseSet.has(invL),
              B_N_energized: neutralSet.has(invN)
          });

          let desiredPosition = 'OFF';
          let status = 'AUTO: NO SUPPLY';

          if (mainsAvailable) {
              desiredPosition = 'MAINS';
              status = 'AUTO: Using MAINS';
          } else if (inverterAvailable) {
              desiredPosition = 'INVERTER';
              status = 'AUTO: Using INVERTER';
          }

          const currentPosition = c.properties.position;
          const isTransferring = c.properties.position === 'OFF' || (c.properties.targetPosition && c.properties.targetPosition !== currentPosition);
          
          let updates = {};
          let changed = false;

          // Update Status Text
          if (c.properties.autoStatus !== status) {
              updates.autoStatus = status;
              changed = true;
          }

          // State Machine: Trigger Transfer
          // Case A: Stable, but desired changed -> Start Transfer
          if (currentPosition !== desiredPosition && !isTransferring && currentPosition !== 'OFF') {
               const delay = c.properties.upsMode ? 20 : (c.properties.transferDelayMs || 200);

               updates.targetPosition = desiredPosition;
               updates.transferStartTime = now;
               updates.transferDelay = delay;
               updates.position = 'OFF'; // Disconnect immediately
               changed = true;
               console.log('  -> Initiating transfer from', currentPosition, 'to', desiredPosition);
          }
          // Case B: Startup/Reset (e.g. was manual, just switched to auto and was OFF or invalid)
          else if (currentPosition === 'OFF' && !c.properties.targetPosition) {
               updates.position = desiredPosition;
               changed = true;
               console.log('  -> Direct switch to', desiredPosition);
          }
          // Case C: Transfer stuck - position should be OFF but isn't
          else if (c.properties.targetPosition && currentPosition !== 'OFF') {
               console.log('  -> STUCK! targetPosition exists but position is not OFF. Forcing to OFF.');
               updates.position = 'OFF';
               changed = true;
          }

          if (changed) {
              updatesList.push({ id: c.id, updates });
          }
      }
  });

  return updatesList;
};
