import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <section className="error-panel">
        <span>404</span>
        <h1>页面不存在</h1>
        <p>这个地址没有对应的 Admission OS 页面。</p>
        <Link href="/">回到驾驶舱</Link>
      </section>
    </main>
  );
}
