// A cena 3D: renderer, luzes, câmara, controlos, o modelo e as árvores. Não sabe nada de cenários nem de fases.
// Coordenadas: o modelo vem do Blender com z para cima; no glTF fica y para cima e o norte em −z.
// Um ponto do modelo (x, y, cota) é aqui (x, cota, −y).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Relido ao rodar ou redimensionar o ecrã (ver ajustar): escolhe o tamanho do mapa de sombras.
const ePequeno = () => matchMedia('(max-width: 800px)').matches;
let pequeno = ePequeno();

export let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (erro) {
  erro.semWebgl = true;                   // o app.js distingue este erro do de carregamento
  throw erro;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('palco').appendChild(renderer.domElement);

const CEU = 0xdfe9f0;
export const cena = new THREE.Scene();
cena.background = new THREE.Color(CEU);
cena.fog = new THREE.Fog(CEU, 700, 1800);

export const camara = new THREE.PerspectiveCamera(42, 1, 1, 4000);
camara.position.set(-300, 250, 330);
export const controlos = new OrbitControls(camara, renderer.domElement);
controlos.target.set(-20, 35, 0);
controlos.enableDamping = true;
controlos.maxPolarAngle = Math.PI * 0.47;
controlos.minDistance = 40;
controlos.maxDistance = 1100;

cena.add(new THREE.HemisphereLight(0xffffff, 0x8a9a7a, 1.2));
const sol = new THREE.DirectionalLight(0xfff4e0, 2.4);
sol.position.set(-260, 420, 300);
sol.target.position.set(-20, 30, 0);
sol.castShadow = true;
sol.shadow.mapSize.setScalar(pequeno ? 2048 : 4096);
Object.assign(sol.shadow.camera, { left: -420, right: 420, top: 320, bottom: -320, near: 50, far: 1300 });
sol.shadow.bias = -0.0006;
sol.shadow.normalBias = 0.6;
cena.add(sol, sol.target);

// ---- Ciclo de desenho ----
// As animações penduram-se aqui: funcao(tempo, passo) em segundos — desde o arranque e desde a imagem anterior.
// Devolve a função que a despendura. Corre antes dos controlos e do desenho.
const ouvintes = new Set();
export function aoDesenhar(funcao) {
  ouvintes.add(funcao);
  return () => ouvintes.delete(funcao);
}
let anterior = null;
const arranque = performance.now();
renderer.setAnimationLoop((agora) => {
  const tempo = (agora - arranque) / 1000;
  const passo = anterior === null ? 0 : tempo - anterior;
  anterior = tempo;
  for (const f of [...ouvintes]) f(tempo, passo);
  controlos.update();
  renderer.render(cena, camara);
});

function ajustar() {
  if (ePequeno() !== pequeno) {            // o ecrã rodou ou mudou de tamanho
    pequeno = !pequeno;
    sol.shadow.mapSize.setScalar(pequeno ? 2048 : 4096);
    sol.shadow.map?.dispose();
    sol.shadow.map = null;
  }
  const { clientWidth: l, clientHeight: a } = renderer.domElement.parentElement;
  renderer.setSize(l, a, false);
  camara.aspect = l / a;
  camara.fov = l < a ? 62 : 42;          // ecrã ao alto: abre o campo para a propriedade caber
  camara.updateProjectionMatrix();
}
addEventListener('resize', ajustar);
ajustar();

// ---- O modelo ----
// O GLTFLoader limpa as barras dos nomes; o nome original fica em userData.name.
const nomeDe = (o) => o.userData.name || o.name || '';
// A família de uma malha: o nome do primeiro antepassado (ou dela própria) com barra, «raiz/id…».
function familia(o) {
  for (let p = o; p; p = p.parent) {
    const nome = nomeDe(p);
    if (nome.includes('/')) return nome;
  }
  return '';
}

// Famílias que ficam sempre como estão, sem decisão de visibilidade.
const FIXAS = new Set(['base', 'arvore-tipo']);

// «cenario/<id>/fase<n>/<peca>», «reabilitado/<id>», «existente/<id>», «mancha/<id>»; qualquer outra raiz
// (fora «base» e «arvore-tipo») é desconhecida e a visibilidade esconde-a. null = não se decide nada.
export function classificar(nome) {
  const [raiz, id, resto, peca] = nome.split('/');
  if (!raiz || !nome.includes('/') || FIXAS.has(raiz)) return null;
  if (raiz === 'cenario') {
    const f = /^fase(\d)$/.exec(resto || '');
    return { raiz, id, fase: f ? +f[1] : null, pousada: resto === 'lotes' || /^(parque|acesso)-/.test(peca || '') };
  }
  if (raiz === 'mancha') return { raiz, id, pousada: true };
  return { raiz, id };
}

// Do modelo (preenchidos por carregarModelo):
export const pecas = [];                  // [{malha, nome, info}] — as malhas cuja visibilidade se decide
export const objetos = new Map();         // nome original («cenario/hotel/fase1/b01») → Object3D
// Das árvores, por índice de arvores.json: {malha: InstancedMesh, i, posicao: Vector3, matriz: Matrix4 original}
export const instancias = [];

function plantar(arvores, tipos) {
  const matriz = new THREE.Matrix4(), rotacao = new THREE.Quaternion(), cor = new THREE.Color();
  const cima = new THREE.Vector3(0, 1, 0);
  for (const [tipo, molde] of Object.entries(tipos)) {
    const lista = arvores.map((a, indice) => ({ a, indice })).filter(({ a }) => a.tipo === tipo);
    if (!lista.length) continue;
    const mata = new THREE.InstancedMesh(molde.geometry, molde.material, lista.length);
    mata.name = 'arvores/' + tipo;
    mata.castShadow = true;
    mata.receiveShadow = true;
    lista.forEach(({ a, indice }, i) => {
      const posicao = new THREE.Vector3(a.x, a.base, -a.y);
      rotacao.setFromAxisAngle(cima, (a.x * 12.9898 + a.y * 78.233) % (Math.PI * 2));
      matriz.compose(posicao, rotacao, new THREE.Vector3(a.raio * 2, a.altura, a.raio * 2));
      mata.setMatrixAt(i, matriz);
      instancias[indice] = { malha: mata, i, posicao, matriz: matriz.clone() };
      const variacao = 0.82 + 0.3 * Math.abs(Math.sin(a.x * 3.1 + a.y * 1.7));
      mata.setColorAt(i, cor.setScalar(variacao));
    });
    mata.instanceMatrix.needsUpdate = true;
    mata.instanceColor.needsUpdate = true;
    cena.add(mata);
  }
}

const lerJson = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(url + ': ' + r.status);
  return r.json();
});

// Carrega o modelo e as árvores, e planta-as. Devolve {arvores: quantas, tipos: [nomes]}.
export async function carregarModelo() {
  const draco = new DRACOLoader().setDecoderPath('./vendor/three/examples/jsm/libs/draco/gltf/');
  const [modelo, arvores] = await Promise.all([
    new GLTFLoader().setDRACOLoader(draco).loadAsync('./modelo/vila.glb'),
    lerJson('./dados/arvores.json'),
  ]);
  const tipos = {};
  modelo.scene.traverse((o) => {
    const original = nomeDe(o);
    if (original) objetos.set(original, o);
    if (!o.isMesh) return;
    const nome = familia(o);
    if (nome.startsWith('arvore-tipo/')) {
      tipos[nome.slice('arvore-tipo/'.length)] = o;
      o.visible = false;
      return;
    }
    const info = classificar(nome);
    const pousada = !!info?.pousada;       // parques, acessos, lotes e manchas: só recebem sombra
    o.receiveShadow = true;
    o.castShadow = !pousada && (!!info || nome === 'base/muro' || nome === 'base/ponte');
    if (info) pecas.push({ malha: o, nome, info });
  });
  cena.add(modelo.scene);
  plantar(arvores, tipos);
  return { arvores: arvores.length, tipos: Object.keys(tipos).sort() };
}
