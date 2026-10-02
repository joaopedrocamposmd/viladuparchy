// Só arranca: carrega, liga os módulos e deixa à vista o que serve para verificar a página.
import { t } from './js/textos.js';

const mensagem = document.getElementById('estado');
const dizer = (frase) => { mensagem.textContent = frase; mensagem.hidden = false; };

try {
  // Importados aqui, e não no cimo, para que a falta de WebGL (a cena rebenta ao arrancar) se apanhe e se diga.
  const cena = await import('./js/cena.js');
  const estado = await import('./js/estado.js');
  const { montar } = await import('./js/interface.js');
  const animacoes = await import('./js/animacoes.js');
  const paineis = await import('./js/paineis.js');
  const [modelo] = await Promise.all([cena.carregarModelo(), estado.carregarDados()]);
  mensagem.hidden = true;
  window.__modelo = modelo;
  montar();
  const reproducao = animacoes.montar();
  estado.iniciar();
  paineis.registarAoAbrirApresentacao(reproducao.parar);
  paineis.abrirAoChegar();            // só depois de o modelo estar carregado: não tapa a mensagem «A carregar…»
  // Para verificar a página pela consola: escolher(idDoCenario | null, fase) e estado(); animacoes.reproduzir() / voo() / parar() / emCurso().
  window.__vista = { camara: cena.camara, controlos: cena.controlos, escolher: estado.escolher, estado: estado.descricao, animacoes: reproducao };
} catch (erro) {
  console.error(erro);
  dizer(t(erro.semWebgl ? 'sem-webgl' : 'sem-modelo'));
}
