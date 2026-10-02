// A interface: barra de cenários, cursor de fases, avisos e factos (num bloco que se recolhe), recusa, legenda, botão da língua e subtítulo. Redesenha-se quando o estado muda.
// Os painéis (contadores, camadas, «i») vivem em paineis.js.
import { estado, obterDados, cenarioAtual, escolher, mudar, subscrever } from './estado.js';
import { t, deDados, daLingua, nomeDaFase } from './textos.js';
import { desenharPaineis, montarPaineis } from './paineis.js';

const $ = (id) => document.getElementById(id);
const subtitulo = $('subtitulo'), barra = $('cenarios'), cursor = $('fases'), cursorFase = $('fase'), nomeFase = $('nome-fase');
const avisos = $('avisos'), botaoAvisos = $('avisos-botao'), corpoAvisos = $('avisos-corpo'), avisoTexto = $('aviso-texto'), listaFactos = $('factos-lista');
const recusa = $('recusa'), legenda = $('legenda'), botaoLingua = $('lingua');
const ecraPequeno = () => matchMedia('(max-width: 800px)').matches;
// O bloco dos avisos nasce aberto no computador e recolhido no telemóvel; a escolha do utilizador vale nesta sessão (sessionStorage).
const CHAVE_AVISOS = 'vila-avisos-abertos';
let escolhaAvisos = null;                 // true | false | null (ainda não escolheu)
try { const v = sessionStorage.getItem(CHAVE_AVISOS); if (v === '1' || v === '0') escolhaAvisos = v === '1'; } catch { /* sem armazenamento: vale o que nasce */ }
const avisosAbertos = () => escolhaAvisos ?? !ecraPequeno();
const botoes = [];                        // [{id, botao}], na ordem da barra

// O que se lê no HTML fixo: data-t="chave" é o texto, data-t-aria="chave" é o nome acessível.
function traduzirFixos() {
  document.documentElement.lang = estado.lingua === 'en' ? 'en' : 'pt-PT';
  document.title = t('titulo-pagina');
  document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = t(e.dataset.t); });
  document.querySelectorAll('[data-t-aria]').forEach((e) => e.setAttribute('aria-label', t(e.dataset.tAria)));
}

function desenhar() {
  const dados = obterDados();
  const cenario = cenarioAtual();
  traduzirFixos();
  for (const { id, botao } of botoes) {
    botao.setAttribute('aria-pressed', String(id === estado.cenario));
    botao.textContent = id ? deDados(dados.cenarios.find((c) => c.id === id), 'nome') : t('hoje');
  }
  const ativo = cenario && !cenario.recusa;
  const fase = estado.fase;
  cursor.hidden = !ativo;
  cursorFase.value = fase;
  nomeFase.textContent = dados ? t('fase-nome', { n: fase, nome: nomeDaFase(dados, fase) }) : '';
  subtitulo.textContent = cenario
    ? (ativo
      ? t('subtitulo-fase', { cenario: deDados(cenario, 'nome'), n: fase, nome: nomeDaFase(dados, fase).toLowerCase() })
      : t('subtitulo-recusado', { cenario: deDados(cenario, 'nome') }))
    : t('hoje-estado');
  desenharRecusa(cenario);
  desenharAvisos();
  desenharLingua();
  desenharPaineis();
  legenda.replaceChildren();
  if (ativo) for (const u of cenario.usos || []) {
    const uso = dados.usos[u];
    if (!uso) continue;
    const item = document.createElement('span');
    const cor = document.createElement('i');
    cor.style.background = uso.cor;
    item.append(cor, deDados(uso, 'nome'));
    legenda.append(item);
  }
  // Com alguma camada ligada, a legenda diz de que é o resto da propriedade (a Zona Turística-Termal não se pinta).
  if (estado.camadas.size) legenda.append(Object.assign(document.createElement('span'), { textContent: t('legenda-resto') }));
  legenda.hidden = !legenda.childElementCount;
}

// Em português, a frase dos dados; em inglês, a frase fixa e, por baixo, a original (em português, marcada como tal).
function desenharRecusa(cenario) {
  recusa.hidden = !(cenario && cenario.recusa);
  if (recusa.hidden) { recusa.replaceChildren(); return; }
  if (estado.lingua !== 'en') { recusa.textContent = cenario.recusa; return; }
  const original = document.createElement('span');
  original.lang = 'pt';
  original.className = 'original';
  original.textContent = cenario.recusa;
  recusa.replaceChildren(t('recusa-en'), document.createElement('br'), original);
}

// O aviso do cenário e os seus factos, num só bloco. Aberto: «Avisos», o aviso e a lista toda. Recolhido: «Avisos (1) · Factos (5)».
// A recusa não entra aqui: fica sempre à vista (desenharRecusa); um cenário recusado não tem factos.
function desenharAvisos() {
  const cenario = cenarioAtual();
  const aviso = deDados(cenario, 'aviso') || '';
  const lista = cenario && !cenario.recusa ? cenario.factos || [] : [];
  avisos.hidden = !cenario || !(aviso || lista.length);
  const aberto = avisosAbertos();
  avisoTexto.textContent = aviso;
  avisoTexto.hidden = !aviso;
  listaFactos.replaceChildren(...lista.map((f) => Object.assign(document.createElement('li'), { textContent: daLingua(f) })));
  listaFactos.hidden = !lista.length;
  const resumo = [aviso ? t('avisos-n', { n: 1 }) : '', lista.length ? t('factos-n', { n: lista.length }) : ''].filter(Boolean).join(' · ');
  botaoAvisos.textContent = aberto ? t('avisos') : resumo;
  botaoAvisos.setAttribute('aria-expanded', String(aberto));
  corpoAvisos.hidden = !aberto;
}

function alternarAvisos(abrir) {
  escolhaAvisos = abrir;
  try { sessionStorage.setItem(CHAVE_AVISOS, abrir ? '1' : '0'); } catch { /* sem armazenamento: vale só até recarregar */ }
  desenharAvisos();
}

// «EN» na página em português e «PT» na inglesa; o nome acessível fica na língua de destino.
function desenharLingua() {
  botaoLingua.hidden = false;
  botaoLingua.textContent = t('lingua-botao');
  botaoLingua.setAttribute('aria-label', t('lingua-aria'));
  botaoLingua.lang = t('lingua-destino');
}

function montarBarra(dados) {
  const botao = (id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.addEventListener('click', () => { escolher(id, 4); b.scrollIntoView({ inline: 'nearest', block: 'nearest' }); });
    barra.append(b);
    botoes.push({ id, botao: b });
  };
  botao(null);
  for (const c of dados.cenarios) botao(c.id);
  $('barra').hidden = false;
}

// Liga a interface ao estado. Sem dados (cenarios.json em falta) só se mostra o estado atual e a nota.
export function montar() {
  const dados = obterDados();
  botaoAvisos.addEventListener('click', () => alternarAvisos(!avisosAbertos()));
  botaoLingua.addEventListener('click', () => mudar({ lingua: estado.lingua === 'en' ? 'pt' : 'en' }));
  montarPaineis();
  // Escape recolhe o bloco, se nenhum painel (nem os contadores) o apanhou primeiro: por isso fica registado depois dos painéis.
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !ev.defaultPrevented && !avisos.hidden && avisosAbertos()) { alternarAvisos(false); ev.preventDefault(); } });
  cursorFase.addEventListener('input', () => escolher(estado.cenario, cursorFase.value));
  addEventListener('resize', desenharAvisos);
  if (dados) montarBarra(dados);
  else $('nota').hidden = false;
  subscrever(desenhar);
}
