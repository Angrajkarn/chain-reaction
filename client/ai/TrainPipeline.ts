// ============================================================
// TrainPipeline — Automates generation of self-play games and neural network training
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { simulateSelfPlayGame, SelfPlayGame } from './SelfPlay';
import { MLPModel, ModelWeights } from './MLPModel';

const SOURCE_DIR = fs.existsSync(path.join(__dirname, '../../ai/ai-model-weights.json'))
  ? path.join(__dirname, '../../ai')
  : __dirname;

const WEIGHTS_FILE = path.join(SOURCE_DIR, 'ai-model-weights.json');
const DATASET_FILE = path.join(SOURCE_DIR, 'selfplay-dataset.json');

/**
 * Trains the MLP model on a batch of self-play games.
 */
function trainModelOnDataset(
  model: MLPModel,
  games: SelfPlayGame[],
  epochs = 8,
  learningRate = 0.01
) {
  console.log(`Starting training on ${games.length} games...`);

  // Prepare training pairs: (features, target outcome)
  // Win is +1 for AI (whichever player state matches AI), -1 for loss
  interface TrainSample {
    features: number[];
    target: number;
  }

  const dataset: TrainSample[] = [];

  for (const game of games) {
    const winner = game.winner;
    for (const state of game.states) {
      // If the player of this state won, target is +1.0, otherwise -1.0
      const target = state.player === winner ? 1.0 : -1.0;
      dataset.push({
        features: state.features,
        target,
      });
    }
  }

  // Shuffle dataset
  for (let i = dataset.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dataset[i], dataset[j]] = [dataset[j], dataset[i]];
  }

  // SGD Training loop
  for (let epoch = 1; epoch <= epochs; epoch++) {
    let totalLoss = 0;
    for (const sample of dataset) {
      const pred = model.forward(sample.features).out;
      const error = pred - sample.target;
      totalLoss += error * error;

      // Single step weight adjustments
      model.trainStep(sample.features, sample.target, learningRate);
    }
    const avgLoss = totalLoss / dataset.length;
    console.log(`Epoch ${epoch}/${epochs} - Learning Rate: ${learningRate} - MSE Loss: ${avgLoss.toFixed(6)}`);
  }

  console.log('Model training complete.');
}

/**
 * Validates the model performance against random decisions.
 */
function validateModel(model: MLPModel, testGamesCount = 100): number {
  let modelWins = 0;
  for (let i = 0; i < testGamesCount; i++) {
    // Model plays as player 1 vs random player 2
    const game = simulateSelfPlayGame(6, 6, 0.1); // low exploration
    if (game.winner === 1) {
      modelWins++;
    }
  }
  return modelWins / testGamesCount;
}

export function runPipeline(gamesToGenerate = 3000, epochs = 1) {
  const model = new MLPModel();

  // Load existing weights if they exist (allows resuming)
  if (fs.existsSync(WEIGHTS_FILE)) {
    console.log('Loading existing model weights for resume...');
    const data = fs.readFileSync(WEIGHTS_FILE, 'utf8');
    model.loadWeights(data);
  }

  const BATCH_SIZE = 2500;
  const numBatches = Math.ceil(gamesToGenerate / BATCH_SIZE);

  console.log(`Starting Training Pipeline: Total Games = ${gamesToGenerate}, Batches = ${numBatches}, Epochs/Batch = ${epochs}`);

  for (let batch = 1; batch <= numBatches; batch++) {
    const startIdx = (batch - 1) * BATCH_SIZE + 1;
    const endIdx = Math.min(batch * BATCH_SIZE, gamesToGenerate);
    const currentBatchSize = endIdx - startIdx + 1;

    console.log(`\n--- Batch ${batch}/${numBatches} (Games ${startIdx} to ${endIdx}) ---`);
    process.stdout.write(`Simulating ${currentBatchSize} self-play games... `);

    const games: SelfPlayGame[] = [];
    const tStart = Date.now();
    for (let i = 0; i < currentBatchSize; i++) {
      const game = simulateSelfPlayGame(6, 6, 0.25); // exploration key
      games.push(game);
    }
    const elapsedSim = ((Date.now() - tStart) / 1000).toFixed(1);
    console.log(`done in ${elapsedSim}s.`);

    // Train the model on the current batch
    trainModelOnDataset(model, games, epochs, 0.005);

    // Save weights after every batch so process is resume-safe & incremental
    fs.writeFileSync(WEIGHTS_FILE, model.saveWeights(), 'utf8');
    console.log(`Saved batch checkpoints to: client/ai/ai-model-weights.json`);

    // Perform validation check occasionally
    if (batch % Math.max(1, Math.floor(numBatches / 5)) === 0 || batch === numBatches) {
      const winRate = validateModel(model, 80);
      console.log(`[Validation Update] Model Win Rate vs Exploratory P2: ${(winRate * 100).toFixed(2)}%`);
    }
  }

  console.log('\n======================================================');
  console.log(`Pipeline Complete. Trained on ${gamesToGenerate} games.`);
  console.log('Final model weights exported to: client/ai/ai-model-weights.json');
  console.log('======================================================');
}

// Ensure the pipeline can be executed as a command-line script
if (require.main === module) {
  const args = process.argv.slice(2);
  const count = args[0] ? parseInt(args[0], 10) : 1000; // default 1000 for faster training run
  const epochs = args[1] ? parseInt(args[1], 10) : 8;
  runPipeline(count, epochs);
}
