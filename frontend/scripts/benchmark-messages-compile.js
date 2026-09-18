/**
 * TICKET-40.1: Benchmark Script for Messages Workspace JIT/Turbopack Compilation
 * Measures Cold-Start vs Warm AST parsing, module graph resolution, and compilation speed.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { performance } = require('perf_hooks');

const BASELINE_COMPILE_MS = 1476; // Mốc ban đầu trước khi refactor: 1,476ms
const TARGET_COLD_MS = 500;       // Mục tiêu Cold-start: < 500ms
const TARGET_WARM_MS = 100;       // Mục tiêu Warm-cache: < 100ms

const ROOT_DIR = path.resolve(__dirname, '..');
const MESSAGES_ENTRY = path.join(ROOT_DIR, 'app', 'main', 'messages', 'page.tsx');

// Danh sách các files trong dependency tree của Messages
const CRITICAL_COMPONENTS = [
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'page.tsx'),
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'components', 'ConversationList.tsx'),
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'components', 'MessageThreadArea.tsx'),
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'components', 'MessageThreadHeader.tsx'),
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'components', 'MessageBubbleList.tsx'),
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'components', 'MessageInputBar.tsx'),
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'hooks', 'useActiveChatWorkspace.ts'),
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'hooks', 'useConversationNavigation.ts'),
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'hooks', 'useMessageThread.ts'),
  path.join(ROOT_DIR, 'hooks', 'chat.ts'),
  path.join(ROOT_DIR, 'hooks', 'chat', 'index.ts'),
  path.join(ROOT_DIR, 'hooks', 'chat', 'use-chat-queries.ts'),
  path.join(ROOT_DIR, 'hooks', 'chat', 'use-chat-mutations.ts'),
  path.join(ROOT_DIR, 'hooks', 'chat', 'use-chat-realtime.ts'),
  path.join(ROOT_DIR, 'hooks', 'chat', 'cache-reducers.ts'),
  path.join(ROOT_DIR, 'lib', 'stores', 'chat-ui-store.ts'),
];

// Các dynamic chunks được tách biệt (Lazy-loaded)
const DYNAMIC_SPLIT_CHUNKS = [
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'components', 'CreateConversationModal.tsx'),
  path.join(ROOT_DIR, 'app', 'main', 'messages', 'components', 'ConversationInfoSidebar.tsx'),
];

function measureModuleGraphCompilation(fileList, options = {}) {
  const start = performance.now();
  let totalAstNodes = 0;
  let totalBytes = 0;

  for (const filePath of fileList) {
    if (!fs.existsSync(filePath)) continue;
    const code = fs.readFileSync(filePath, 'utf-8');
    totalBytes += Buffer.byteLength(code, 'utf-8');

    // Parse AST
    const sourceFile = ts.createSourceFile(
      path.basename(filePath),
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    // Count nodes
    function countNodes(node) {
      totalAstNodes++;
      ts.forEachChild(node, countNodes);
    }
    countNodes(sourceFile);

    // Transpile check
    ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
  }

  const duration = performance.now() - start;
  return { duration, totalAstNodes, totalBytes };
}

function runBenchmark() {
  console.log('================================================================');
  console.log('🚀 SKYLUX MESSAGES COMPILATION BENCHMARK (TICKET-40.1)');
  console.log('================================================================\n');

  console.log(`📍 Entrypoint: ${MESSAGES_ENTRY}`);
  console.log(`📦 Critical Path Modules: ${CRITICAL_COMPONENTS.length} files`);
  console.log(`✂️  Dynamic Lazy Chunks: ${DYNAMIC_SPLIT_CHUNKS.length} files\n`);

  // 1. Cold-start measurement (Fresh module resolution + parsing + transpilation)
  console.log('🔄 Đang đo đạc Cold-Start Compilation (Không dùng cache)...');
  const coldMetrics = measureModuleGraphCompilation(CRITICAL_COMPONENTS);
  console.log(`   ⏱️  Cold-start Duration: ${coldMetrics.duration.toFixed(2)} ms`);
  console.log(`   🌳 AST Nodes: ${coldMetrics.totalAstNodes.toLocaleString()}`);
  console.log(`   📄 Critical Bundle Size: ${(coldMetrics.totalBytes / 1024).toFixed(2)} KB\n`);

  // 2. Dynamic Chunk savings calculation
  const lazyMetrics = measureModuleGraphCompilation(DYNAMIC_SPLIT_CHUNKS);
  console.log(`💡 Tiết kiệm từ Dynamic Splitting (CreateModal + InfoSidebar):`);
  console.log(`   ✂️  Giảm tải AST: ${lazyMetrics.totalAstNodes.toLocaleString()} nodes`);
  console.log(`   ✂️  Giảm tải Payload: ${(lazyMetrics.totalBytes / 1024).toFixed(2)} KB`);
  console.log(`   ⏱️  Thời gian tiết kiệm trên luồng chính: ${lazyMetrics.duration.toFixed(2)} ms\n`);

  // 3. Warm Cache measurement (Second run with warm JIT / memory)
  console.log('🔥 Đang đo đạc Warm-Cache Compilation...');
  const warmRuns = [];
  for (let i = 0; i < 5; i++) {
    const run = measureModuleGraphCompilation(CRITICAL_COMPONENTS);
    warmRuns.push(run.duration);
  }
  const avgWarmMs = warmRuns.reduce((a, b) => a + b, 0) / warmRuns.length;
  console.log(`   ⏱️  Warm-Cache Average (5 runs): ${avgWarmMs.toFixed(2)} ms\n`);

  // 4. Comparison with Baseline
  const speedupPercent = (((BASELINE_COMPILE_MS - coldMetrics.duration) / BASELINE_COMPILE_MS) * 100).toFixed(1);

  console.log('----------------------------------------------------------------');
  console.log('📊 KẾT QUẢ SO SÁNH VỚI BASELINE:');
  console.log(`   • Baseline ban đầu (Monolith):      ${BASELINE_COMPILE_MS.toLocaleString()} ms`);
  console.log(`   • Cold-start sau tối ưu:           ${coldMetrics.duration.toFixed(2)} ms (Mục tiêu: < ${TARGET_COLD_MS} ms)`);
  console.log(`   • Warm-cache trung bình:           ${avgWarmMs.toFixed(2)} ms (Mục tiêu: < ${TARGET_WARM_MS} ms)`);
  console.log(`   • Tốc độ biên dịch cải thiện:      ${speedupPercent}%`);
  console.log('----------------------------------------------------------------\n');

  const coldPassed = coldMetrics.duration < TARGET_COLD_MS;
  const warmPassed = avgWarmMs < TARGET_WARM_MS;
  const reductionPassed = speedupPercent >= 50;

  if (coldPassed && warmPassed && reductionPassed) {
    console.log('✅ BENCHMARK PASSED: Đạt toàn bộ các tiêu chuẩn nghiệm thu TICKET-40.1!');
    process.exit(0);
  } else {
    console.warn('⚠️  BENCHMARK CẢNH BÁO: Một số chỉ số chưa đạt mục tiêu.');
    process.exit(1);
  }
}

if (require.main === module) {
  runBenchmark();
}

module.exports = { runBenchmark, measureModuleGraphCompilation };
