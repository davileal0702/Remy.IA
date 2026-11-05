// Mascote original em pixel art: ratinho chef com chapéu e colher de pau.
const Remy = (() => {
  const mapa = [
    "........OOOOO",
    ".......OWWWWWO",
    "......OWWWWWWWO",
    "......OWWWWWWWO",
    ".......OWWWWWO",
    ".......OwwwwwO",
    "..OOO..OOOOOOO..OOO",
    ".OPPPO.OGGGGGO.OPPPO",
    ".OPPPOOGGGGGGGOOPPPO",
    "..OOGGGGGGGGGGGGGOO..OO",
    "...OGGGKGGGGGKGGGO..OBBO",
    "...OGGGGGGGGGGGGGO..OBBO",
    "....OGGGGPPPGGGGO...OBBO",
    ".....OGGGGGGGGGO.....OO",
    "......OOWWWWWOO......bb",
    ".....OGGWWWWWGGO.....bb",
    ".P..OGGGWWWWWGGGGGGGGGGO",
    "P...OGGGWWWWWGGGO....bb",
    "P...OGGGWWWWWGGGO....bb",
    ".PPPPOGGGGGGGGGO.....bb",
    "......OGGO.OGGO......bb",
    ".....OPPPO.OPPPO.....bb",
    ".....OOOOO.OOOOO",
  ];
  const cores = {
    O: "#3a2a2a", W: "#fffaf0", w: "#d9cfc0", G: "#8b8fa3",
    P: "#e8a0a8", K: "#1a1a1a", B: "#b5783e", b: "#8a5a2b",
  };
  const largura = Math.max(...mapa.map(l => l.length));

  function svg(tamanho = 32) {
    let corpo = "", colher = "";
    mapa.forEach((linha, y) => [...linha].forEach((c, x) => {
      if (!cores[c]) return;
      const r = `<rect x="${x}" y="${y}" width="1" height="1" fill="${cores[c]}"/>`;
      if (c === "B" || c === "b") colher += r; else corpo += r;
    }));
    return `<svg class="remy-svg" viewBox="0 0 ${largura} ${mapa.length}" width="${tamanho}" height="${tamanho}" shape-rendering="crispEdges" aria-hidden="true"><g class="colher">${colher}</g>${corpo}</svg>`;
  }

  function montar(raiz = document) {
    raiz.querySelectorAll(".remy").forEach(el => { el.innerHTML = svg(+el.dataset.size || 32); });
  }

  return { svg, montar };
})();
