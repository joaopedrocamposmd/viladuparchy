// As frases fixas da página, em português e em inglês. Não depende de nada: a língua é-lhe dada por estado.js.
// O que vem dos dados (nomes, avisos, usos…) não se escreve aqui: lê-se com deDados.
const FRASES = {
  pt: {
    'titulo-pagina': 'Vila Duparchy — modelo 3D',
    'a-carregar': 'A carregar o modelo…',
    'sem-webgl': 'Este browser não consegue mostrar o modelo 3D.',
    'sem-modelo': 'Não foi possível carregar o modelo.',
    'hoje': 'Hoje',
    'hoje-estado': 'Hoje · estado atual',
    'nao-representado': 'não representado',
    'fase': 'Fase {n}',
    'fase-nome': 'Fase {n} · {nome}',
    'subtitulo-fase': '{cenario} · fase {n}, {nome}',
    'subtitulo-recusado': '{cenario} · não representado',
    'etiqueta': 'Estudo volumétrico indicativo — sujeito a informação prévia da Câmara',
    'sem-cenarios': 'Os cenários não estão disponíveis; mostra-se só o estado atual.',
    'creditos': 'Relevo e ortofotos: Direção-Geral do Território (LiDAR 2024, ortofotos 2025)',
    'aria-cenarios': 'Cenários',
    'aria-fase': 'Fase da obra',
    'condicionantes': 'Condicionantes',
    'propriedade': 'A propriedade',
    'propriedade-curto': 'Propriedade',
    'ver-modelo': 'Ver o modelo',
    'aria-camadas': 'Condicionantes do PDM',
    'camadas-titulo': 'Condicionantes do PDM',
    'camadas-ajuda': 'Área de cada uma dentro do muro da propriedade.',
    'camada-area': '{area} dentro do muro',
    'legenda-resto': 'O resto da propriedade é Zona Turística-Termal.',
    'fechar': 'Fechar',
    'info': 'i',
    'aria-info': 'Fontes, pressupostos e o que está por confirmar',
    'lingua-botao': 'EN',
    'lingua-aria': 'Switch to English',
    'lingua-destino': 'en',
    'recusa-en': 'This scenario breaks a planning rule and is not shown.',
    'avisos': 'Avisos',
    'avisos-n': 'Avisos ({n})',
    'factos-n': 'Factos ({n})',
    'contas-titulo': 'Números da fase',
    'contas-aria': 'Números da fase escolhida',
    'c-abc': 'Área de construção',
    'c-implantacao': 'Implantação',
    'c-pisos': 'Pisos · altura máxima',
    'c-pisos-valor': '{pisos} · {altura}',
    'c-estacionamento': 'Estacionamento · lugares / necessários',
    'c-arvores': 'Árvores afetadas',
    'c-copa': 'Copa afetada',
    'c-caminhos': 'Caminhos existentes aproveitados',
    'c-lugares-falta': 'faltam lugares',
    'arvore': 'árvore',
    'arvores': 'árvores',
    'lotes-titulo': 'Por lote · obra completa',
    'l-area': 'Área do lote',
    'l-abc': 'Construção',
    'l-unidades': 'Unidades',
    'l-lugares': 'Lugares / necessários',
    'l-nao-turistico': 'Funções não turísticas (limite {limite})',
    'info-titulo': 'Fontes, pressupostos e o que falta confirmar',
    'info-fontes': 'Fontes e datas',
    'info-fonte-1': 'Relevo: levantamento LiDAR de 2024 da Direção-Geral do Território.',
    'info-fonte-2': 'Imagem: ortofotos de 2025 da Direção-Geral do Território.',
    'info-fonte-3': 'Muro, caminhos e edifícios existentes: planta à escala 1:200.',
    'info-fonte-4': 'Regras de uso do solo: regulamento do Plano Diretor Municipal da Mealhada (2017). Classificação do solo e condicionantes: extratos das plantas emitidos pela Câmara em 2022.',
    'info-fonte-5': 'Apresentação da propriedade: informação do proprietário (descrição, datas, licença, distâncias).',
    'info-fonte-6': 'Edifício central do cenário «projeto de 1998»: projeto de arquitetura de julho de 1998, lido em fotografias das folhas (plantas, alçado e corte à escala 1:100).',
    'info-pressupostos': 'Pressupostos',
    'info-regimes': 'Limites de cada regime',
    'regime-linha': '{pisos} · {altura}',
    'pisos-n': '{n} pisos',
    'pisos-1': '1 piso',
    'info-confirmar': 'Por confirmar',
    'confirmar-1': 'A alteração do PDM de 2024.',
    'confirmar-2': 'A Portaria n.º 125/2021, que pode ter alterado o perímetro de proteção da água mineral.',
    'confirmar-3': 'As faixas de gestão de combustível.',
    'confirmar-4': 'A resposta da Câmara ao pedido de informação prévia.',
    'confirmar-5': 'Se o projeto de 1998 para o edifício central chegou a ser licenciado.',
    'reproduzir': 'Reproduzir a construção por fases',
    'reproduzir-parar': 'Parar a reprodução',
    'antes-depois': 'Antes / depois',
    'antes-depois-aria': 'Antes / depois: mostrar o estado de hoje enquanto está premido',
    'voo': 'Voo guiado',
    'voo-parar': 'Parar voo',
    'voo-aria': 'Voo guiado pela propriedade',
    'voo-parar-aria': 'Parar o voo guiado',
    'voo-sul': 'Chegada pela EN234',
    'voo-palacete': 'O palacete',
    'voo-obra': 'A obra do cenário',
    'voo-norte': 'O portão norte',
    'voo-geral': 'A propriedade, com o Buçaco ao fundo',
  },
  en: {
    'titulo-pagina': 'Vila Duparchy — 3D model',
    'a-carregar': 'Loading the model…',
    'sem-webgl': 'This browser cannot show the 3D model.',
    'sem-modelo': 'The model could not be loaded.',
    'hoje': 'Today',
    'hoje-estado': 'Today · current state',
    'nao-representado': 'not shown',
    'fase': 'Phase {n}',
    'fase-nome': 'Phase {n} · {nome}',
    'subtitulo-fase': '{cenario} · phase {n}, {nome}',
    'subtitulo-recusado': '{cenario} · not shown',
    'etiqueta': 'Indicative volumetric study — subject to prior information from the Council',
    'sem-cenarios': 'The scenarios are not available; only the current state is shown.',
    'creditos': 'Terrain and orthophotos: Direção-Geral do Território (LiDAR 2024, orthophotos 2025)',
    'aria-cenarios': 'Scenarios',
    'aria-fase': 'Construction phase',
    'condicionantes': 'Constraints',
    'propriedade': 'The estate',
    'propriedade-curto': 'Estate',
    'ver-modelo': 'Explore the model',
    'aria-camadas': 'Planning constraints from the municipal plan',
    'camadas-titulo': 'Planning constraints',
    'camadas-ajuda': 'Area of each one inside the estate wall.',
    'camada-area': '{area} inside the wall',
    'legenda-resto': 'The rest of the estate is Tourism and Spa Zone.',
    'fechar': 'Close',
    'info': 'i',
    'aria-info': 'Sources, assumptions and what is still to be confirmed',
    'lingua-botao': 'PT',
    'lingua-aria': 'Mudar para português',
    'lingua-destino': 'pt',
    'recusa-en': 'This scenario breaks a planning rule and is not shown.',
    'avisos': 'Caveats',
    'avisos-n': 'Caveats ({n})',
    'factos-n': 'Facts ({n})',
    'contas-titulo': 'Phase figures',
    'contas-aria': 'Figures for the chosen phase',
    'c-abc': 'Floor area',
    'c-implantacao': 'Building footprint',
    'c-pisos': 'Storeys · maximum height',
    'c-pisos-valor': '{pisos} · {altura}',
    'c-estacionamento': 'Parking · spaces / required',
    'c-arvores': 'Trees affected',
    'c-copa': 'Canopy affected',
    'c-caminhos': 'Existing tracks used',
    'c-lugares-falta': 'spaces missing',
    'arvore': 'tree',
    'arvores': 'trees',
    'lotes-titulo': 'By plot · full build-out',
    'l-area': 'Plot area',
    'l-abc': 'Floor area',
    'l-unidades': 'Units',
    'l-lugares': 'Spaces / required',
    'l-nao-turistico': 'Non-tourism uses (limit {limite})',
    'info-titulo': 'Sources, assumptions and what is still to be confirmed',
    'info-fontes': 'Sources and dates',
    'info-fonte-1': 'Terrain: 2024 LiDAR survey by the Direção-Geral do Território.',
    'info-fonte-2': 'Imagery: 2025 orthophotos by the Direção-Geral do Território.',
    'info-fonte-3': 'Wall, tracks and existing buildings: 1:200 survey plan.',
    'info-fonte-4': 'Land-use rules: regulations of the Mealhada municipal plan (2017). Zoning and constraints: map extracts issued by the Council in 2022.',
    'info-fonte-5': 'Presentation of the estate: information from the owner (description, dates, licence, distances).',
    'info-fonte-6': 'Central building in the "1998 design" scenario: an architectural design from July 1998, read from photographs of the sheets (plans, elevation and section at 1:100).',
    'info-pressupostos': 'Assumptions',
    'info-regimes': 'Limits of each regime',
    'regime-linha': '{pisos} · {altura}',
    'pisos-n': '{n} storeys',
    'pisos-1': '1 storey',
    'info-confirmar': 'Still to be confirmed',
    'confirmar-1': 'The 2024 amendment to the municipal plan (PDM).',
    'confirmar-2': 'Ordinance 125/2021, which may have changed the mineral-water protection perimeter.',
    'confirmar-3': 'The fuel-management strips (wildfire protection).',
    'confirmar-4': "The Council's reply to the prior-information request.",
    'confirmar-5': 'Whether the 1998 design for the central building was ever licensed.',
    'reproduzir': 'Play the phased construction',
    'reproduzir-parar': 'Stop playback',
    'antes-depois': 'Before / after',
    'antes-depois-aria': 'Before / after: show today\'s state while pressed',
    'voo': 'Guided flight',
    'voo-parar': 'Stop flight',
    'voo-aria': 'Guided flight over the estate',
    'voo-parar-aria': 'Stop the guided flight',
    'voo-sul': 'Arriving along the EN234',
    'voo-palacete': 'The manor house',
    'voo-obra': "The scenario's new development",
    'voo-norte': 'The north gate',
    'voo-geral': 'The estate, with Buçaco beyond',
  },
};

// Os pressupostos em inglês: uma frase fixa, com os números de «pressupostos» nos marcadores.
// (A frase portuguesa vem dos dados, em pressupostos.fonte, e traz mais: as áreas por unidade.)
const PRESSUPOSTOS_EN = 'Rules of thumb, to be validated by an architect: {m2_por_lugar}\u00a0m² per surface parking space; {altura_por_piso_m}\u00a0m per storey; vehicle access {largura_do_acesso_m}\u00a0m wide with a maximum gradient of {declive_max_acesso}\u00a0%, measured over {corda_do_declive_m}\u00a0m chords on the existing ground; tree canopy within {folga_das_copas_m}\u00a0m of a building counts as affected.';

// Os regimes em inglês, por chave de regime (o artigo fica como está nos dados).
const REGIMES_EN = {
  turistico: 'tourism development',
  geral: 'general regime of the Tourism and Spa Zone',
  moradia: 'house (the prior-information request)',
  bungalow: 'bungalow (limit of the proposal)',
};

let lingua = 'pt';
export const LINGUAS = Object.keys(FRASES);
// Chamada por estado.js quando a língua muda; é ele a fonte de verdade.
export function definirLingua(nova) { if (FRASES[nova]) lingua = nova; }

// A frase fixa na língua do estado. {x} no texto é substituído por valores.x. Chave que falta → a própria chave.
export function t(chave, valores = {}) {
  const frase = FRASES[lingua][chave] ?? FRASES.pt[chave] ?? chave;
  return frase.replace(/\{(\w+)\}/g, (_, k) => (k in valores ? valores[k] : ''));
}

// objeto[campo + '_en'] em inglês quando existe, senão objeto[campo].
export function deDados(objeto, campo) {
  if (!objeto) return undefined;
  if (lingua === 'en') {
    const en = objeto[campo + '_en'];
    if (en !== undefined && en !== null && en !== '') return en;
  }
  return objeto[campo];
}

// O nome da fase n: os dados trazem «fases» e «fases_en» lado a lado.
export function nomeDaFase(dados, n) {
  return (lingua === 'en' && dados?.fases_en?.[n]) || dados?.fases?.[n] || '';
}

// A língua do estado, para o resto da página (o botão e o atributo lang).
export const linguaAtual = () => lingua;

// O par {pt, en} dos factos: a língua do estado, ou o português se faltar.
export function daLingua(par) { return par?.[lingua] || par?.pt || ''; }

// ---- Números ----
// Português: «6 708 m²», «15,5 %»; inglês: «6,708 m²», «15.5 %». O espaço é duro (U+00A0) para o número e a unidade não se separarem.
const DURO = '\u00a0';
export function num(n, casas = 0) {
  const fixo = Math.abs(n).toFixed(casas);
  const [inteira, decimal] = fixo.split('.');
  const agrupada = inteira.replace(/\B(?=(\d{3})+(?!\d))/g, lingua === 'en' ? ',' : DURO);
  const sinal = n < 0 && +fixo !== 0 ? '−' : '';
  return sinal + agrupada + (decimal ? (lingua === 'en' ? '.' : ',') + decimal : '');
}
export const m2 = (n) => num(n) + DURO + 'm²';
export const metros = (n, casas = 0) => num(n, casas) + DURO + 'm';
// Uma casa decimal, e sem «,0» quando é inteiro: «4 %», «1,5 %».
export function percentagem(n) {
  const um = Math.round(n * 10) / 10;
  return num(um, Number.isInteger(um) ? 0 : 1) + DURO + '%';
}

// ---- Dados com língua ----
// O nome de uma unidade («quarto», «moradia»…) no singular ou no plural certo; a chave é a portuguesa, de dados.unidades.
export function nomeDaUnidade(dados, chave, n) {
  const u = dados?.unidades?.[chave];
  if (!u) return chave;
  const sufixo = Math.round(n) === 1 ? '' : '_plural';
  const base = lingua === 'en' ? 'en' : 'pt';
  return u[base + sufixo] ?? u[base] ?? chave;
}

// «91 quartos» / «1 moradia» / «86 residences».
export const unidades = (dados, chave, n) => `${num(Math.round(n))} ${nomeDaUnidade(dados, chave, n)}`;

// Os pressupostos: em português o texto dos dados; em inglês a frase fixa com os números de «pressupostos».
export function pressupostos(p) {
  if (!p) return '';
  if (lingua === 'en') return PRESSUPOSTOS_EN.replace(/\{(\w+)\}/g, (_, k) => (k in p ? num(p[k], Number.isInteger(p[k]) ? 0 : 1) : ''));
  return p.fonte ? p.fonte.charAt(0).toUpperCase() + p.fonte.slice(1) + '.' : '';
}

// O nome de um regime: em inglês o da tabela acima; em português o dos dados. Sem tradução → o dos dados.
export const nomeDoRegime = (chave, regime) => (lingua === 'en' && REGIMES_EN[chave]) || regime.nome;
