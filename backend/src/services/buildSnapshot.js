import { z } from "zod";
const number = z.number().finite().min(-1e10).max(1e10).nullable();
const label = z.string().max(240);
const image = z
  .string()
  .url()
  .refine((s) => s.startsWith("https://"))
  .nullable()
  .optional();
const stat = z.object({
  key: z.string().max(80).optional(),
  label,
  value: number,
  percent: z.boolean(),
});
// This is displayed as public content, so reject objects where the UI expects text.
export const snapshotSchema = z.object({
  key: label.optional(),
  nativeId: z.string().max(30).optional(),
  skillDepotId: z.number().int().optional(),
  characterId: z.string().uuid().nullable().optional(),
  name: label,
  element: label.optional(),
  image,
  artwork: image,
  level: number.optional(),
  ascension: number.optional(),
  constellation: number.optional(),
  friendship: number.optional(),
  stats: z.record(stat).refine((v) => Object.keys(v).length <= 30),
  talents: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]),
        baseLevel: number,
        bonus: z.number().finite(),
        image,
      }),
    )
    .max(10)
    .optional(),
  weapon: z
    .object({
      itemId: z.number().int(),
      name: label,
      image,
      rarity: z.number().int().optional(),
      level: number,
      refinement: number,
      stats: z.array(stat).max(8),
    })
    .nullable()
    .optional(),
  artifacts: z
    .array(
      z.object({
        itemId: z.number().int(),
        name: label,
        setName: label,
        rarity: z.number().int().optional(),
        slot: label.optional(),
        level: number,
        image,
        mainStat: stat,
        substats: z.array(stat).max(8),
      }),
    )
    .max(5)
    .optional(),
});
