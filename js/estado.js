// O estado da página — {cenario, fase, lingua, camadas} — e o que ele decide no modelo: o que se vê e que árvores saem.
// O endereço (#cenario=hotel&fase=3&lingua=en) guarda-o e repõe-no.
import * as THREE from 'three';
import { pecas, instancias } from './cena.js';
import { definirLingua, LINGUAS } from './textos.js';

// cenario: id ou null («Hoje»); fase: 1 a 4 (4 quando não há cenário); lingua: 'pt' | 'en'; camadas: Set de ids de manchas ligadas.
// Só se muda por mudar()/escolher(): o objeto é relido, nunca guardado por quem o importa.
export const estado = { cenario: null, fase: 4, lingua: 'pt', camadas: new Set() };

let dados = null;                         // dados/cenarios.json, ou null se não carregou
export const obterDados = () => dados;
export const cenarioAtual = () => (estado.cenario ? dados?.cenarios.find((c) => c.id === estado.cenario) ?? null : null);

export function carregarDados() {
  return fetch('./dados/cenarios.json')
    .then((r) => { if (!r.ok) throw new Error('cenarios.json: ' + r.status); return r.json(); })
    .catch((erro) => { console.warn(erro); return null; })
    .then((d) => { dados = d; return d; });
}

// ---- O que se vê ----
const ESCALA_ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const escondidas = new Set();             // índices de arvores.json com escala zero

// As animações (animacoes.js) mexem por cima disto, sem mexer no estado:
// - «antes / depois»: com verHoje(true) a vista é a do «Hoje» (nenhuma peça do cenário, ruínas como ruínas, todas as árvores)
//   mas o estado — e o endereço, e os contadores — ficam como estão; descricao() diz o que se vê.
// - a construção por fases: sobrepor(funcao) regista o que se volta a impor depois de cada aplicarVisibilidade.
let vendoHoje = false;
let sobreposicao = null;
export function verHoje(sim) { vendoHoje = !!sim; }
export function sobrepor(funcao) { sobreposicao = funcao || null; }
const cenarioVisto = () => (vendoHoje ? null : cenarioAtual());

// forcar: repõe a matriz de todas as árvores que contam (e não só as que mudaram) — para depois de uma animação
// ter mexido nas matrizes por fora, sem o estado saber.
function aplicarArvores(forcar = false) {
  const querEscondidas = new Set();
  const abate = cenarioVisto()?.abate || {};
  for (let f = 1; f <= estado.fase; f++) for (const i of abate[f] || []) querEscondidas.add(i);
  const tocadas = new Set();
  for (const i of new Set([...escondidas, ...querEscondidas])) {
    const inst = instancias[i];
    if (!inst) continue;
    const esconder = querEscondidas.has(i);
    if (!forcar && esconder === escondidas.has(i)) continue;
    inst.malha.setMatrixAt(inst.i, esconder ? ESCALA_ZERO : inst.matriz);
    tocadas.add(inst.malha);
  }
  tocadas.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  escondidas.clear();
  querEscondidas.forEach((i) => escondidas.add(i));
}

// Mostra e esconde as peças do modelo pelo contrato de nomes. Devolve os nomes das famílias visíveis, por raiz.
// Raiz desconhecida → escondida. «mancha/<id>» → visível só se o id está em estado.camadas.
export function aplicarVisibilidade() {
  const cenario = cenarioVisto();
  const { fase, camadas } = estado;
  const reabilitados = new Set();
  for (const r of cenario?.reabilita || []) if (r.fase <= fase) r.edificios.forEach((e) => reabilitados.add(e));
  // o que o cenário tira de cena para pôr outra coisa no lugar (um projeto para uma ruína): sai o existente e não entra o reabilitado
  const substituidos = new Set();
  for (const r of cenario?.substitui || []) if (r.fase <= fase) r.edificios.forEach((e) => substituidos.add(e));
  const nomes = { cenario: new Set(), reabilitado: new Set(), existente: new Set(), mancha: new Set() };
  for (const p of pecas) {
    const c = p.info;
    let ver = false;
    if (c.raiz === 'cenario') ver = !!cenario && c.id === cenario.id && !cenario.recusa && (c.fase === null || c.fase <= fase);
    else if (c.raiz === 'reabilitado') ver = reabilitados.has(c.id) && !substituidos.has(c.id);
    else if (c.raiz === 'existente') ver = !reabilitados.has(c.id) && !substituidos.has(c.id);
    else if (c.raiz === 'mancha') ver = camadas.has(c.id);
    p.malha.visible = ver;
    if (ver) nomes[c.raiz].add(p.nome);
  }
  aplicarArvores();
  sobreposicao?.();
  return nomes;
}
export { aplicarArvores };
export const reporArvores = () => aplicarArvores(true);

// O estado e o que ele mostra, em números — para verificar a página pela consola.
export function descricao() {
  const n = aplicarVisibilidade();
  return {
    cenario: estado.cenario, fase: estado.fase, lingua: estado.lingua, camadas: [...estado.camadas].sort(),
    visiveis: { cenario: n.cenario.size, reabilitado: n.reabilitado.size, existente: n.existente.size, mancha: n.mancha.size },
    arvoresEscondidas: escondidas.size,
  };
}

// ---- Subscritores ----
const subscritores = new Set();
// funcao(estado) corre depois de cada mudança do estado. Devolve a função que cancela.
export function subscrever(funcao) {
  subscritores.add(funcao);
  return () => subscritores.delete(funcao);
}

// ---- Endereço ----
function escreverEndereco() {
  const p = new URLSearchParams();
  if (estado.cenario) { p.set('cenario', estado.cenario); p.set('fase', String(estado.fase)); }
  if (estado.lingua !== 'pt') p.set('lingua', estado.lingua);
  const resto = p.toString();
  try { history.replaceState(null, '', location.pathname + location.search + (resto ? '#' + resto : '')); }
  catch { /* sem história (ficheiro aberto de outra forma): o endereço fica como está */ }
}

// O que o endereço pede, só com valores válidos; o resto ignora-se em silêncio.
function lerEndereco() {
  const p = new URLSearchParams(location.hash.slice(1));
  const pedido = {};
  const lingua = p.get('lingua');
  if (LINGUAS.includes(lingua)) pedido.lingua = lingua;
  const cenario = p.get('cenario');
  if (cenario && dados?.cenarios.some((c) => c.id === cenario)) {
    pedido.cenario = cenario;
    const fase = p.get('fase');
    if (/^[1-4]$/.test(fase)) pedido.fase = +fase;
  }
  return pedido;
}

// ---- Mudar ----
// Aceita qualquer parte de {cenario, fase, lingua, camadas}; o inválido ignora-se.
// cenario: id, ou null para «Hoje» (e então fase volta a 4 se não vier). Um cenário que muda sem fase fica na fase 4.
export function mudar(parcial = {}) {
  const antes = JSON.stringify([estado.cenario, estado.fase, estado.lingua, [...estado.camadas].sort()]);
  if ('cenario' in parcial) {
    const id = parcial.cenario;
    if (id === null || id === undefined) { estado.cenario = null; estado.fase = 4; }
    else if (dados?.cenarios.some((c) => c.id === id)) {
      if (id !== estado.cenario && !('fase' in parcial)) estado.fase = 4;
      estado.cenario = id;
    }
  }
  if ('fase' in parcial) {
    const f = Math.round(+parcial.fase);
    if (f >= 1 && f <= 4) estado.fase = f;
  }
  if (LINGUAS.includes(parcial.lingua)) { estado.lingua = parcial.lingua; definirLingua(parcial.lingua); }
  if (parcial.camadas) estado.camadas = new Set([...parcial.camadas].filter((c) => typeof c === 'string'));
  const depois = JSON.stringify([estado.cenario, estado.fase, estado.lingua, [...estado.camadas].sort()]);
  aplicarVisibilidade();
  if (antes !== depois) { escreverEndereco(); subscritores.forEach((f) => f(estado)); }
  return descricao();
}

// escolher(id | null, fase = 4): o cenário e a fase de uma vez. Id que não existe → nada muda.
export function escolher(cenario, fase = 4) {
  if (cenario && !dados?.cenarios.some((c) => c.id === cenario)) return descricao();
  return mudar({ cenario: cenario || null, fase });
}

// Arranque: lê o endereço, aplica-o, avisa os subscritores (mesmo que nada tenha mudado) e passa a ouvir o endereço.
export function iniciar() {
  mudar(lerEndereco());
  escreverEndereco();
  subscritores.forEach((f) => f(estado));
  addEventListener('hashchange', () => {
    const p = lerEndereco();
    mudar({ cenario: p.cenario ?? null, fase: p.fase ?? 4, lingua: p.lingua ?? 'pt' });
  });
  return descricao();
}
