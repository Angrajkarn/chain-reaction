// ============================================================
// GameBoard — Grid of cells, occupying full viewport size
// ============================================================

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useGameStore } from '../store/gameStore';
import Cell from './Cell';
import Explosion from './Explosion';
import { Player } from '../types';

interface GameBoardProps {
  isMyTurn: boolean;
  myPlayerNumber: Player | null;
  onCellPress: (row: number, col: number) => void;
}

export default function GameBoard({
  isMyTurn,
  myPlayerNumber,
  onCellPress,
}: GameBoardProps) {
  const { width: W, height: H } = Dimensions.get('window');
  const board = useGameStore((s) => s.board);
  const explosions = useGameStore((s) => s.explosions);
  const removeExplosion = useGameStore((s) => s.removeExplosion);

  // Dynamic grid rows & cols read directly from current board properties
  const rows = board.length;
  const cols = board[0]?.length || 6;

  const cellWidth = useMemo(() => {
    return W / cols;
  }, [W, cols]);

  const cellHeight = useMemo(() => {
    return H / rows;
  }, [H, rows]);

  const boardWidth = W;
  const boardHeight = H;

  return (
    <View style={[styles.container, { width: boardWidth, height: boardHeight }]}>
      {/* 1. Underlying grid of cells */}
      {board.map((rowData, row) =>
        rowData.map((cellData, col) => (
          <Cell
            key={`${row}-${col}`}
            row={row}
            col={col}
            data={cellData}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            isMyTurn={isMyTurn}
            myPlayerNumber={myPlayerNumber}
            onPress={onCellPress}
            maxRows={rows}
            maxCols={cols}
          />
        ))
      )}

      {/* 2. Top-level absolute overlay layer for unclipped, seamless traveling animations! */}
      {explosions.map((exp) => (
        <View
          key={exp.id}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: exp.col * cellWidth,
            top: exp.row * cellHeight,
            width: cellWidth,
            height: cellHeight,
            overflow: 'visible', // Float freely across grid bounds without truncation
            zIndex: 999,      // Put above all grid cell boundaries
          }}
        >
          <Explosion
            id={exp.id}
            player={exp.player}
            row={exp.row}
            col={exp.col}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            maxRows={rows}
            maxCols={cols}
            onComplete={() => removeExplosion(exp.id)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'center',
    overflow: 'visible',
  },
});
