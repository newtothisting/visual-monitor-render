export default function Home() {
  return (
    <main style={{fontFamily:'system-ui, Arial', padding: 24}}>
      <h1>Visual Monitor — Render Demo</h1>
      <p>Your deployment is working. This is a minimal placeholder UI.</p>
      <ul>
        <li>Web app running on Render</li>
        <li>Worker service (Playwright) runs separately</li>
        <li>Configure env vars in Render Dashboard</li>
      </ul>
    </main>
  );
}
