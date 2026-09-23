import { z } from 'zod';

export const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3>;
export const Quat = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export type Quat = z.infer<typeof Quat>;
export const LocalizedText = z.object({ zh: z.string().min(1), en: z.string().min(1) });
const idPattern = /^[a-z0-9][a-z0-9-]*$/;
const Id = z.string().regex(idPattern);

export const HotspotSchema = z.object({
  position: Vec3,
  normal: Vec3.optional(),
  title: LocalizedText,
  body: LocalizedText
});
export type Hotspot = z.infer<typeof HotspotSchema>;

export const ProceduralKind = z.enum(['ding', 'bell', 'hu', 'gui', 'meiping', 'bowl', 'incense', 'bi']);
export type ArtifactKind = z.infer<typeof ProceduralKind>;

export const ExhibitSchema = z.object({
  id: Id,
  name: LocalizedText,
  dynasty: LocalizedText,
  material: LocalizedText,
  summary: LocalizedText,
  model: z.string().regex(/^models\/[A-Za-z0-9._/-]+\.glb$/),
  procedural: ProceduralKind.optional(),
  audio: z.object({ zh: z.string().optional(), en: z.string().optional() }).optional(),
  hotspots: z.array(HotspotSchema).default([])
});
export type Exhibit = z.infer<typeof ExhibitSchema>;

export const ZoneSchema = z.object({
  id: Id,
  name: LocalizedText,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  bounds: z.object({ x: z.tuple([z.number(), z.number()]), z: z.tuple([z.number(), z.number()]) })
});
export type Zone = z.infer<typeof ZoneSchema>;

export const DisplayCaseSchema = z.object({
  id: Id,
  type: z.enum(['freestanding', 'wall', 'platform']),
  position: Vec3,
  rotationY: z.number().default(0),
  size: Vec3
});
export type DisplayCase = z.infer<typeof DisplayCaseSchema>;

export const PlacementSchema = z.object({
  id: Id,
  exhibitRef: Id,
  position: Vec3,
  rotation: Quat,
  zone: Id,
  caseRef: Id.optional()
});
export type Placement = z.infer<typeof PlacementSchema>;

export const HallLayoutSchema = z.object({
  id: Id,
  name: LocalizedText,
  floor: z.object({ width: z.number().positive(), depth: z.number().positive(), height: z.number().positive().default(5) }),
  zones: z.array(ZoneSchema),
  cases: z.array(DisplayCaseSchema),
  exhibits: z.array(PlacementSchema),
  spawn: z.object({ position: Vec3, yaw: z.number() })
});
export type HallLayout = z.infer<typeof HallLayoutSchema>;

export const TourNodeSchema = z.object({
  exhibitId: Id,
  walkTo: z.tuple([z.number(), z.number()]),
  lookAt: z.tuple([z.number(), z.number()]),
  triggerRadius: z.number().positive().default(2.5),
  audio: z.object({ zh: z.string().optional(), en: z.string().optional() }).default({}),
  subtitle: LocalizedText
});
export type TourNode = z.infer<typeof TourNodeSchema>;

export const RouteSchema = z.object({
  id: Id,
  title: LocalizedText,
  nodes: z.array(TourNodeSchema).min(2)
});
export type TourRoute = z.infer<typeof RouteSchema>;
