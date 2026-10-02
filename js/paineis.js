// Os painéis da página: os contadores da fase, as camadas do PDM, o «i» e a apresentação da propriedade. Redesenham-se quando o estado muda.
// Nada de contas aqui: os números vêm de contas.fases / contas.lotes dos dados, já calculados.
import { estado, obterDados, cenarioAtual, mudar, escolher } from './estado.js';
import { t, deDados, daLingua, nomeDaFase, num, m2, metros, percentagem, unidades, pressupostos, nomeDoRegime, nomeDaUnidade } from './textos.js';

const $ = (id) => document.getElementById(id);
const LIMITE_NAO_TURISTICO = 40;          // % da parcela na Zona Turística-Termal (o limite de que falam os factos)
const ecraPequeno = () => matchMedia('(max-width: 800px)').matches;

function el(etiqueta, atributos = {}, ...filhos) {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) { if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v); }
  e.append(...filhos.filter((f) => f !== null && f !== undefined && f !== false));
  return e;
}
const primeiraMaiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- Contadores
const contadores = $('contadores'), botaoContadores = $('contadores-botao'), corpoContadores = $('contadores-corpo');
let contadoresAbertos = true;             // o telemóvel arranca recolhido (montarPaineis)
let ultimasContas = null, ultimoTitulo = '';

// Valores intermédios entre duas fases (k de 0 a 1), com a forma de contas.fases[n]: serve à animação para os contadores
// subirem de uma fase para a outra. Os números das unidades de uma chave que só existe de um lado partem de zero.
export function interpolarContas(a, b, k) {
  const mix = (x = 0, y = 0) => x + (y - x) * k;
  const unidadesMistas = {};
  for (const chave of new Set([...Object.keys(a?.unidades || {}), ...Object.keys(b?.unidades || {})])) {
    const valor = mix(a?.unidades?.[chave], b?.unidades?.[chave]);
    if (valor >= 0.5) unidadesMistas[chave] = valor;
  }
  const r = { ...b, unidades: unidadesMistas };
  for (const campo of ['implantacao_m2', 'abc_m2', 'pisos_max', 'altura_max_m', 'lugares', 'lugares_necessarios', 'acessos_existentes_m', 'copa_m2', 'arvores']) {
    r[campo] = mix(a?.[campo], b?.[campo]);
  }
  return r;
}

// O resumo de uma linha («5 352 m² · 86 residências · 51 árvores»), para quando o painel está recolhido.
function resumo(dados, c) {
  const partes = [];
  if (Math.round(c.abc_m2) > 0) partes.push(m2(c.abc_m2));
  for (const [chave, n] of Object.entries(c.unidades || {})) if (Math.round(n) > 0) partes.push(unidades(dados, chave, n));
  const arvores = Math.round(c.arvores);
  if (arvores > 0) partes.push(`${num(arvores)} ${t(arvores === 1 ? 'arvore' : 'arvores')}`);
  return partes.join(' · ');
}

function linhaDeContas(rotulo, valor, alerta = false, aviso = '') {
  return el('div', { class: alerta ? 'linha alerta' : 'linha' }, el('dt', {}, rotulo), el('dd', {}, valor, aviso ? el('small', {}, ' ' + aviso) : null));
}

// Mostra os números de uma fase — ou de qualquer valor intermédio com a mesma forma (ver interpolarContas).
// titulo: o que se lê quando está aberto (por omissão, o nome da fase escolhida).
export function mostrarContadores(c, titulo) {
  const dados = obterDados();
  const cenario = cenarioAtual();
  const ativo = dados && cenario && !cenario.recusa && c;
  contadores.hidden = !ativo;
  if (!ativo) { ultimasContas = null; return; }
  ultimasContas = c;
  ultimoTitulo = titulo ?? t('fase-nome', { n: estado.fase, nome: nomeDaFase(dados, estado.fase) });
  botaoContadores.replaceChildren(el('span', { class: 'contadores-texto' }, contadoresAbertos ? ultimoTitulo : (resumo(dados, c) || ultimoTitulo)));
  botaoContadores.setAttribute('aria-expanded', String(contadoresAbertos));
  corpoContadores.hidden = !contadoresAbertos;

  const linhas = [
    linhaDeContas(t('c-abc'), m2(c.abc_m2)),
    linhaDeContas(t('c-implantacao'), m2(c.implantacao_m2)),
  ];
  for (const [chave, n] of Object.entries(c.unidades || {})) {
    linhas.push(linhaDeContas(primeiraMaiuscula(nomeDaUnidade(dados, chave, n)), num(Math.round(n))));
  }
  const pisos = Math.round(c.pisos_max);
  linhas.push(linhaDeContas(t('c-pisos'), pisos > 0 ? t('c-pisos-valor', { pisos: num(pisos), altura: metros(c.altura_max_m, Number.isInteger(c.altura_max_m) ? 0 : 1) }) : '—'));
  const faltam = Math.round(c.lugares) < Math.round(c.lugares_necessarios);
  linhas.push(linhaDeContas(t('c-estacionamento'), `${num(Math.round(c.lugares))} / ${num(Math.round(c.lugares_necessarios))}`, faltam, faltam ? t('c-lugares-falta') : ''));
  linhas.push(linhaDeContas(t('c-arvores'), num(Math.round(c.arvores))));
  linhas.push(linhaDeContas(t('c-copa'), m2(c.copa_m2)));
  if (c.acessos_existentes_m > 0) linhas.push(linhaDeContas(t('c-caminhos'), metros(c.acessos_existentes_m)));
  const partes = [el('dl', { class: 'contas' }, ...linhas)];
  const lotes = cenario.contas?.lotes || [];
  if (lotes.length > 1) partes.push(quadroDeLotes(dados, lotes));
  corpoContadores.replaceChildren(...partes);
}

// Um quadro por lote (só quando há mais de um): os números são os da obra completa.
function quadroDeLotes(dados, lotes) {
  const linha = (rotulo, celula, classe = '') => el('tr', { class: classe }, el('th', { scope: 'row' }, rotulo), ...lotes.map((l) => celula(l)));
  const celulaTexto = (f) => (l) => el('td', {}, f(l));
  const naoTuristico = (l) => (l.ztt_m2 > 0 ? (l.nao_turistico_m2 / l.ztt_m2) * 100 : 0);
  const falta = (l) => l.lugares < l.lugares_necessarios;
  return el('div', { class: 'lotes' },
    el('h3', {}, t('lotes-titulo')),
    el('table', {},
      el('thead', {}, el('tr', {}, el('td'), ...lotes.map((l) => el('th', { scope: 'col' }, deDados(l, 'nome'))))),
      el('tbody', {},
        linha(t('l-area'), celulaTexto((l) => m2(l.area_m2))),
        linha(t('l-abc'), celulaTexto((l) => m2(l.abc_m2))),
        linha(t('l-unidades'), celulaTexto((l) => Object.entries(l.unidades || {}).map(([k, n]) => unidades(dados, k, n)).join(', ') || '—')),
        el('tr', {}, el('th', { scope: 'row' }, t('l-lugares')), ...lotes.map((l) => el('td', { class: falta(l) ? 'alerta' : '' }, `${num(l.lugares)} / ${num(l.lugares_necessarios)}`))),
        el('tr', {}, el('th', { scope: 'row' }, t('l-nao-turistico', { limite: percentagem(LIMITE_NAO_TURISTICO) })),
          ...lotes.map((l) => el('td', { class: naoTuristico(l) > LIMITE_NAO_TURISTICO ? 'alerta' : '' }, percentagem(naoTuristico(l))))))));
}

// ---------------------------------------------------------------- Camadas do PDM
const painelCamadas = $('camadas'), listaCamadas = $('camadas-lista'), abrirCamadas = $('abrir-camadas');
let linguaDasCamadas = null;

function desenharCamadas() {
  const dados = obterDados();
  if (!dados?.manchas?.length) return;
  // As linhas refazem-se só quando a língua muda: assim a caixa que o teclado tem em foco não se perde.
  if (linguaDasCamadas !== estado.lingua) {
    linguaDasCamadas = estado.lingua;
    listaCamadas.replaceChildren(...dados.manchas.map((m) => {
      const caixa = el('input', { type: 'checkbox', value: m.id });
      caixa.addEventListener('change', () => {
        const ligadas = new Set(estado.camadas);
        if (caixa.checked) ligadas.add(m.id); else ligadas.delete(m.id);
        mudar({ camadas: ligadas });
      });
      const amostra = el('i', { 'aria-hidden': 'true' });
      amostra.style.background = m.cor;
      return el('li', {}, el('label', { class: 'camada' }, caixa, amostra,
        el('span', { class: 'camada-texto' }, el('b', {}, deDados(m, 'nome')),
          el('span', { class: 'camada-area' }, t('camada-area', { area: m2(m.area_m2) })),
          el('span', { class: 'camada-nota' }, deDados(m, 'nota')))));
    }));
  }
  for (const caixa of listaCamadas.querySelectorAll('input')) caixa.checked = estado.camadas.has(caixa.value);
}

// ---------------------------------------------------------------- O «i»
const painelInfo = $('info'), corpoInfo = $('info-corpo'), abrirInfo = $('abrir-info');

function desenharInfo() {
  const dados = obterDados();
  if (!dados) return;
  const secao = (titulo, ...filhos) => el('section', {}, el('h3', {}, titulo), ...filhos);
  const pisosTexto = (n) => (n === 1 ? t('pisos-1') : t('pisos-n', { n: num(n) }));
  const partes = [
    secao(t('info-fontes'), el('ul', {}, ...(dados.apresentacao ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]).map((n) => el('li', {}, t('info-fonte-' + n))))),
  ];
  const pressupostosTexto = el('p', {}, pressupostos(dados.pressupostos));
  const original = estado.lingua === 'en' && dados.pressupostos?.fonte
    ? el('p', { class: 'original' }, el('span', { lang: 'pt' }, primeiraMaiuscula(dados.pressupostos.fonte) + '.')) : null;
  partes.push(secao(t('info-pressupostos'), pressupostosTexto, original));
  partes.push(secao(t('info-regimes'), el('ul', {}, ...Object.entries(dados.regimes || {}).map(([chave, r]) =>
    el('li', {}, el('b', {}, primeiraMaiuscula(nomeDoRegime(chave, r))), ' — ',
      t('regime-linha', { pisos: pisosTexto(r.pisos), altura: metros(r.altura_m, Number.isInteger(r.altura_m) ? 0 : 1) }), ' · ',
      // O artigo fica como está nos dados (em português), também na página em inglês.
      el('span', { lang: 'pt', class: 'artigo' }, r.artigo))))));
  partes.push(secao(t('info-confirmar'), el('ul', {}, ...[1, 2, 3, 4].map((n) => el('li', {}, t('confirmar-' + n))))));
  corpoInfo.replaceChildren(...partes);
}

// ---------------------------------------------------------------- A apresentação da propriedade
const painelApresentacao = $('apresentacao'), corpoApresentacao = $('apresentacao-corpo'), tituloApresentacao = $('apresentacao-titulo'), abrirApresentacao = $('abrir-apresentacao');
const CHAVE_FECHADA = 'vila-apresentacao-fechada';       // sessionStorage: fechada nesta sessão, não volta a abrir sozinha
let linguaDaApresentacao = null;

// Os números em português levam espaço para os milhares: colam-se (espaço duro) ao número seguinte, a «%» e à unidade, para não quebrarem a meio.
const DURO = ' ';
const colar = (texto) => texto.replace(/(\d) (?=\d|%|m²|ha\b)/g, '$1' + DURO);
const daApresentacao = (par) => colar(daLingua(par));

// Uma linha por cenário não recusado, com a construção nova e as unidades da fase 4; cada uma escolhe o cenário na fase 4.
function tabelaDeCenarios(dados) {
  const linhas = dados.cenarios.filter((c) => !c.recusa && c.contas?.fases?.[3]).map((c) => {
    const f = c.contas.fases[3];
    const botao = el('button', { type: 'button', class: 'apr-linha' },
      el('span', { class: 'apr-nome' }, deDados(c, 'nome')),
      el('span', { class: 'apr-abc' }, m2(f.abc_m2)),
      el('span', { class: 'apr-unidades' }, Object.entries(f.unidades || {}).filter(([, n]) => Math.round(n) > 0).map(([k, n]) => unidades(dados, k, n)).join(' · ')));
    botao.addEventListener('click', () => { fecharPaineis(); escolher(c.id, 4); });
    return el('li', {}, botao);
  });
  return el('ul', { class: 'apr-cenarios', 'aria-label': t('aria-cenarios') }, ...linhas);
}

function desenharApresentacao() {
  const dados = obterDados();
  const a = dados?.apresentacao;
  abrirApresentacao.hidden = !a;
  if (!a || linguaDaApresentacao === estado.lingua) return;
  linguaDaApresentacao = estado.lingua;
  tituloApresentacao.textContent = daLingua(a.titulo);
  const partes = [el('p', { class: 'apr-lema' }, daApresentacao(a.lema))];
  partes.push(el('ul', { class: 'apr-numeros' }, ...a.numeros.map((n) =>
    el('li', {}, el('b', {}, daApresentacao(n.valor)), el('span', {}, daApresentacao(n.legenda))))));
  for (const sec of a.seccoes) {
    partes.push(el('section', {}, el('h3', {}, daApresentacao(sec.titulo)),
      ...sec.paragrafos.map((p) => el('p', {}, daApresentacao(p))),
      sec.lista ? el('ul', {}, ...sec.lista.map((i) => el('li', {}, daApresentacao(i)))) : null,
      sec.cenarios ? tabelaDeCenarios(dados) : null,
      sec.remate ? el('p', {}, daApresentacao(sec.remate)) : null));
  }
  const ver = el('button', { type: 'button', class: 'apr-ver' }, t('ver-modelo'));
  ver.addEventListener('click', fecharPaineis);
  partes.push(el('p', { class: 'apr-fonte' }, daApresentacao(a.fonte)), ver);
  corpoApresentacao.replaceChildren(...partes);
}

let aoAbrirApresentacao = null;
// A página regista aqui o que pára quando a apresentação abre (as animações), para este módulo não depender delas.
export function registarAoAbrirApresentacao(funcao) { aoAbrirApresentacao = funcao; }

// Ao chegar sem cenário no endereço, e se ainda não foi fechada nesta sessão, a apresentação abre sozinha. Sem armazenamento, abre sempre.
export function abrirAoChegar() {
  if (!obterDados()?.apresentacao || estado.cenario) return;
  let fechada = false;
  try { fechada = sessionStorage.getItem(CHAVE_FECHADA) === '1'; } catch { /* sem armazenamento: abre sempre */ }
  if (!fechada) abrir('apresentacao');
}

// ---------------------------------------------------------------- Abrir e fechar
const cortina = $('cortina');
let aberto = null, quemAbriu = null;      // 'camadas' | 'info' | 'apresentacao' | null; o botão a que devolver o foco
const painelDe = { camadas: painelCamadas, info: painelInfo, apresentacao: painelApresentacao };
const botaoDe = { camadas: abrirCamadas, info: abrirInfo, apresentacao: abrirApresentacao };
// No telemóvel os painéis ocupam o ecrã; o «i» e a apresentação também têm cortina por trás em ecrãs largos. Nestes casos o foco fica lá dentro.
const preso = () => aberto === 'info' || aberto === 'apresentacao' || (aberto === 'camadas' && ecraPequeno());

export function fecharPaineis() {
  if (!aberto) return;
  painelDe[aberto].hidden = true;
  botaoDe[aberto].setAttribute('aria-expanded', 'false');
  cortina.hidden = true;
  if (aberto === 'apresentacao') { try { sessionStorage.setItem(CHAVE_FECHADA, '1'); } catch { /* sem armazenamento: volta a abrir ao chegar */ } }
  const volta = quemAbriu;
  aberto = null; quemAbriu = null;
  if (volta && document.contains(volta)) volta.focus();
}

function abrir(nome) {
  if (aberto === nome) { fecharPaineis(); return; }
  const volta = document.activeElement;
  fecharPaineis();
  aberto = nome;
  quemAbriu = volta === document.body ? botaoDe[nome] : volta;
  painelDe[nome].hidden = false;
  botaoDe[nome].setAttribute('aria-expanded', 'true');
  cortina.hidden = nome === 'camadas';
  painelDe[nome].querySelector('.fechar').focus();
  if (nome === 'apresentacao') aoAbrirApresentacao?.();
}

const focaveis = (raiz) => [...raiz.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled && e.offsetParent !== null);

function teclado(ev) {
  if (ev.key === 'Escape') {
    if (aberto) { fecharPaineis(); ev.preventDefault(); }
    else if (contadoresAbertos && !contadores.hidden && contadores.contains(document.activeElement)) {
      alternarContadores(false); botaoContadores.focus(); ev.preventDefault();
    }
    return;
  }
  if (ev.key !== 'Tab' || !aberto || !preso()) return;
  const lista = focaveis(painelDe[aberto]);
  if (!lista.length) return;
  const primeiro = lista[0], ultimo = lista[lista.length - 1];
  if (!painelDe[aberto].contains(document.activeElement)) { primeiro.focus(); ev.preventDefault(); }
  else if (ev.shiftKey && document.activeElement === primeiro) { ultimo.focus(); ev.preventDefault(); }
  else if (!ev.shiftKey && document.activeElement === ultimo) { primeiro.focus(); ev.preventDefault(); }
}

function alternarContadores(abertos) {
  contadoresAbertos = abertos;
  if (ultimasContas) mostrarContadores(ultimasContas, ultimoTitulo);
}

// ---------------------------------------------------------------- Ligação ao estado
// O que o estado pede aos painéis: os contadores com os números da fase escolhida, as camadas e o «i» na língua certa.
export function desenharPaineis() {
  const dados = obterDados();
  const cenario = cenarioAtual();
  const fase = cenario?.contas?.fases?.[estado.fase - 1];
  mostrarContadores(fase && !cenario.recusa ? fase : null);
  desenharCamadas();
  desenharInfo();
  desenharApresentacao();
  abrirCamadas.hidden = !dados?.manchas?.length;
  abrirInfo.hidden = !dados;
  abrirInfo.textContent = t('info');
}

export function montarPaineis() {
  contadoresAbertos = !ecraPequeno();
  botaoContadores.addEventListener('click', () => alternarContadores(!contadoresAbertos));
  abrirCamadas.addEventListener('click', () => abrir('camadas'));
  abrirInfo.addEventListener('click', () => abrir('info'));
  abrirApresentacao.addEventListener('click', () => abrir('apresentacao'));
  document.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fecharPaineis));
  cortina.addEventListener('click', fecharPaineis);
  document.addEventListener('keydown', teclado);
}
