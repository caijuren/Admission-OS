export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-panel">
        <h1>隐私与数据说明</h1>
        <p>
          Admission OS 用于家庭内部记录升学规划、校内成绩、阅读表达、项目荣誉和阶段复盘。
          当前版本为单家庭自用部署，不开放公开注册。
        </p>

        <section>
          <h2>我们保存哪些数据</h2>
          <p>孩子档案、目标计划、成绩记录、阅读记录、项目/荣誉证据、成长档案和复盘内容。</p>
        </section>

        <section>
          <h2>数据用途</h2>
          <p>这些数据只用于生成驾驶舱、能力资产、申请材料和阶段复盘，不用于公开展示。</p>
        </section>

        <section>
          <h2>访问控制</h2>
          <p>
            当前部署未启用站内登录。建议通过服务器安全组、反向代理访问控制或后续账号体系限制访问范围。
          </p>
        </section>

        <section>
          <h2>生产存储</h2>
          <p>
            内测阶段可使用本地 JSON 数据。正式上线建议切换到 Supabase，并配置行级安全策略，
            确保不同家庭或学生之间的数据隔离。
          </p>
        </section>

        <section>
          <h2>删除与导出</h2>
          <p>
            当前应用支持在界面内整理和导出申请材料。若需要删除全部数据，应由系统管理员在数据源中执行清理。
          </p>
        </section>
      </article>
    </main>
  );
}
