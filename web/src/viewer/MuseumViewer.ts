import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Exhibit, HallLayout, Hotspot, Placement, TourRoute } from '@museum/shared';
import { buildHallGeometry, collidersFromGeometry, type BoxDef } from './hallGeometry';
import { computeDisplacement, damp, type XZ } from './movement';
import { resolveSlide } from './collision';
import { TIER_SETTINGS, type Tier } from './quality';
import { loadExhibitModel } from './exhibitLoader';
import {
  muralDefs, panelDefs, plateTransform, spotDefs, wallArtDefs,
  PLATE_SIZE, PLATE_TILT,
  type PanelKind, type PanelDef, type WallArtDef
} from './decor';
import {
  makeCarpetTexture, makeErrorBadgeTexture, makeFloorTexture, makeHotspotTexture,
  makeMuralTexture, makePanelTexture, makePlateTexture, makeWallArtTexture,
  makeWallTexture, makeWoodTexture
} from './painter';
import { PANEL_SPECS } from '../i18n';
import {
  OrbitState, ViewpointName, clampOrbit, orbitFromCamera, orbitLerp,
  orbitPosition, viewpoint
} from './inspectCamera';
import { createTourState, sampleSegment, tourAdvance, yawTowards, type TourState } from './tourPath';

export interface ViewerOptions {
  canvas: HTMLCanvasElement;
  layout: HallLayout;
  placements: Placement[];
  /** 已加载的文物元数据，避免每件展品再打一次 /content/exhibits 请求 */
  exhibits?: Map<string, Exhibit>;
  /** 来自 GET /api/models 的可用模型集合；传入后不再请求不存在的 glb */
  availableModels?: Set<string>;
  onExhibitClick: (placementId: string | null) => void;
  onFps: (fps: number) => void;
  onModeChange?: (mode: 'roam' | 'inspect') => void;
  onHotspotClick?: (h: Hotspot | null) => void;
  onTourNode?: (nodeIndex: number) => void;
  onTourAutoPause?: () => void;
  onTourEnd?: () => void;
}

const WALK_SPEED = 3.2;
const PLAYER_RADIUS = 0.35;
const EYE_HEIGHT = 1.6;

export class MuseumViewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private spots: THREE.SpotLight[] = [];
  private envRT: THREE.Texture;
  private pos: XZ;
  private yaw: number; private pitch = 0;
  private yawTarget: number; private pitchTarget = 0;
  private keys = new Set<string>();
  private externalMove = { forward: 0, strafe: 0 };
  private colliders: ReturnType<typeof collidersFromGeometry>;
  private exhibitGroups: THREE.Group[] = [];
  private raycaster = new THREE.Raycaster();
  private drag: { x: number; y: number; moved: number } | null = null;
  private raf = 0;
  private last = performance.now();
  private frames = 0;
  private fpsClock = 0;
  private opts: ViewerOptions;
  private disposed = false;
  private selected: THREE.Group | null = null;
  private selectedSpin = 0;
  private ring: THREE.Mesh;
  private textures: THREE.Texture[] = [];
  private modeInner: 'roam' | 'inspect' = 'roam';
  private orbit: OrbitState | null = null;
  private orbitGoal: OrbitState | null = null;
  private orbitFly: { from: OrbitState; goal: OrbitState; t: number; dur: number } | null = null;
  private inspectLight: THREE.DirectionalLight;
  private savedRoam: { pos: XZ; yaw: number; pitch: number } | null = null;
  private savedLights: { hemi: number; sun: number; env: number } | null = null;
  private fillAzim = 0.7;
  private activePointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private hotspotTex: THREE.Texture | null = null;
  private errorBadgeTex: THREE.Texture | null = null;
  private lampMat: THREE.Material | null = null;
  private frameMat: THREE.Material | null = null;
  private hotspotSprites: THREE.Sprite[] = [];
  private tour: { route: TourRoute; state: TourState; paused: boolean; speaking: boolean } | null = null;
  private tourPausedByInspect = false;

  constructor(opts: ViewerOptions) {
    this.opts = opts;
    const { canvas, layout } = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(0x0b0c0f);
    this.scene.fog = new THREE.Fog(0x0b0c0f, 16, 46);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envRT;
    this.scene.environmentIntensity = 0.35;
    this.camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.05, 100);
    this.camera.rotation.order = 'YXZ';

    this.hemi = new THREE.HemisphereLight(0x7d8ea6, 0x241f19, 0.45);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2dc, 1.4);
    this.sun.position.set(6, 9, 4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.sun);
    this.inspectLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    this.inspectLight.visible = false;
    this.scene.add(this.inspectLight);

    const floorTex = makeFloorTexture();
    floorTex.repeat.set(6, 4);
    this.textures.push(floorTex);
    const wallTex = makeWallTexture();
    wallTex.repeat.set(3, 1.5);
    this.textures.push(wallTex);
    const woodTex = makeWoodTexture();
    this.textures.push(woodTex);
    const carpetTex = makeCarpetTexture();
    carpetTex.repeat.set(1, 3);
    this.textures.push(carpetTex);
    const materials: Record<BoxDef['kind'], THREE.Material> = {
      floor: new THREE.MeshStandardMaterial({ map: floorTex, color: 0xffffff, roughness: 0.22, metalness: 0.08 }),
      wall: new THREE.MeshStandardMaterial({ map: wallTex, color: 0xffffff, roughness: 0.95 }),
      'zone-plate': new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 }),
      'case-body': new THREE.MeshStandardMaterial({ color: 0x232019, roughness: 0.5, metalness: 0.25 }),
      'case-glass': new THREE.MeshPhysicalMaterial({
        color: 0xc6dae4, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.08,
        envMapIntensity: 1.4, depthWrite: false
      }),
      ceiling: new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.95 }),
      baseboard: new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 0.55, metalness: 0.15 }),
      'light-strip': new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff3d6, emissiveIntensity: 2.4 }),
      wainscot: new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.5, metalness: 0.05 }),
      carpet: new THREE.MeshStandardMaterial({ map: carpetTex, color: 0xffffff, roughness: 1 })
    };

    for (const def of [...buildHallGeometry(layout), ...this.extras(layout)]) {
      let mat: THREE.Material;
      if (def.kind === 'zone-plate') {
        const tint = new THREE.Color(def.color ?? '#444').multiplyScalar(0.7);
        mat = new THREE.MeshStandardMaterial({ map: floorTex, color: tint, roughness: 0.9 });
      } else if (def.color && def.kind !== 'case-glass') {
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(def.color),
          roughness: def.kind === 'case-body' ? 0.5 : 0.9,
          metalness: def.kind === 'case-body' ? 0.25 : 0
        });
      } else {
        mat = materials[def.kind];
      }
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...def.size), mat);
      mesh.position.set(...def.position);
      mesh.rotation.y = (def.rotationY * Math.PI) / 180;
      mesh.receiveShadow = true;
      if (def.kind === 'case-glass') mesh.renderOrder = 1;
      this.scene.add(mesh);
    }

    for (const m of muralDefs(layout)) {
      const tex = makeMuralTexture(m.scene, m.title);
      this.textures.push(tex);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(m.size[0], m.size[1]),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })
      );
      mesh.position.set(...m.position);
      this.scene.add(mesh);
    }

    // 讲解图文展板 + 文物挂画（含画框与射灯槽）
    this.lampMat = new THREE.MeshStandardMaterial({ color: 0x2c231a, emissive: 0xffe6b0, emissiveIntensity: 1.8 });
    this.frameMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.45, metalness: 0.08 });
    for (const p of panelDefs(layout)) {
      const tex = makePanelTexture(PANEL_SPECS[p.panel]);
      this.textures.push(tex);
      this.addWallMounted(p.position, p.rotationY, p.size, tex);
    }
    for (const a of wallArtDefs(layout)) {
      const tex = makeWallArtTexture(a.art, a.caption);
      this.textures.push(tex);
      this.addWallMounted(a.position, a.rotationY, a.size, tex);
    }

    for (const s of spotDefs(layout)) {
      const spot = new THREE.SpotLight(0xffe3b3, 55, 11, 0.5, 0.55, 1.7);
      spot.position.set(...s.position);
      spot.target.position.set(...s.target);
      this.scene.add(spot, spot.target);
      this.spots.push(spot);
    }

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.02, 8, 48).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xd9b45a, transparent: true, opacity: 0.85, toneMapped: false })
    );
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.colliders = collidersFromGeometry(buildHallGeometry(layout), layout);
    this.pos = { x: layout.spawn.position[0], z: layout.spawn.position[2] };
    this.yaw = this.yawTarget = layout.spawn.yaw;

    for (const p of opts.placements) void this.addExhibit(p);
    this.bindInput(canvas);
    this.setTier('medium');
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__viewer = this;
    this.loop();
  }

  private extras(layout: HallLayout): BoxDef[] {
    const { width: w, depth: d } = layout.floor;
    const half = { x: w / 2, z: d / 2 };
    const defs: BoxDef[] = [
      { kind: 'ceiling', position: [0, 4.98, 0], size: [w + 0.4, 0.2, d + 0.4], rotationY: 0 }
    ];
    for (const [sx, sz, len, horiz] of [
      [0, -half.z + 0.06, w, true], [0, half.z - 0.06, w, true],
      [-half.x + 0.06, 0, d, false], [half.x - 0.06, 0, d, false]
    ] as [number, number, number, boolean][]) {
      defs.push({
        kind: 'baseboard',
        position: [sx, 0.18, sz],
        size: horiz ? [len, 0.36, 0.08] : [0.08, 0.36, len],
        rotationY: 0
      });
    }
    for (const x of [-8, 0, 8]) {
      defs.push({ kind: 'light-strip', position: [x, 4.85, 0], size: [0.16, 0.04, d - 3], rotationY: 0 });
    }
    return defs;
  }

  private async addExhibit(p: Placement) {
    if (this.disposed) return;
    const exhibit = this.opts.exhibits?.get(p.exhibitRef)
      ?? await fetchJson<Exhibit>(`/content/exhibits/${p.exhibitRef}.json`);
    if (!exhibit || this.disposed) return;
    const model = await loadExhibitModel(exhibit, this.opts.availableModels);
    if (this.disposed) return;
    model.userData.placementId = p.id;
    model.userData.exhibit = exhibit;
    model.userData.baseQuat = new THREE.Quaternion().fromArray(p.rotation);
    model.quaternion.copy(model.userData.baseQuat);
    model.position.set(...p.position);
    model.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.userData.placementId = p.id; } });
    if (model.userData.noContent) this.addErrorBadge(model, p, exhibit);
    this.scene.add(model);
    this.exhibitGroups.push(model);

    const hotspots = exhibit.hotspots ?? [];
    if (hotspots.length > 0) {
      if (!this.hotspotTex) {
        this.hotspotTex = makeHotspotTexture();
        this.textures.push(this.hotspotTex);
      }
      for (const h of hotspots) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this.hotspotTex, depthTest: false, transparent: true
        }));
        sp.position.set(...h.position);
        sp.scale.setScalar(0.09);
        sp.visible = false;
        sp.userData.hotspot = h;
        sp.userData.placementId = p.id;
        model.add(sp);
        this.hotspotSprites.push(sp);
      }
    }

    const c = p.caseRef ? this.opts.layout.cases.find(x => x.id === p.caseRef) : undefined;
    if (c) {
      const t = plateTransform(c);
      const tex = makePlateTexture(exhibit.name, exhibit.dynasty);
      this.textures.push(tex);
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(PLATE_SIZE[0], PLATE_SIZE[1]),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
      );
      plate.position.set(...t.position);
      plate.rotation.order = 'YXZ';
      plate.rotation.y = t.rotationY;
      plate.rotation.x = -PLATE_TILT;
      this.scene.add(plate);
    }
  }

  /** 墙面悬挂物（展板/挂画）：木框 + 画芯 + 顶部射灯槽。position 为墙体内表面上的挂点 */
  private addWallMounted(position: [number, number, number], rotationY: number, size: [number, number], tex: THREE.Texture) {
    const g = new THREE.Group();
    g.position.set(...position);
    g.rotation.y = rotationY;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(size[0] + 0.14, size[1] + 0.14, 0.06),
      this.frameMat!
    );
    frame.position.set(0, 0, 0.10);
    frame.castShadow = false;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })
    );
    face.position.set(0, 0, 0.135);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(size[0] * 0.5, 0.045, 0.1),
      this.lampMat!
    );
    lamp.position.set(0, size[1] / 2 + 0.16, 0.14);
    lamp.rotation.x = 0.45;
    g.add(frame, face, lamp);
    this.scene.add(g);
  }

  get mode(): 'roam' | 'inspect' { return this.modeInner; }

  /** 展品既无 glb 也无程序化占位：空底座 + 红色错误角标（规格 §8），并在控制台汇总 */
  private addErrorBadge(model: THREE.Group, p: Placement, exhibit: Exhibit) {
    if (!this.errorBadgeTex) {
      this.errorBadgeTex = makeErrorBadgeTexture();
      this.textures.push(this.errorBadgeTex);
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.errorBadgeTex, depthTest: false, transparent: true
    }));
    sp.position.set(0, 1.3, 0);
    sp.scale.setScalar(0.14);
    sp.userData.placementId = p.id;
    model.add(sp);
    console.warn(`[museum] exhibit "${exhibit.id}": no model file (${exhibit.model}) and no procedural placeholder`);
  }

  enterInspect(placementId: string) {
    const g = this.exhibitGroups.find(x => x.userData.placementId === placementId);
    if (!g || this.modeInner === 'inspect') return;
    if (this.tour && !this.tour.paused) { this.pauseTour(); this.tourPausedByInspect = true; }
    this.savedRoam = { pos: { ...this.pos }, yaw: this.yawTarget, pitch: this.pitchTarget };
    const center = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
    const target: [number, number, number] = [center.x, center.y, center.z];
    this.orbit = orbitFromCamera([this.pos.x, EYE_HEIGHT, this.pos.z], target);
    this.orbitGoal = viewpoint('full', this.orbit);
    this.orbitFly = { from: this.orbit, goal: this.orbitGoal, t: 0, dur: 0.8 };
    this.savedLights = {
      hemi: this.hemi.intensity, sun: this.sun.intensity,
      env: this.scene.environmentIntensity
    };
    this.hemi.intensity *= 0.35;
    this.sun.intensity *= 0.25;
    this.scene.environmentIntensity = 0.12;
    this.inspectLight.visible = true;
    for (const sp of this.hotspotSprites) sp.visible = sp.userData.placementId === placementId;
    this.setSelected(placementId);
    this.modeInner = 'inspect';
    this.opts.onModeChange?.('inspect');
  }

  exitInspect() {
    if (this.modeInner !== 'inspect') return;
    if (this.savedRoam) {
      this.pos = this.savedRoam.pos;
      this.yawTarget = this.savedRoam.yaw; this.pitchTarget = this.savedRoam.pitch;
      this.savedRoam = null;
    }
    if (this.savedLights) {
      this.hemi.intensity = this.savedLights.hemi;
      this.sun.intensity = this.savedLights.sun;
      this.scene.environmentIntensity = this.savedLights.env;
      this.savedLights = null;
    }
    this.inspectLight.visible = false;
    for (const sp of this.hotspotSprites) sp.visible = false;
    this.opts.onHotspotClick?.(null);
    this.orbit = this.orbitGoal = null;
    this.orbitFly = null;
    this.setSelected(null);
    this.modeInner = 'roam';
    this.opts.onModeChange?.('roam');
    if (this.tourPausedByInspect) { this.resumeTour(); this.tourPausedByInspect = false; }
  }

  setInspectView(name: ViewpointName) {
    if (this.modeInner !== 'inspect' || !this.orbit) return;
    const goal = viewpoint(name, this.orbit);
    this.orbitFly = { from: this.orbit, goal, t: 0, dur: 0.6 };
    this.orbitGoal = goal;
  }

  setFillLight(azimRad: number, intensity: number) {
    this.fillAzim = azimRad;
    this.inspectLight.intensity = intensity;
  }

  get tourActive(): boolean { return this.tour !== null; }
  get tourPaused(): boolean { return this.tour?.paused ?? false; }

  startTour(route: TourRoute) {
    if (this.modeInner === 'inspect') this.exitInspect();
    this.tour = { route, state: createTourState(0), paused: false, speaking: false };
    this.pos = { x: route.nodes[0].walkTo[0], z: route.nodes[0].walkTo[1] };
    this.pitchTarget = 0;
    this.setSelected(null);
  }

  stopTour() {
    this.tour = null;
    this.tourPausedByInspect = false;
  }

  pauseTour() { if (this.tour) this.tour.paused = true; }
  resumeTour() { if (this.tour) this.tour.paused = false; }

  tourJump(nodeIndex: number) {
    if (!this.tour) return;
    const n = Math.min(Math.max(nodeIndex, 0), this.tour.route.nodes.length - 1);
    this.tour.state = { ...createTourState(n), phase: 'face', faceT: 0 };
    this.tour.speaking = false;
    this.tour.paused = false;
    this.pos = { x: this.tour.route.nodes[n].walkTo[0], z: this.tour.route.nodes[n].walkTo[1] };
    this.pitchTarget = 0;
  }

  tourNarrationDone() { if (this.tour) this.tour.speaking = false; }

  private autoPauseTour() {
    if (this.tour && !this.tour.paused && this.modeInner === 'roam') {
      this.tour.paused = true;
      this.opts.onTourAutoPause?.();
    }
  }

  setSelected(placementId: string | null) {
    this.selected = placementId ? this.exhibitGroups.find(g => g.userData.placementId === placementId) ?? null : null;
    this.selectedSpin = 0;
    if (this.selected) {
      this.ring.position.set(this.selected.position.x, this.selected.position.y + 0.03, this.selected.position.z);
      this.ring.visible = true;
    } else {
      this.ring.visible = false;
    }
  }

  private onWheel = (e: WheelEvent) => {
    if (this.modeInner !== 'inspect' || !this.orbitGoal) return;
    e.preventDefault();
    this.orbitGoal = clampOrbit({
      ...this.orbitGoal, radius: this.orbitGoal.radius * Math.exp(e.deltaY * 0.001)
    });
  };

  private static readonly TOUR_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

  private bindInput(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  // 事件处理器一律用实例字段保存：匿名函数无法解绑，dispose 后会留下悬挂监听
  private onPointerDown = (e: PointerEvent) => {
    this.autoPauseTour();
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.drag = { x: e.clientX, y: e.clientY, moved: 0 };
    this.pinchDist = 0;
  };

  private onPointerMove = (e: PointerEvent) => {
    const tracked = this.activePointers.get(e.pointerId);
    if (tracked) { tracked.x = e.clientX; tracked.y = e.clientY; }
    if (!this.drag) return;
    const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
    this.drag.x = e.clientX; this.drag.y = e.clientY;
    this.drag.moved += Math.abs(dx) + Math.abs(dy);
    if (this.modeInner === 'inspect' && this.orbitGoal) {
      if (this.activePointers.size >= 2) {
        const [a, b] = [...this.activePointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDist > 0 && dist > 0) {
          this.orbitGoal = clampOrbit({ ...this.orbitGoal, radius: this.orbitGoal.radius * (this.pinchDist / dist) });
        }
        this.pinchDist = dist;
      } else {
        this.orbitGoal = clampOrbit({
          ...this.orbitGoal,
          azim: this.orbitGoal.azim - dx * 0.005,
          polar: this.orbitGoal.polar - dy * 0.005
        });
      }
      return;
    }
    this.yawTarget -= dx * 0.0032;
    this.pitchTarget = Math.min(1.3, Math.max(-1.3, this.pitchTarget - dy * 0.0032));
  };

  private onPointerUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    this.pinchDist = 0;
    if (this.drag && this.drag.moved < 6) this.pick(e.clientX, e.clientY);
    this.drag = null;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (MuseumViewer.TOUR_KEYS.has(e.code)) this.autoPauseTour();
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

  private onResize = () => {
    const { clientWidth: w, clientHeight: h } = this.opts.canvas;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private pick(cx: number, cy: number) {
    const rect = this.opts.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((cx - rect.left) / rect.width) * 2 - 1,
      -((cy - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    if (this.modeInner === 'inspect') {
      const visible = this.hotspotSprites.filter(s => s.visible);
      const hit = this.raycaster.intersectObjects(visible, false)[0];
      if (!hit || !this.orbit || !this.orbitGoal) return;
      const h = hit.object.userData.hotspot as Hotspot;
      const world = hit.object.getWorldPosition(new THREE.Vector3());
      this.orbitGoal = clampOrbit({
        ...this.orbitGoal,
        target: [world.x, world.y, world.z], radius: 0.35
      });
      this.orbitFly = { from: this.orbit, goal: this.orbitGoal, t: 0, dur: 0.6 };
      this.opts.onHotspotClick?.(h);
      return;
    }
    const hits = this.raycaster.intersectObjects(this.exhibitGroups, true).filter(h => h.object.visible);
    const first = hits.find(h => (h.object as THREE.Mesh).userData.placementId ?? (h.object.parent as THREE.Object3D)?.userData?.placementId);
    const id = first ? (first.object.userData.placementId ?? first.object.parent?.userData?.placementId) : null;
    this.opts.onExhibitClick(id ?? null);
  }

  setExternalMove(v: { forward: number; strafe: number }) {
    this.externalMove = v;
  }

  setTier(tier: Tier) {
    const s = TIER_SETTINGS[tier];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, s.dprCap));
    this.sun.castShadow = s.shadows;
    for (const spot of this.spots) spot.intensity = tier === 'low' ? 35 : 55;
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;

    if (this.modeInner === 'inspect' && this.orbit && this.orbitGoal) {
      if (this.orbitFly) {
        const f = this.orbitFly;
        f.t += dt / f.dur;
        if (f.t >= 1) { this.orbit = { ...f.goal }; this.orbitGoal = { ...f.goal }; this.orbitFly = null; }
        else this.orbit = orbitLerp(f.from, f.goal, f.t);
      } else {
        const o = this.orbit, g = this.orbitGoal;
        this.orbit = clampOrbit({
          target: g.target,
          radius: damp(o.radius, g.radius, 10, dt),
          azim: damp(o.azim, g.azim, 12, dt),
          polar: damp(o.polar, g.polar, 12, dt)
        });
      }
      const p = orbitPosition(this.orbit);
      this.camera.position.set(...p);
      this.camera.lookAt(this.orbit.target[0], this.orbit.target[1], this.orbit.target[2]);
      const lp = orbitPosition({ ...this.orbit, azim: this.orbit.azim + this.fillAzim, polar: 1.0 });
      this.inspectLight.position.set(lp[0], lp[1] + 0.5, lp[2]);
    } else {
      if (this.tour && !this.tour.paused) {
        const t = this.tour;
        const out = tourAdvance(t.state, t.route, t.speaking, dt);
        t.state = out.next;
        this.pos = out.pos;
        this.pitchTarget = 0;
        if (out.next.phase === 'walk') {
          const ahead = sampleSegment(t.route, Math.max(out.next.node - 1, 0), Math.min(out.next.segT + 0.05, 1));
          this.yawTarget = yawTowards(this.pos, ahead);
        } else {
          const node = t.route.nodes[Math.min(out.next.node, t.route.nodes.length - 1)];
          this.yawTarget = yawTowards(this.pos, { x: node.lookAt[0], z: node.lookAt[1] });
        }
        if (out.events.includes('arrived')) { t.speaking = true; this.opts.onTourNode?.(out.next.node); }
        if (out.events.includes('finished')) { this.tour = null; this.opts.onTourEnd?.(); }
      } else {
        const f = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
        const s = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
        const input = {
          forward: Math.max(Math.abs(f), Math.abs(this.externalMove.forward)) ? Math.sign(f || this.externalMove.forward) * Math.max(Math.abs(f), Math.abs(this.externalMove.forward)) : 0,
          strafe: Math.max(Math.abs(s), Math.abs(this.externalMove.strafe)) ? Math.sign(s || this.externalMove.strafe) * Math.max(Math.abs(s), Math.abs(this.externalMove.strafe)) : 0
        };
        const step = computeDisplacement(input, this.yaw, WALK_SPEED, dt);
        this.pos = resolveSlide(this.pos, { x: this.pos.x + step.x, z: this.pos.z + step.z }, PLAYER_RADIUS, this.colliders);
      }

      this.yaw = damp(this.yaw, this.yawTarget, 14, dt);
      this.pitch = damp(this.pitch, this.pitchTarget, 14, dt);
      this.camera.position.set(this.pos.x, EYE_HEIGHT, this.pos.z);
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;

      if (this.selected) {
        this.selectedSpin += dt * 0.4;
        const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.selectedSpin);
        this.selected.quaternion.copy(this.selected.userData.baseQuat as THREE.Quaternion).multiply(spin);
      }
    }
    this.renderer.render(this.scene, this.camera);

    this.frames++; this.fpsClock += dt;
    if (this.fpsClock >= 0.5) { this.opts.onFps(Math.round(this.frames / this.fpsClock)); this.frames = 0; this.fpsClock = 0; }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.opts.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    this.opts.canvas.removeEventListener('wheel', this.onWheel);
    this.activePointers.clear();
    this.keys.clear();
    for (const t of this.textures) t.dispose();
    this.envRT.dispose();
    this.scene.traverse(o => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material as THREE.Material | THREE.Material[];
        (Array.isArray(m) ? m : [m]).forEach(x => x.dispose());
      }
    });
    this.renderer.dispose();
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch { return null; }
}
