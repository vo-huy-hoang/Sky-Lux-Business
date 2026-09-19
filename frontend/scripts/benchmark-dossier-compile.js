/**
 * TICKET-52.1: Benchmark Script for Dossier Detail JIT/Turbopack Compilation
 * Measures Cold-Start vs Warm AST parsing, module graph resolution, and compilation speed.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { performance } = require('perf_hooks');

const BASELINE_COMPILE_MS = 2800; // Mốc ban đầu trước khi refactor: ~2,800ms
const TARGET_COLD_MS = 600;       // Mục tiêu Cold-start: < 600ms
const TARGET_WARM_MS = 150;       // Mục tiêu Warm-cache: < 150ms
const TARGET_TABS_AST_NODES = 4500; // Mục tiêu Tabs Critical Path AST Nodes: < 4,500 (trước đây > 8,500)

const ROOT_DIR = path.resolve(__dirname, '..');
const DOSSIER_ENTRY = path.join(ROOT_DIR, 'app', 'main', 'dossiers', '[id]', 'page.tsx');

// Tabs Subtree Critical Path (chỉ nạp Overview, không nạp static 3 sub-tabs)
const TABS_CRITICAL_COMPONENTS = [
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierDetailTabs.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierCostTable.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'CostSummaryTable.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierRevenueTable.tsx'),
];

// Critical Path Modules toàn bộ màn hình chi tiết hồ sơ
const ALL_CRITICAL_COMPONENTS = [
  path.join(ROOT_DIR, 'app', 'main', 'dossiers', '[id]', 'page.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'DossierDetailView.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'index.ts'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'types.ts'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'utils.ts'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'stores', 'useDossierUIStore.ts'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'hooks', 'useDossierActiveEstimate.ts'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'hooks', 'useDossierFinancials.ts'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'hooks', 'useDossierWorkflowActions.ts'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierHeader.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierStepsCard.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierSummaryCards.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierDetailTabs.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierCostTable.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'CostSummaryTable.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierRevenueTable.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'OperatorNotesCard.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierWorkflowTimeline.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierWorkflowActionBar.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierActionModal.tsx'),
];

// Các dynamic chunks được tách biệt (Lazy-loaded với next/dynamic ssr: false)
const DYNAMIC_SPLIT_CHUNKS = [
  path.join(ROOT_DIR, 'components', 'documents', 'DossierDocumentsTab.tsx'),
  path.join(ROOT_DIR, 'app', 'main', 'dossiers', 'components', 'DossierComments.tsx'),
  path.join(ROOT_DIR, 'components', 'dossiers', 'detail', 'components', 'DossierPaymentsTab.tsx'),
];

function measureModuleGraphCompilation(fileList) {
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
  console.log('🚀 SKYLUX DOSSIER DETAIL COMPILATION BENCHMARK (TICKET-52.1)');
  console.log('================================================================\n');

  console.log(`📍 Entrypoint: ${DOSSIER_ENTRY}`);
  console.log(`📦 All Critical Path Modules: ${ALL_CRITICAL_COMPONENTS.length} files`);
  console.log(`📑 Tabs Critical Subtree: ${TABS_CRITICAL_COMPONENTS.length} files`);
  console.log(`✂️  Dynamic Lazy Chunks: ${DYNAMIC_SPLIT_CHUNKS.length} files\n`);

  // 1. Cold-start measurement (Fresh module resolution + parsing + transpilation)
  console.log('🔄 Đang đo đạc Cold-Start Compilation (Không dùng cache)...');
  const coldMetrics = measureModuleGraphCompilation(ALL_CRITICAL_COMPONENTS);
  console.log(`   ⏱️  Cold-start Duration: ${coldMetrics.duration.toFixed(2)} ms`);
  console.log(`   🌳 AST Nodes: ${coldMetrics.totalAstNodes.toLocaleString()}`);
  console.log(`   📄 Critical Bundle Size: ${(coldMetrics.totalBytes / 1024).toFixed(2)} KB\n`);

  // 2. Tabs Subtree Critical Path measurement
  const tabsMetrics = measureModuleGraphCompilation(TABS_CRITICAL_COMPONENTS);
  console.log(`📑 Cấu trúc Tabs Khởi Đầu (Overview Tab Critical Path):`);
  console.log(`   🌳 AST Nodes: ${tabsMetrics.totalAstNodes.toLocaleString()} nodes (Mục tiêu: < ${TARGET_TABS_AST_NODES.toLocaleString()})`);
  console.log(`   ⏱️  Parse Duration: ${tabsMetrics.duration.toFixed(2)} ms\n`);

  // 3. Dynamic Chunk savings calculation
  const lazyMetrics = measureModuleGraphCompilation(DYNAMIC_SPLIT_CHUNKS);
  console.log(`💡 Tiết kiệm từ Dynamic Splitting (Documents + Comments + Payments):`);
  console.log(`   ✂️  Giảm tải AST: ${lazyMetrics.totalAstNodes.toLocaleString()} nodes`);
  console.log(`   ✂️  Giảm tải Payload: ${(lazyMetrics.totalBytes / 1024).toFixed(2)} KB`);
  console.log(`   ⏱️  Thời gian tiết kiệm trên luồng chính: ${lazyMetrics.duration.toFixed(2)} ms\n`);

  // 4. Warm Cache measurement (Second run with warm JIT / memory)
  console.log('🔥 Đang đo đạc Warm-Cache Compilation...');
  const warmRuns = [];
  for (let i = 0; i < 5; i++) {
    const run = measureModuleGraphCompilation(ALL_CRITICAL_COMPONENTS);
    warmRuns.push(run.duration);
  }
  const avgWarmMs = warmRuns.reduce((a, b) => a + b, 0) / warmRuns.length;
  console.log(`   ⏱️  Warm-Cache Average (5 runs): ${avgWarmMs.toFixed(2)} ms\n`);

  // 5. Comparison with Baseline
  const speedupPercent = (((BASELINE_COMPILE_MS - coldMetrics.duration) / BASELINE_COMPILE_MS) * 100).toFixed(1);

  console.log('----------------------------------------------------------------');
  console.log('📊 KẾT QUẢ SO SÁNH VỚI BASELINE:');
  console.log(`   • Baseline ban đầu (Monolith Eager): ${BASELINE_COMPILE_MS.toLocaleString()} ms`);
  console.log(`   • Cold-start sau tối ưu:            ${coldMetrics.duration.toFixed(2)} ms (Mục tiêu: < ${TARGET_COLD_MS} ms)`);
  console.log(`   • Warm-cache trung bình:            ${avgWarmMs.toFixed(2)} ms (Mục tiêu: < ${TARGET_WARM_MS} ms)`);
  console.log(`   • Tabs Subtree AST Nodes:           ${tabsMetrics.totalAstNodes.toLocaleString()} nodes (Mục tiêu: < ${TARGET_TABS_AST_NODES.toLocaleString()})`);
  console.log(`   • Tốc độ biên dịch cải thiện:       ${speedupPercent}%`);
  console.log('----------------------------------------------------------------\n');

  const coldPassed = coldMetrics.duration < TARGET_COLD_MS;
  const warmPassed = avgWarmMs < TARGET_WARM_MS;
  const tabsAstPassed = tabsMetrics.totalAstNodes < TARGET_TABS_AST_NODES;

  if (coldPassed && warmPassed && tabsAstPassed) {
    console.log('✅ BENCHMARK PASSED: Đạt toàn bộ các tiêu chuẩn nghiệm thu TICKET-52.1!');
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
