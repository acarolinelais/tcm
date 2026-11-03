/**
 * Gera o fundo da ilustração do login como WebP, a partir dos SVGs exportados do Figma.
 *
 * Por quê: esses SVGs usam desfoques enormes e um `backdrop-filter` (o "vidro" do Figma). Como imagem de fundo do CSS
 * o navegador perde o vidro, e rasterizar os desfoques custa centenas de ms: a troca de tema travava. A imagem
 * pronta mostra o mesmo resultado, sem custo de filtro.
 *
 * Uso (na pasta frontend, com o `uv` instalado): `node scripts/rasterizar-fundo-login.cjs`
 * Refaça sempre que o Figma exportar os SVGs de novo.
 */
const { chromium } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const pasta = path.resolve(__dirname, "../src/shared/assets/figma/illustrations");
const MARGEM = 260;
// [arquivo, cor do cartão atrás do fundo]
const itens = [["background-illustration-login", "#ffffff"], ["background-illustration-login-dark", "#0f0f0f"]];

(async () => {
  const temporaria = fs.mkdtempSync(path.join(os.tmpdir(), "fundo-login-"));
  const navegador = await chromium.launch();
  for (const [arquivo, base] of itens) {
    const svg = fs.readFileSync(path.join(pasta, `${arquivo}.svg`), "utf-8");
    const contexto = await navegador.newContext({ viewport: { width: 521 + MARGEM * 2, height: 612 + MARGEM * 2 }, deviceScaleFactor: 2 });
    const pagina = await contexto.newPage();
    // Inline e com margem da cor do cartão: assim o `backdrop-filter` do SVG roda como no Figma.
    await pagina.setContent(`<html><body style="margin:0;background:${base}"><div style="padding:${MARGEM}px;width:521px;height:612px;box-sizing:content-box">${svg}</div></body></html>`);
    await pagina.waitForTimeout(600);
    await pagina.screenshot({ path: path.join(temporaria, `${arquivo}.png`), clip: { x: MARGEM, y: MARGEM, width: 521, height: 612 } });
    await contexto.close();
  }
  await navegador.close();
  // O Playwright só grava PNG e JPEG; o WebP sai do Pillow (11 KB e 8 KB, contra 350 KB e 90 KB do PNG).
  const converter = "import sys,glob,os\nfrom PIL import Image\nfor p in glob.glob(sys.argv[1]+'/*.png'):\n    Image.open(p).convert('RGB').save(os.path.join(sys.argv[2], os.path.basename(p)[:-4]+'.webp'),'WEBP',quality=92,method=6)\n";
  execFileSync("uv", ["run", "--no-project", "--with", "pillow", "python", "-c", converter, temporaria, pasta], { stdio: "inherit" });
  fs.rmSync(temporaria, { recursive: true });
  console.log("Fundos gerados em", pasta);
})();
