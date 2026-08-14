<script lang="ts">
  // Marketing hero: Scrooge-flavoured black/gold nav, bold display title with a gold rule,
  // and the slogan banner. Straight lines only; the top hat is a small inline mark, not a graphic.
</script>

<header class="hero">
  <nav class="topbar">
    <span class="brand">
      <svg class="logo" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="4" y="23" width="24" height="3" fill="#000" />
        <rect x="9" y="5" width="14" height="18" fill="#1a1a1a" />
        <rect x="9" y="17" width="14" height="3" fill="var(--coat-red)" />
      </svg>
      McDuck Inc.
    </span>
    <span class="slogan">Scrooge McDuck's money bin is officially open for business. 🦆💰</span>

    <span class="links">
      Financing · Approvals · Upload ·
      <a class="rental" href="https://baiganio.github.io/Scrooge-Rental/" target="_blank" rel="noopener noreferrer">Rental ↗</a>
    </span>
  </nav>

  <h1 class="display title">Welcome To Scrooge Financing</h1>
  <div class="rule" aria-hidden="true"></div>

  <p class="tagline">The best place in the world for financing trade documents… with just a few clicks ;)</p>
</header>

<style>
  .hero {
    background: linear-gradient(180deg, #ffffff 0%, #faf8ff 100%);
  }
  .topbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.6rem 1.5rem;
    /* Purple bar — the slogan emojis read far better here than on the old black. */
    background: var(--accent);
    border-bottom: 3px solid var(--gold);
  }
  .slogan {
    flex: 1 1 auto;
    text-align: center;
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.2px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--gold);
  }
  .logo {
    width: 26px;
    height: 26px;
    display: block;
  }
  .links {
    color: #f3f0ff;
    font-weight: 600;
    font-size: 0.9rem;
  }
  .rental {
    color: var(--gold);
    text-decoration: none;
    border-bottom: 2px solid var(--gold);
    padding-bottom: 1px;
  }
  .rental:hover {
    color: #fff;
    border-bottom-color: #fff;
  }
  .title {
    text-align: center;
    margin: 1.6rem 0 0.6rem;
    font-size: clamp(2rem, 5.5vw, 3.6rem);
    font-weight: 700;
    color: var(--hat-black);
    line-height: 1.05;
  }
  /* gold "coin" rule under the headline */
  .rule {
    width: 160px;
    height: 4px;
    margin: 0 auto 0.4rem;
    background: linear-gradient(90deg, var(--gold-deep), var(--gold), var(--gold-deep));
  }
  .tagline {
    text-align: center;
    margin: 0.2rem 0 1.4rem;
    color: var(--muted);
    font-size: 1.05rem;
  }
</style>
