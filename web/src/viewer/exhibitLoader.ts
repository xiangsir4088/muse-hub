import * as THREE from 'three';
import type { Exhibit } from '@museum/shared';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createArtifact } from './procedural';

export function decideModelSource(exhibit: Exhibit, availableModels: Set<string>): 'glb' | 'procedural' | 'error' {
  if (availableModels.has(exhibit.model)) return 'glb';
  if (exhibit.procedural) return 'procedural';
  return 'error';
}

export interface UnitFit { scale: number; offsetY: number }

/**
 * 归一化参数：把模型缩放到总高 1 单位，并让底面落在 y = 0。
 *
 * 之所以返回"参数"而不是直接改模型，是因为调用方随后要用
 * `group.position.set(...)` 把展品摆到展柜上——直接改 root 的
 * position 会被这次赋值整个覆盖掉（历史 bug：真实 glb 会陷进展柜）。
 * 正确做法是让包装 group 承担 placement 位姿，偏移只作用在子节点上。
 */
export function unitHeightFit(minY: number, maxY: number): UnitFit {
  const h = Math.max(maxY - minY, 0.01);
  return { scale: 1 / h, offsetY: minY === 0 ? 0 : -minY / h };
}

const gltfLoader = new GLTFLoader();

function pedestal(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.45, 0.05, 24),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  ).translateY(0.025));
  return g;
}

/**
 * 把 glb 场景包成两层 group：
 * - 内层 `fit` 承担归一化（缩放 + 抬升），偏移不会被外部赋值覆盖；
 * - 外层 `placement` 交给调用方 `.position.set(...)` / 设置四元数。
 * 之所以要两层，是因为调用方要用 `position.set()` 把展品摆到展柜上，
 * 任何挂在同一向量上的偏移都会被这次赋值整个抹掉。
 */
export function wrapFitted(root: THREE.Object3D): THREE.Group {
  const box = new THREE.Box3().setFromObject(root);
  const fit = unitHeightFit(box.min.y, box.max.y);
  const fitGroup = new THREE.Group();
  fitGroup.name = 'fit';
  fitGroup.scale.setScalar(fit.scale);
  fitGroup.position.y = fit.offsetY;
  fitGroup.add(root);
  const placement = new THREE.Group();
  placement.name = 'placement';
  placement.add(fitGroup);
  return placement;
}

/**
 * 占位物本体。
 * - `loadError`：该展品声明了 glb 但没拿到，当前用占位（程序化或空底座）代替
 * - `noContent`：既没有 glb 也没有程序化占位，只剩空底座 —— 需要错误角标
 */
export function createPlaceholder(exhibit: Exhibit): THREE.Group {
  const g = exhibit.procedural ? createArtifact(exhibit.procedural) : pedestal();
  if (exhibit.model) g.userData.loadError = true;
  if (!exhibit.procedural) g.userData.noContent = true;
  return g;
}

/**
 * 加载展品模型。
 * `availableModels` 由 `GET /api/models` 提供（content 相对路径集合）：
 * 传了就完全跳过不存在的 glb 请求，不传则退回"先试再降级"的老行为。
 */
export async function loadExhibitModel(
  exhibit: Exhibit,
  availableModels?: Set<string>
): Promise<THREE.Group> {
  const source = availableModels ? decideModelSource(exhibit, availableModels) : 'glb';
  if (source === 'glb') {
    try {
      const gltf = await gltfLoader.loadAsync(`/content/${exhibit.model}`);
      return wrapFitted(gltf.scene);
    } catch { /* 落到占位分支 */ }
  }
  return createPlaceholder(exhibit);
}
