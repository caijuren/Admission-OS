"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <section className="error-panel">
        <span>错误</span>
        <h1>页面加载失败</h1>
        <p>请稍后重试。如果问题持续出现，检查生产环境变量和数据源连接。</p>
        <button onClick={reset}>重试</button>
      </section>
    </main>
  );
}
