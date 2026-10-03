// As três animações da página: a construção por fases, o antes / depois e o voo guiado.
// Uma de cada vez: começar uma pára a outra. Nenhuma mexe no estado da página, salvo a construção por fases, que
// percorre as fases (mudar({fase})) e, ao parar, deixa o estado exatamente como uma escolha direta dessa fase.
// Coordenadas: as paragens do voo escrevem-se em coordenadas do modelo (x, y, cota); na cena three.js um ponto
// do modelo (x, y, cota) é (x, cota, −y). O sul do modelo (y menor) é, na cena, o lado de z maior.
import * as THREE from 'three';
import { camara, controlos, aoDesenhar, objetos, pecas, instancias, renderer } from './cena.js';
import { estado, cenarioAtual, aplicarVisibilidade, reporArvores, sobrepor, verHoje, mudar, subscrever } from './estado.js';
import { desenharPaineis, mostrarContadores, interpolarContas } from './paineis.js';
import { t } from './textos.js';

// ---- As paragens do voo guiado ----
// «de» é onde está a câmara e «para» o que ela vê, em coordenadas do modelo (x, y, cota). A paragem da obra do cenário
// não está aqui: calcula-se do `foco` do cenário (câmara a 2,2 × o raio, a 35° de altura, do lado sul). A vista inicial
// é a que a câmara tinha quando a página arrancou.
export const PARAGENS = {
  // Chegada pela EN234: da berma sul da estrada, um pouco a poente, a olhar para o portão sul — os pilares e o muro
  // ameado à frente, a estrada a fugir para nascente e as copas do parque por trás.
  sul: { frase: 'voo-sul', de: [-28, -98, 46], para: [-2, -57.5, 36.5] },
  // O palacete, de sudoeste e de cima: a fachada, o pátio de entrada e a piscina, com a ponte ferroviária ao fundo.
  palacete: { frase: 'voo-palacete', de: [28, -40, 92], para: [67, 4, 55] },
  // O portão norte, visto de fora, da via que passa a norte: os dois pilares e o muro ao centro, o arvoredo da propriedade por trás.
  norte: { frase: 'voo-norte', de: [-92, 120, 36], para: [-67.5, 92, 20] },
  // Vista geral alta, de noroeste a olhar para sudeste: a propriedade ao centro, a EN234 em baixo e a encosta do Buçaco a subir ao fundo.
  geral: { frase: 'voo-geral', de: [-250, 260, 260], para: [0, -40, 20] },
};
const TRANSICAO = 4;                     // segundos de uma paragem à seguinte
const PARADO = 3;                        // segundos parado em cada paragem
const ALTURA_DA_OBRA = 35;               // graus acima do horizonte
const DISTANCIA_DA_OBRA = 2.2;           // × o raio do foco
const FOLGA_DO_TERRENO = 8;              // metros mínimos entre a câmara e o terreno

// ---- Tempos da construção por fases (segundos) ----
const ANTES_DA_PRIMEIRA = 0.8;           // o «Hoje» à vista antes de a fase 1 começar
const MARCA = 1.0;                       // árvores assinaladas antes de encolherem
const ENCOLHE = 0.6;
const CRESCE = 1.5;                      // volumes a crescer; ruínas a trocar; contadores a subir
const PAUSA = 1.0;                       // entre fases
const FASE_VAZIA = 0.3;                  // uma fase sem nada de novo passa depressa
const COR_QUENTE = [1.0, 0.16, 0.03];     // a cor final das árvores assinaladas (linear)
const PASSO_MAXIMO = 0.1;                // um separador esquecido não salta a animação

const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const doModelo = ([x, y, cota]) => new THREE.Vector3(x, cota, -y);
const limitar = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const suave = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);   // acelera e desacelera
const saida = (x) => 1 - Math.pow(1 - x, 3);                                         // chega devagar
const progresso = (u, inicio, duracao) => (duracao <= 0 ? (u >= inicio ? 1 : 0) : limitar((u - inicio) / duracao));

const $ = (id) => document.getElementById(id);
const botaoReproduzir = $('reproduzir'), botaoAntes = $('antes-depois'), botaoVoo = $('voo'), legendaVoo = $('voo-legenda');

let ativa = null;                        // 'fases' | 'antes' | 'voo' | null
let aMudar = false;                      // true enquanto a própria animação muda o estado
const emCurso = () => ativa;

function pararTudo() { pararFases(); pararAntes(); pararVoo(); }
const cenarioAtivo = () => { const c = cenarioAtual(); return c && !c.recusa ? c : null; };

// ======================================================================= Construção por fases
// Cada volume (as malhas que partilham o nome «cenario/<id>/fase<n>/<peça>») cresce do chão: a escala vertical vai de 0
// a 1 e a posição compensa-se para a base (o ponto mais baixo da caixa envolvente do conjunto) ficar parada. A escolha
// foi esta, e não um plano de corte, porque corta menos geometria às sombras e não pede materiais próprios. As peças
// pousadas (parques, acessos, lotes) e as ruínas aparecem e trocam por opacidade, com uma cópia do material em cada malha
// (os materiais são partilhados entre peças) que se larga e repõe o original quando a opacidade chega a 1 ou a animação pára.
let F = null;                            // a reprodução em curso, ou null
let desligarFases = null;                // função que a despendura do ciclo de desenho
const mat = new THREE.Matrix4();
const caixa = new THREE.Box3();
const multiplicadores = new Map();       // InstancedMesh → multiplicador da cor que dá COR_QUENTE

// Um grupo de malhas que se anima junto.
function grupo(malhas, fase) {
  caixa.makeEmpty();
  for (const m of malhas) caixa.expandByObject(m);
  const orig = new Map(malhas.map((m) => [m, { sy: m.scale.y, py: m.position.y, material: m.material, clones: null }]));
  return { malhas, fase, base: caixa.min.y, orig, k: null };
}

// A parte do grupo que se vê por k (0 a 1).
function porEscala(g, k) {
  for (const m of g.malhas) {
    const o = g.orig.get(m);
    if (k >= 1) { m.scale.y = o.sy; m.position.y = o.py; continue; }
    const kk = Math.max(k, 0.001);       // zero daria uma matriz singular
    m.scale.y = o.sy * kk;
    m.position.y = g.base + (o.py - g.base) * kk;
  }
}
function porOpacidade(g, k) {
  for (const m of g.malhas) {
    const o = g.orig.get(m);
    if (k >= 1) { reporMaterial(m, o); continue; }
    if (!o.clones) {
      const lista = Array.isArray(o.material) ? o.material : [o.material];
      o.clones = lista.map((x) => { const c = x.clone(); c.transparent = true; c.depthWrite = false; c.userData.opacidade = x.opacity; return c; });
      m.material = Array.isArray(o.material) ? o.clones : o.clones[0];
    }
    for (const c of o.clones) c.opacity = c.userData.opacidade * k;
  }
}
function reporMaterial(m, o) {
  if (!o.clones) return;
  m.material = o.material;
  o.clones.forEach((c) => c.dispose());
  o.clones = null;
}
function reporGrupo(g) {
  for (const m of g.malhas) {
    const o = g.orig.get(m);
    m.scale.y = o.sy;
    m.position.y = o.py;
    reporMaterial(m, o);
  }
}
function aplicarGrupo(g, k, modo) {
  if (g.k === k) return;
  g.k = k;
  for (const m of g.malhas) m.visible = k > 0;
  if (k <= 0) return;
  if (modo === 'escala') porEscala(g, k); else porOpacidade(g, k);
}

// Escala uniforme de uma árvore em torno do seu pé (a origem da geometria): as colunas da matriz × s.
function matrizEscalada(inst, s) {
  mat.copy(inst.matriz);
  const e = mat.elements;
  for (const j of [0, 1, 2, 4, 5, 6, 8, 9, 10]) e[j] *= s;
  return mat;
}
// O que multiplicar à cor de cada vértice (que vem do modelo) para a árvore ficar COR_QUENTE.
function multiplicadorQuente(malha) {
  let m = multiplicadores.get(malha);
  if (m) return m;
  const cor = malha.geometry.attributes.color;
  const soma = [0, 0, 0];
  if (cor) for (let i = 0; i < cor.count; i++) { soma[0] += cor.getX(i); soma[1] += cor.getY(i); soma[2] += cor.getZ(i); }
  const n = Math.max(cor?.count || 1, 1);
  const [r, g, b] = soma.map((x, i) => Math.min(COR_QUENTE[i] / Math.max(x / n, 0.02), 12));
  m = new THREE.Color(r, g, b);
  multiplicadores.set(malha, m);
  return m;
}

// O que há para animar neste cenário, e o que cada fase traz.
function preparar(cenario) {
  const meus = pecas.filter((p) => p.info.raiz === 'cenario' && p.info.id === cenario.id);
  const porNome = new Map();
  for (const p of meus) {
    if (!porNome.has(p.nome)) porNome.set(p.nome, { fase: p.info.fase ?? 1, pousada: !!p.info.pousada, malhas: [] });
    porNome.get(p.nome).malhas.push(p.malha);
  }
  const volumes = [...porNome.values()].map((v) => ({ ...grupo(v.malhas, v.fase), pousada: v.pousada }));
  const ruinas = [];                     // {novo, velho, fase}: o reabilitado entra, o existente sai
  for (const r of cenario.reabilita || []) {
    const doEdificio = (raiz) => pecas.filter((p) => p.info.raiz === raiz && r.edificios.includes(p.info.id)).map((p) => p.malha);
    const novo = doEdificio('reabilitado'), velho = doEdificio('existente');
    ruinas.push({ fase: r.fase, novo: novo.length ? grupo(novo, r.fase) : null, velho: velho.length ? grupo(velho, r.fase) : null });
  }
  for (const r of cenario.substitui || []) {  // o que sai de cena sem versão reabilitada: só o existente, a desaparecer
    const velho = pecas.filter((p) => p.info.raiz === 'existente' && r.edificios.includes(p.info.id)).map((p) => p.malha);
    if (velho.length) ruinas.push({ fase: r.fase, novo: null, velho: grupo(velho, r.fase) });
  }
  const arvores = [];                    // {fase, inst, cache}
  for (const [fase, lista] of Object.entries(cenario.abate || {})) {
    for (const i of lista) if (instancias[i]) arvores.push({ fase: +fase, inst: instancias[i], chave: null, corOriginal: null });
  }
  return { volumes, ruinas, arvores };
}

// A duração de cada parte da fase n.
function plano(n) {
  const arvores = F.arvores.some((a) => a.fase === n);
  const obra = F.volumes.some((v) => v.fase === n) || F.ruinas.some((r) => r.fase === n);
  if (F.reduzido) return { marca: 0, encolhe: 0, cresce: 0, total: arvores || obra ? PAUSA : FASE_VAZIA };
  const marca = arvores ? MARCA : 0, encolhe = arvores ? ENCOLHE : 0, cresce = obra ? CRESCE : 0;
  const fim = Math.max(marca + encolhe, marca + cresce);
  return { marca, encolhe, cresce, total: fim > 0 ? fim + PAUSA : FASE_VAZIA, obra, arvores };
}

// Põe a cena como está no instante (n, u) da reprodução — u em segundos desde o princípio da fase n (negativo: antes da 1.ª).
function quadro() {
  if (!F) return;
  const { n, u, p } = F;
  const kObra = saida(progresso(u, p.marca, p.cresce));
  // Antes da fase 1 (o «Hoje» à vista) as peças que vão aparecer ou trocar por opacidade ficam já com a cópia do material,
  // quase invisíveis, para o browser compilar os shaders agora e não a meio da primeira troca.
  const aquecer = u < 0;
  for (const v of F.volumes) {
    const k = v.fase < n ? 1 : v.fase > n ? 0 : kObra;
    if (v.pousada && aquecer) aplicarGrupo(v, 0.001, 'opacidade');
    else aplicarGrupo(v, k, v.pousada ? 'opacidade' : 'escala');
  }
  for (const r of F.ruinas) {
    const k = r.fase < n ? 1 : r.fase > n ? 0 : kObra;
    if (r.novo) aplicarGrupo(r.novo, aquecer ? 0.001 : k, 'opacidade');
    if (r.velho) aplicarGrupo(r.velho, aquecer ? 0.999 : 1 - k, 'opacidade');
  }
  const tocadas = new Set();
  const quente = (a) => {
    const { malha, i } = a.inst;
    if (!a.corOriginal) { a.corOriginal = new THREE.Color(); malha.getColorAt(i, a.corOriginal); }
    malha.setColorAt(i, a.assinalada ? multiplicadorQuente(malha) : a.corOriginal);
    malha.instanceColor.needsUpdate = true;
  };
  for (const a of F.arvores) {
    let escala = 1, assinalada = false;
    if (a.fase < n) escala = 0;
    else if (a.fase === n && u >= 0) {
      assinalada = true;
      escala = u < p.marca ? 1 : 1 - suave(progresso(u, p.marca, p.encolhe));
    }
    const chave = escala.toFixed(3) + assinalada;
    if (a.chave === chave) continue;
    if (a.assinalada !== assinalada) { a.assinalada = assinalada; quente(a); }
    a.chave = chave;
    a.inst.malha.setMatrixAt(a.inst.i, matrizEscalada(a.inst, escala));
    tocadas.add(a.inst.malha);
  }
  tocadas.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  // Contadores: sobem do valor da fase anterior ao da nova (no ritmo do que a fase tem de mais lento); só se redesenham de vez em quando.
  const kc = suave(progresso(u, p.marca, p.obra ? p.cresce : p.encolhe));
  const chaveC = n + ':' + Math.round(kc * 50);
  if (chaveC !== F.chaveC) {
    F.chaveC = chaveC;
    const fases = cenarioAtual()?.contas?.fases;
    if (fases?.[n - 1]) mostrarContadores(interpolarContas(n > 1 ? fases[n - 2] : null, fases[n - 1], kc));
  }
}

// Entra na fase n: o estado passa a ser o dela (o cursor e o subtítulo acompanham) e o que é seu volta a esconder-se.
function entrarNaFase(n) {
  F.n = n;
  F.p = plano(n);
  F.chaveC = null;
  aMudar = true;
  try { mudar({ fase: n }); } finally { aMudar = false; }
  F.chaveC = null;
  for (const g of [...F.volumes, ...F.ruinas.flatMap((r) => [r.novo, r.velho]).filter(Boolean)]) g.k = null;
  for (const a of F.arvores) a.chave = null;
}

function ciclo(tempo, passo) {
  if (!F) return;
  F.u += Math.min(passo, PASSO_MAXIMO);
  while (F && F.u >= F.p.total) {
    if (F.n >= 4) { pararFases(); return; }
    F.u -= F.p.total;
    entrarNaFase(F.n + 1);
  }
  quadro();
}

function reproduzir() {
  const cenario = cenarioAtivo();
  if (!cenario) return false;
  pararTudo();
  const dados = preparar(cenario);
  F = { cenario: cenario.id, ...dados, n: 1, u: -ANTES_DA_PRIMEIRA, p: null, chaveC: null, reduzido: reduzido() };
  for (const a of F.arvores) a.assinalada = false;
  ativa = 'fases';
  sobrepor(() => { for (const g of F.volumes) g.k = null; for (const r of F.ruinas) { if (r.novo) r.novo.k = null; if (r.velho) r.velho.k = null; } for (const a of F.arvores) a.chave = null; quadro(); });
  F.p = plano(1);
  aMudar = true;
  try { mudar({ fase: 1 }); } finally { aMudar = false; }
  desligarFases = aoDesenhar(ciclo);
  renderer.domElement.addEventListener('pointerdown', pararFases, true);
  quadro();
  atualizarBotoes();
  return true;
}

// Pára a reprodução e deixa tudo como numa escolha direta da fase em que ia: nenhuma escala a meio, nenhuma árvore
// meio encolhida ou assinalada, os materiais originais, os contadores do estado.
function pararFases() {
  if (!F) return;
  const antigo = F;
  F = null;
  ativa = null;
  desligarFases?.();
  desligarFases = null;
  renderer.domElement.removeEventListener('pointerdown', pararFases, true);
  sobrepor(null);
  for (const v of antigo.volumes) reporGrupo(v);
  for (const r of antigo.ruinas) { if (r.novo) reporGrupo(r.novo); if (r.velho) reporGrupo(r.velho); }
  const tocadas = new Set();
  for (const a of antigo.arvores) {
    const { malha, i } = a.inst;
    malha.setMatrixAt(i, a.inst.matriz);
    if (a.corOriginal) { malha.setColorAt(i, a.corOriginal); malha.instanceColor.needsUpdate = true; }
    tocadas.add(malha);
  }
  tocadas.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  reporArvores();
  aplicarVisibilidade();
  desenharPaineis();
  atualizarBotoes();
}

// ======================================================================= Antes / depois
// Enquanto está premido, a vista é a do «Hoje» — sem tocar na câmara nem no estado. Pelo teclado alterna.
let antes = null;                        // {cenario, fase} do estado em que começou, ou null
function comecarAntes() {
  if (antes || !cenarioAtivo()) return;
  pararTudo();
  antes = { cenario: estado.cenario, fase: estado.fase };
  ativa = 'antes';
  verHoje(true);
  aplicarVisibilidade();
  atualizarBotoes();
}
function pararAntes() {
  if (!antes) return;
  antes = null;
  if (ativa === 'antes') ativa = null;
  verHoje(false);
  aplicarVisibilidade();
  atualizarBotoes();
}

// ======================================================================= Voo guiado
let V = null;                            // o voo em curso, ou null
let desligarVoo = null;
let inicio = null;                       // a vista com que a página arrancou: {pos, alvo}
let terreno = null;                      // grelha das cotas máximas do terreno, para a câmara não o atravessar

// A grelha vem dos vértices do terreno e da envolvente: uma passagem, a primeira vez que se voa.
function construirTerreno() {
  const celula = 4;
  const malhas = [];
  for (const nome of ['base/terreno', 'base/envolvente']) objetos.get(nome)?.traverse((o) => { if (o.isMesh) malhas.push(o); });
  const limites = new THREE.Box3();
  for (const m of malhas) limites.expandByObject(m);
  const colunas = Math.ceil((limites.max.x - limites.min.x) / celula) + 1, linhas = Math.ceil((limites.max.z - limites.min.z) / celula) + 1;
  const cotas = new Float32Array(colunas * linhas).fill(-Infinity);
  const v = new THREE.Vector3();
  for (const m of malhas) {
    m.updateWorldMatrix(true, false);
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      const c = Math.floor((v.x - limites.min.x) / celula), l = Math.floor((v.z - limites.min.z) / celula);
      const k = l * colunas + c;
      if (v.y > cotas[k]) cotas[k] = v.y;
    }
  }
  terreno = { cotas, colunas, linhas, celula, minX: limites.min.x, minZ: limites.min.z };
}
// A cota máxima do terreno à volta de (x, z), contando a vizinhança (≈ 4 m).
export function cotaDoTerreno(x, z) {
  if (!terreno) construirTerreno();
  const c = Math.floor((x - terreno.minX) / terreno.celula), l = Math.floor((z - terreno.minZ) / terreno.celula);
  let m = -Infinity;
  for (let dl = -1; dl <= 1; dl++) for (let dc = -1; dc <= 1; dc++) {
    const cc = c + dc, ll = l + dl;
    if (cc >= 0 && cc < terreno.colunas && ll >= 0 && ll < terreno.linhas) m = Math.max(m, terreno.cotas[ll * terreno.colunas + cc]);
  }
  return m;
}

// Mantém a câmara onde os controlos a deixam estar, para quem pegar nela depois não ver um salto: acima do terreno,
// dentro do ângulo polar máximo e das distâncias mínima e máxima.
function corrigir(pos, alvo) {
  const chao = cotaDoTerreno(pos.x, pos.z);
  if (pos.y < chao + FOLGA_DO_TERRENO) pos.y = chao + FOLGA_DO_TERRENO;
  const desvio = pos.clone().sub(alvo);
  const horizontal = Math.hypot(desvio.x, desvio.z);
  const minimo = horizontal / Math.tan(controlos.maxPolarAngle - 0.01);   // altura mínima acima do alvo para o ângulo polar caber
  if (desvio.y < minimo) desvio.y = minimo;
  const d = desvio.length();
  if (d < controlos.minDistance) desvio.multiplyScalar(controlos.minDistance / d);
  if (d > controlos.maxDistance) desvio.multiplyScalar(controlos.maxDistance / d);
  pos.copy(alvo).add(desvio);
}

// A paragem pela chave: {pos, alvo, frase}, ou null se não há (a da obra só existe com um cenário com foco).
function paragem(chave) {
  if (chave === 'inicio') return { pos: inicio.pos.clone(), alvo: inicio.alvo.clone(), frase: null };
  if (chave === 'obra') {
    const foco = cenarioAtivo()?.foco;
    if (!foco) return null;
    const centro = doModelo(foco.centro), d = DISTANCIA_DA_OBRA * foco.raio, a = THREE.MathUtils.degToRad(ALTURA_DA_OBRA);
    return { pos: centro.clone().add(new THREE.Vector3(0, d * Math.sin(a), d * Math.cos(a))), alvo: centro, frase: 'voo-obra' };
  }
  const p = PARAGENS[chave];
  return p ? { pos: doModelo(p.de), alvo: doModelo(p.para), frase: p.frase } : null;
}

function dizer(frase) {
  legendaVoo.hidden = !frase;
  legendaVoo.textContent = frase ? t(frase) : '';
  legendaVoo.dataset.frase = frase || '';
}

// Começa a próxima etapa (uma transição); false se já não há paragens.
function seguinte() {
  while (V.i < V.ordem.length) {
    const p = paragem(V.ordem[V.i++]);
    if (!p) continue;
    V.destino = p;
    V.de = { pos: camara.position.clone(), alvo: controlos.target.clone() };
    V.fase = 'ir';
    V.t = 0;
    V.duracao = reduzido() ? 0 : TRANSICAO;
    dizer(null);
    return true;
  }
  return false;
}

function cicloVoo(tempo, passo) {
  if (!V) return;
  V.t += Math.min(passo, PASSO_MAXIMO);
  for (;;) {
    if (V.fase === 'ir') {
      if (V.t < V.duracao) {
        const s = suave(V.t / V.duracao);
        const pos = V.de.pos.clone().lerp(V.destino.pos, s);
        pos.y += Math.sin(Math.PI * s) * Math.min(60, 0.06 * V.de.pos.distanceTo(V.destino.pos));   // um arco leve, para passar por cima do terreno
        const alvo = V.de.alvo.clone().lerp(V.destino.alvo, s);
        corrigir(pos, alvo);
        camara.position.copy(pos);
        controlos.target.copy(alvo);
        return;
      }
      V.t -= V.duracao;
      const pos = V.destino.pos.clone(), alvo = V.destino.alvo.clone();
      corrigir(pos, alvo);
      camara.position.copy(pos);
      controlos.target.copy(alvo);
      if (!V.destino.frase) { pararVoo(); return; }     // voltou à vista inicial
      V.fase = 'ficar';
      dizer(V.destino.frase);
    }
    if (V.t < PARADO) return;
    V.t -= PARADO;
    if (!seguinte()) { pararVoo(); return; }
  }
}

// Qualquer toque, roda ou tecla devolve o controlo (menos o botão do voo, que alterna, e as repetições de uma tecla premida).
function interromperVoo(e) {
  if (e.type === 'keydown' && e.repeat) return;
  if (e.type === 'pointerdown' && botaoVoo.contains(e.target)) return;
  pararVoo();
}
const EVENTOS_DO_VOO = [['pointerdown', true], ['wheel', true], ['keydown', true]];

function voo() {
  pararTudo();
  inicio ||= { pos: camara.position.clone(), alvo: controlos.target.clone() };
  V = { ordem: ['sul', 'palacete', 'obra', 'norte', 'geral', 'inicio'], i: 0, destino: null, de: null, fase: 'ir', t: 0, duracao: 0 };
  ativa = 'voo';
  seguinte();
  desligarVoo = aoDesenhar(cicloVoo);
  for (const [nome, captura] of EVENTOS_DO_VOO) addEventListener(nome, interromperVoo, { capture: captura, passive: true });
  atualizarBotoes();
  return true;
}

// Pára o voo e devolve o controlo onde a câmara está. O alvo dos controlos é o que a câmara vê, por isso o primeiro
// arrasto não dá salto.
function pararVoo() {
  if (!V) return;
  V = null;
  if (ativa === 'voo') ativa = null;
  desligarVoo?.();
  desligarVoo = null;
  for (const [nome, captura] of EVENTOS_DO_VOO) removeEventListener(nome, interromperVoo, { capture: captura });
  dizer(null);
  atualizarBotoes();
}

// ======================================================================= Botões
function atualizarBotoes() {
  const ativo = !!cenarioAtivo();
  const tocando = ativa === 'fases';
  botaoReproduzir.hidden = !ativo;
  botaoReproduzir.setAttribute('aria-pressed', String(tocando));
  botaoReproduzir.setAttribute('aria-label', t(tocando ? 'reproduzir-parar' : 'reproduzir'));
  botaoReproduzir.title = t(tocando ? 'reproduzir-parar' : 'reproduzir');
  botaoAntes.hidden = !ativo;
  botaoAntes.textContent = t('antes-depois');
  botaoAntes.setAttribute('aria-label', t('antes-depois-aria'));
  botaoAntes.setAttribute('aria-pressed', String(!!antes));
  const voando = ativa === 'voo';
  botaoVoo.hidden = false;
  botaoVoo.textContent = t(voando ? 'voo-parar' : 'voo');
  botaoVoo.setAttribute('aria-label', t(voando ? 'voo-parar-aria' : 'voo-aria'));
  botaoVoo.setAttribute('aria-pressed', String(voando));
  if (V && legendaVoo.dataset.frase) legendaVoo.textContent = t(legendaVoo.dataset.frase);
}

export function montar() {
  inicio = { pos: camara.position.clone(), alvo: controlos.target.clone() };
  botaoReproduzir.addEventListener('click', () => (ativa === 'fases' ? pararFases() : reproduzir()));
  // Antes / depois: o rato e o dedo seguram-no premido; o teclado (um clique sem ponteiro, detail 0) alterna.
  botaoAntes.addEventListener('pointerdown', (e) => { if (e.button === 0 || e.pointerType !== 'mouse') comecarAntes(); });
  for (const nome of ['pointerup', 'pointercancel', 'pointerleave']) botaoAntes.addEventListener(nome, pararAntes);
  botaoAntes.addEventListener('contextmenu', (e) => e.preventDefault());
  botaoAntes.addEventListener('click', (e) => { if (e.detail === 0) (antes ? pararAntes() : comecarAntes()); });
  botaoVoo.addEventListener('click', () => (ativa === 'voo' ? pararVoo() : voo()));
  subscrever(() => {
    if (!aMudar) {
      if (ativa === 'fases') pararFases();
      if (antes && (antes.cenario !== estado.cenario || antes.fase !== estado.fase || !cenarioAtivo())) pararAntes();
    }
    atualizarBotoes();
  });
  atualizarBotoes();
  return { reproduzir, parar: pararTudo, voo, emCurso };
}
