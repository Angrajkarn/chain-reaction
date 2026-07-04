// ============================================================
// Cell — Individual board cell with static orb display
// ============================================================

import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { PLAYER_COLORS } from '../constants/colors';
import { OrbData, Player } from '../types';
import { getCriticalMass } from '../utils/gameEngine';
import Orb from './Orb';

interface CellProps {
  row: number;
  col: number;
  data: OrbData;
  cellWidth: number;
  cellHeight: number;
  isMyTurn: boolean;
  myPlayerNumber: Player | null;
  onPress: (row: number, col: number) => void;
  maxRows: number;
  maxCols: number;
}

export default function Cell({
  row,
  col,
  data,
  cellWidth,
  cellHeight,
  isMyTurn,
  myPlayerNumber,
  onPress,
  maxRows,
  maxCols,
}: CellProps) {

  const canInteract =
    isMyTurn &&
    myPlayerNumber !== null &&
    (data.owner === null || data.owner === myPlayerNumber);

  const handlePress = useCallback(() => {
    if (!canInteract) return;
    onPress(row, col);
  }, [canInteract, onPress, row, col]);

  const critMass = getCriticalMass(row, col, maxRows, maxCols);
  const isFull = data.count >= critMass - 1;

  const gridBorderColor = 'rgba(255, 255, 255, 0.12)';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={canInteract ? 0.8 : 1}
      style={[styles.touch, { width: cellWidth, height: cellHeight }]}
      disabled={!canInteract}
    >
      <View
        style={[
          styles.cell,
          {
            width: cellWidth,
            height: cellHeight,
            borderColor: gridBorderColor,
            borderWidth: 0.5,
          },
          isFull && data.owner && {
            shadowColor: PLAYER_COLORS[data.owner].primary,
            shadowOpacity: 0.3,
            shadowRadius: 8,
          },
        ]}
      >
        {/* Render cell contents based on state count */}
        {data.count > 0 && data.owner && (
          <Orb
            key={`orb_${row}_${col}`}
            count={data.count}
            owner={data.owner}
            size={Math.min(cellWidth, cellHeight)}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  cell: {
    backgroundColor: '#1f1f2e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    overflow: 'visible',
  },
});
