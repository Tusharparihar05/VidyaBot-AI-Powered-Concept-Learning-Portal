/**
 * VidyaBot Benchmark Script
 * Compares: Sequential vs Promise.allSettled vs Cached execution times.
 * Run: npm run benchmark (from backend/)
 * Output: Table for project report.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const redis = require('../config/redis');
const { refinePrompt, getStructuredAnswer } = require('../services/nvidiaService');
const { getOrGenerateContent, hashPrompt, checkRedisCache } = require('../services/contentService');
const { submitRenderJob } = require('../api/creatomate');
const { submitVideoJob } = require('../api/heygen');

const TEST_QUESTION = 'Explain how binary search works with an example';
const GRADE = 'Class 12';

async function timeIt(label, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = Date.now() - start;
    return { label, elapsed, success: true, result };
  } catch (err) {
    const elapsed = Date.now() - start;
    return { label, elapsed, success: false, error: err.message };
  }
}

async function runSequential(refined) {
  // Simulate original architecture: all 3 pipelines run one after another
  console.log('\n--- SEQUENTIAL (original bad design) ---');

  const t1 = await timeIt('Text Generation', () => getStructuredAnswer(refined, GRADE));
  const t2 = await timeIt('Animation Submit', () => submitRenderJob([]));
  const t3 = await timeIt('Video Submit', () => submitVideoJob('Test script'));

  const total = t1.elapsed + t2.elapsed + t3.elapsed;
  return { t1, t2, t3, total };
}

async function runParallel(refined) {
  // Optimized: all 3 fire simultaneously
  console.log('\n--- PARALLEL (Promise.allSettled) ---');

  const start = Date.now();
  const [r1, r2, r3] = await Promise.allSettled([
    timeIt('Text Generation', () => getStructuredAnswer(refined, GRADE)),
    timeIt('Animation Submit', () => submitRenderJob([])),
    timeIt('Video Submit', () => submitVideoJob('Test script')),
  ]);

  const total = Date.now() - start;
  return {
    t1: r1.value || r1.reason,
    t2: r2.value || r2.reason,
    t3: r3.value || r3.reason,
    total,
  };
}

async function runCached(question) {
  // Best case: cached response
  console.log('\n--- CACHED (Redis hit) ---');

  const hash = hashPrompt(question);
  const t1 = await timeIt('Cache Lookup', () => checkRedisCache(hash));

  return { t1, total: t1.elapsed };
}

async function main() {
  await connectDB();

  console.log('='.repeat(60));
  console.log('  VidyaBot Performance Benchmark');
  console.log('  Question:', TEST_QUESTION);
  console.log('='.repeat(60));

  // First call: populates cache
  console.log('\n[Warmup] Generating content for cache...');
  const warmupStart = Date.now();
  const refined = await refinePrompt(TEST_QUESTION, GRADE);
  const hash = hashPrompt(TEST_QUESTION);
  await getOrGenerateContent(refined, GRADE, hash);
  console.log(`[Warmup] Done in ${Date.now() - warmupStart}ms`);

  // Benchmark runs
  const seq = await runSequential(refined);
  const par = await runParallel(refined);
  const cached = await runCached(TEST_QUESTION);

  // Results table
  console.log('\n' + '='.repeat(60));
  console.log('  BENCHMARK RESULTS');
  console.log('='.repeat(60));
  console.log('');
  console.log(`${'Method'.padEnd(25)} ${'Total (ms)'.padEnd(15)} ${'Text (ms)'.padEnd(15)} Notes`);
  console.log('-'.repeat(75));
  console.log(`${'Sequential'.padEnd(25)} ${String(seq.total).padEnd(15)} ${String(seq.t1.elapsed).padEnd(15)} 3 calls in series`);
  console.log(`${'Parallel'.padEnd(25)} ${String(par.total).padEnd(15)} ${String(par.t1.elapsed).padEnd(15)} Promise.allSettled`);
  console.log(`${'Cached (Redis)'.padEnd(25)} ${String(cached.total).padEnd(15)} ${String(cached.t1.elapsed).padEnd(15)} Zero LLM cost`);
  console.log('-'.repeat(75));

  const savings = (((seq.total - par.total) / seq.total) * 100).toFixed(1);
  const cacheSavings = (((seq.total - cached.total) / seq.total) * 100).toFixed(1);

  console.log('');
  console.log(`Parallel vs Sequential: ${savings}% faster`);
  console.log(`Cached vs Sequential:   ${cacheSavings}% faster`);
  console.log(`Cache speedup:          ${(seq.total / Math.max(cached.total, 1)).toFixed(0)}x`);
  console.log('');

  await mongoose.connection.close();
  await redis.quit();
  process.exit(0);
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
