export function pontoEmPoligono([x, y], poly) {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersecta = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersecta) dentro = !dentro;
  }
  return dentro;
}

export function bboxPoligono(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function centroidePoligono(poly) {
  let sx = 0, sy = 0;
  for (const [x, y] of poly) { sx += x; sy += y; }
  return [sx / poly.length, sy / poly.length];
}

export function pontoInteriorAleatorio(poly) {
  const { minX, minY, maxX, maxY } = bboxPoligono(poly);
  for (let i = 0; i < 40; i++) {
    const p = [minX + Math.random() * (maxX - minX), minY + Math.random() * (maxY - minY)];
    if (pontoEmPoligono(p, poly)) return [Math.round(p[0]), Math.round(p[1])];
  }
  const c = centroidePoligono(poly);
  return [Math.round(c[0]), Math.round(c[1])];
}

export function pontoCruzamento(polyA, polyB) {
  // ponto "entre" os dois cômodos: ponto médio do par de vértices mais próximos.
  let melhor = null, dist = Infinity;
  for (const a of polyA) {
    for (const b of polyB) {
      const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
      if (d < dist) { dist = d; melhor = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    }
  }
  if (melhor) return [Math.round(melhor[0]), Math.round(melhor[1])];
  const ca = centroidePoligono(polyA), cb = centroidePoligono(polyB);
  return [Math.round((ca[0] + cb[0]) / 2), Math.round((ca[1] + cb[1]) / 2)];
}
