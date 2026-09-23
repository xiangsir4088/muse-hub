import * as THREE from 'three';
import type { ArtifactKind } from '@museum/shared';

const bronze = () => new THREE.MeshStandardMaterial({
  color: 0x5c6b52, roughness: 0.38, metalness: 0.95, envMapIntensity: 1.2
});
const porcelain = () => new THREE.MeshPhysicalMaterial({
  color: 0xe4eae4, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.9
});
const jade = () => new THREE.MeshPhysicalMaterial({
  color: 0x9fb8ac, roughness: 0.22, metalness: 0, transmission: 0.3, thickness: 0.2, ior: 1.55, envMapIntensity: 1
});

function lathe(profile: [number, number][], mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24), mat);
}

function flatTorus(r: number, tube: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24).rotateX(Math.PI / 2), mat);
}

function body(kind: ArtifactKind): THREE.Object3D[] {
  switch (kind) {
    case 'meiping': return [lathe([[0, 0], [.32, 0], [.46, .22], [.5, .55], [.38, .95], [.18, 1.18], [.16, 1.3], [.2, 1.36], [0, 1.36]], porcelain())];
    case 'bowl': return [lathe([[0, 0], [.16, 0], [.4, .14], [.55, .34], [.56, .38], [.52, .36], [0, .3]], porcelain())];
    case 'hu': return [lathe([[0, 0], [.3, 0], [.5, .25], [.55, .6], [.35, .95], [.22, 1.15], [.28, 1.3], [.24, 1.36], [0, 1.36]], bronze())];
    case 'gui': return [
      lathe([[0, 0], [.42, 0], [.5, .15], [.5, .55], [.42, .7], [0, .7]], bronze()),
      lathe([[0, 0], [.46, .02], [.46, .1], [0, .12]], bronze()).translateY(.72),
      flatTorus(.5, .06, bronze()).translateY(.4)
    ];
    case 'bell': return [
      lathe([[0, 0], [.45, 0], [.42, .1], [.3, .8], [.2, 1.05], [.18, 1.1], [0, 1.1]], bronze()),
      new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), bronze()).translateY(1.14)
    ];
    case 'incense': return [
      lathe([[0, 0], [.4, 0], [.5, .12], [.45, .28], [.5, .32], [.42, .5], [.4, .52], [0, .52]], bronze()),
      ...[-1, 0, 1].map(i => new THREE.Mesh(
        new THREE.CylinderGeometry(.05, .05, .18, 8).rotateZ(i * .5), bronze()
      ).translateX(i * .28).translateY(.09))
    ];
    case 'bi': return [new THREE.Mesh(new THREE.TorusGeometry(.55, .14, 12, 32).rotateX(Math.PI / 2), jade()).translateY(.6)];
    case 'ding': return [
      lathe([[0, 0], [.5, 0], [.58, .2], [.58, .6], [.6, .68], [0, .68]], bronze()).translateY(.55),
      flatTorus(.58, .05, bronze()).translateY(1.23),
      ...[0, 1, 2].map(i => {
        const a = (i / 3) * Math.PI * 2;
        return new THREE.Mesh(new THREE.CylinderGeometry(.07, .05, .55, 8), bronze())
          .translateX(Math.sin(a) * .4).translateZ(Math.cos(a) * .4).translateY(.275);
      })
    ];
  }
}

export function createArtifact(kind: ArtifactKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `artifact:${kind}`;
  for (const child of body(kind)) group.add(child);
  return group;
}
